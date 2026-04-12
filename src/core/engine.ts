import {
    ActionPlan,
    DebugLogEntry,
    EvaluationResult,
    MatchResult,
    RegexGuardRule,
} from '../types/index.js';

const regexCache = new Map<string, RegExp>();

interface SelectionResult {
    selectedRule: RegexGuardRule | null;
    selectedMatch: MatchResult | null;
    reason: string;
}

function shouldTriggerByProbability(rule: RegexGuardRule): boolean {
    return Math.random() * 100 < rule.probability;
}

function createDebugEntry(
    eventType: DebugLogEntry['eventType'],
    index: number,
    data: Partial<DebugLogEntry> = {}
): DebugLogEntry {
    const timestamp = new Date().toISOString();

    return {
        id: `${eventType}-${index}-${timestamp}`,
        timestamp,
        eventType,
        ...data,
    };
}

function getRegexCacheKey(pattern: string, flags: string): string {
    return `${pattern}::${flags}`;
}

export function validateRegex(pattern: string, flags = ''): { valid: boolean; error?: string } {
    try {
        new RegExp(pattern, flags);
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export function compileRegex(pattern: string, flags = ''): RegExp {
    const cacheKey = getRegexCacheKey(pattern, flags);
    const cached = regexCache.get(cacheKey);

    if (cached) return cached;

    const validation = validateRegex(pattern, flags);
    if (!validation.valid) {
        throw new Error(validation.error ?? 'Invalid regular expression.');
    }

    const compiled = new RegExp(pattern, flags);
    regexCache.set(cacheKey, compiled);
    return compiled;
}

export function filterRules(
    rules: RegexGuardRule[],
    groupId: string,
    userId: string,
    isAdmin: boolean
): RegexGuardRule[] {
    return rules.filter((rule) => {
        if (!rule.enabled) return false;
        if (rule.targetGroupIds.length > 0 && !rule.targetGroupIds.includes(groupId)) return false;
        if (rule.extraWhitelistUserIds.includes(userId)) return false;
        if (isAdmin && rule.adminExempt) return false;
        return true;
    });
}

export function matchText(text: string, pattern: string, flags = ''): MatchResult | null {
    const validation = validateRegex(pattern, flags);
    if (!validation.valid) return null;

    const regex = compileRegex(pattern, flags);
    const match = regex.exec(text);

    if (!match) return null;

    return {
        matched: true,
        fullMatch: match[0],
        groups: match.slice(1),
        regexSource: pattern,
        regexFlags: flags,
    };
}

export function selectRule(
    rules: RegexGuardRule[],
    matchResults: Map<number, MatchResult>
): SelectionResult {
    const matchedRules = rules.filter((rule) => {
        const matchResult = matchResults.get(rule.id);
        return Boolean(matchResult?.matched);
    });

    if (!matchedRules.length) {
        return {
            selectedRule: null,
            selectedMatch: null,
            reason: 'No rules matched the message content.',
        };
    }

    const highestPriority = Math.max(...matchedRules.map((rule) => rule.priority));
    const highestPriorityRules = matchedRules.filter((rule) => rule.priority === highestPriority);
    const selectedRule =
        highestPriorityRules[Math.floor(Math.random() * highestPriorityRules.length)] ?? null;
    const selectedMatch = selectedRule ? (matchResults.get(selectedRule.id) ?? null) : null;

    if (!selectedRule || !selectedMatch) {
        return {
            selectedRule: null,
            selectedMatch: null,
            reason: 'Matched rules were found, but no selectable rule could be resolved.',
        };
    }

    if (!shouldTriggerByProbability(selectedRule)) {
        return {
            selectedRule: null,
            selectedMatch: null,
            reason: `Rule ${selectedRule.id} matched and won selection, but skipped by probability ${selectedRule.probability}%.`,
        };
    }

    if (highestPriorityRules.length === 1) {
        return {
            selectedRule,
            selectedMatch,
            reason: `Selected rule ${selectedRule.id} with highest priority ${selectedRule.priority}.`,
        };
    }

    return {
        selectedRule,
        selectedMatch,
        reason: `Selected rule ${selectedRule.id} from tied highest-priority rules: ${highestPriorityRules.map((rule) => rule.id).join(', ')}.`,
    };
}

export function renderPlaceholders(
    template: string,
    nickname: string,
    matchResult: MatchResult
): string {
    const replacements: Record<string, string> = {
        '{nickname}': nickname,
        '{match}': matchResult.fullMatch ?? '',
    };

    for (let index = 1; index <= 9; index += 1) {
        replacements[`{group${index}}`] = matchResult.groups[index - 1] ?? '';
    }

    return Object.entries(replacements).reduce((content, [placeholder, value]) => {
        return content.split(placeholder).join(value);
    }, template);
}

export function createActionPlan(rule: RegexGuardRule, matchResult: MatchResult): ActionPlan {
    const trimmedReplyTemplate = rule.replyTemplate.trim();
    const shouldReply = trimmedReplyTemplate.length > 0;

    return {
        shouldRecall: rule.recallEnabled,
        shouldReply,
        shouldMute: rule.muteDuration > 0,
        replyContent: shouldReply
            ? renderPlaceholders(trimmedReplyTemplate, '', matchResult)
            : undefined,
        muteDuration: rule.muteDuration,
    };
}

export function evaluateMessage(
    content: string,
    nickname: string,
    groupId: string,
    userId: string,
    isAdmin: boolean,
    rules: RegexGuardRule[]
): EvaluationResult {
    const debugEvents: DebugLogEntry[] = [];
    const applicableRules = filterRules(rules, groupId, userId, isAdmin);
    const matchResults = new Map<number, MatchResult>();

    for (const rule of applicableRules) {
        const validation = validateRegex(rule.pattern, rule.flags);

        if (!validation.valid) {
            debugEvents.push(
                createDebugEntry('match', debugEvents.length, {
                    ruleId: rule.id,
                    content,
                    userId,
                    guildId: groupId,
                    detail: {
                        valid: false,
                        error: validation.error,
                    },
                })
            );
            continue;
        }

        const matchResult = matchText(content, rule.pattern, rule.flags);
        if (matchResult) {
            matchResults.set(rule.id, matchResult);
        }

        debugEvents.push(
            createDebugEntry('match', debugEvents.length, {
                ruleId: rule.id,
                content,
                userId,
                guildId: groupId,
                matchedText: matchResult?.fullMatch,
                captures: matchResult?.groups,
                detail: {
                    valid: true,
                    matched: Boolean(matchResult),
                    regexSource: rule.pattern,
                    regexFlags: rule.flags,
                },
            })
        );
    }

    if (!applicableRules.length) {
        return {
            matched: false,
            debugEvents,
            reason: 'No applicable rules remained after enabled, group, whitelist, and admin filtering.',
        };
    }

    const selection = selectRule(applicableRules, matchResults);
    if (!selection.selectedRule || !selection.selectedMatch) {
        return {
            matched: false,
            debugEvents,
            reason: selection.reason,
        };
    }

    const highestPriority = selection.selectedRule.priority;
    const tiedRuleIds = applicableRules
        .filter((rule) => rule.priority === highestPriority && matchResults.has(rule.id))
        .map((rule) => rule.id);

    debugEvents.push(
        createDebugEntry('selection', debugEvents.length, {
            ruleId: selection.selectedRule.id,
            selectedRuleId: selection.selectedRule.id,
            content,
            userId,
            guildId: groupId,
            matchedText: selection.selectedMatch.fullMatch,
            captures: selection.selectedMatch.groups,
            detail: {
                reason: selection.reason,
                tiedRuleIds,
                chosenRuleId: selection.selectedRule.id,
                priority: highestPriority,
            },
        })
    );

    const actionPlan = createActionPlan(selection.selectedRule, selection.selectedMatch);

    if (actionPlan.shouldReply) {
        actionPlan.replyContent = renderPlaceholders(
            selection.selectedRule.replyTemplate.trim(),
            nickname,
            selection.selectedMatch
        );
    }

    return {
        matched: true,
        selectedRule: selection.selectedRule,
        matchResult: selection.selectedMatch,
        actionPlan,
        debugEvents,
        reason: selection.reason,
    };
}
