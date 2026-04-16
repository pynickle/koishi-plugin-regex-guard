import type { Context, Session } from 'koishi';

import type { Config } from '../../config/config';
import { localizeErrorMessage } from '../../locales';
import type { ImportErrorDetail, RegexGuardRule, RegexGuardRuleInput } from '../../types';
import { evaluateMessage } from '../engine';
import { requireAdmin } from './admin-guard';

const PAGE_SIZE = 10;

type UpdatableField = keyof RegexGuardRuleInput;

function commandText(session: Session, key: string, params: (string | number)[] = []): string {
    return session.text(`commands.rguard.messages.${key}`, params);
}

function formatBoolean(session: Session, value: boolean): string {
    return commandText(session, value ? 'booleanTrue' : 'booleanFalse');
}

function formatEnabled(session: Session, value: boolean): string {
    return commandText(session, value ? 'enabledLabel' : 'disabledLabel');
}

function formatList(values: string[], emptyValue: string): string {
    return values.length ? values.join(', ') : emptyValue;
}

function formatTimestamp(value: Date | string): string {
    const normalized = value instanceof Date ? value : new Date(value);
    return Number.isNaN(normalized.getTime()) ? String(value) : normalized.toISOString();
}

function formatRuleListItem(session: Session, rule: RegexGuardRule): string {
    return commandText(session, 'ruleListItem', [
        rule.id,
        formatEnabled(session, rule.enabled),
        rule.priority,
        rule.probability,
        rule.pattern,
        rule.flags,
    ]);
}

function formatRuleDetail(session: Session, rule: RegexGuardRule): string {
    const emptyValue = commandText(session, 'emptyValue');
    const replyTemplate = rule.replyTemplate.trim() || emptyValue;

    return commandText(session, 'ruleDetail', [
        rule.id,
        rule.pattern,
        rule.flags,
        formatEnabled(session, rule.enabled),
        rule.priority,
        rule.probability,
        formatList(rule.targetGroupIds, emptyValue),
        formatList(rule.extraWhitelistUserIds, emptyValue),
        formatBoolean(session, rule.adminExempt),
        formatBoolean(session, rule.recallEnabled),
        replyTemplate,
        rule.muteDuration,
        formatTimestamp(rule.createdAt),
        formatTimestamp(rule.updatedAt),
        JSON.stringify(rule.metadata),
    ]);
}

function parseInteger(value: string, fieldName: string): number {
    const normalized = Number(value);
    if (!Number.isInteger(normalized)) {
        throw new Error(`Invalid integer for ${fieldName}.`);
    }

    return normalized;
}

function parseNumber(value: string, fieldName: string): number {
    const normalized = Number(value);
    if (Number.isNaN(normalized)) {
        throw new Error(`Invalid number for ${fieldName}.`);
    }

    return normalized;
}

function parseBoolean(value: string, fieldName: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    throw new Error(`Invalid boolean for ${fieldName}.`);
}

function parseStringArray(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
            throw new Error('Array JSON is required.');
        }

        return parsed.map((entry) => String(entry));
    }

    return trimmed
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function parseMetadata(value: string): Record<string, unknown> {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed == null || Array.isArray(parsed)) {
        throw new Error('Object JSON is required.');
    }

    return parsed as Record<string, unknown>;
}

function parseUpdateField(field: string, value: string): Partial<RegexGuardRuleInput> {
    const normalizedField = field.trim() as UpdatableField;

    switch (normalizedField) {
        case 'enabled':
            return { enabled: parseBoolean(value, normalizedField) };
        case 'priority':
            return { priority: parseInteger(value, normalizedField) };
        case 'probability':
            return { probability: parseNumber(value, normalizedField) };
        case 'pattern':
            return { pattern: value };
        case 'flags':
            return { flags: value };
        case 'targetGroupIds':
            return { targetGroupIds: parseStringArray(value) };
        case 'extraWhitelistUserIds':
            return { extraWhitelistUserIds: parseStringArray(value) };
        case 'adminExempt':
            return { adminExempt: parseBoolean(value, normalizedField) };
        case 'recallEnabled':
            return { recallEnabled: parseBoolean(value, normalizedField) };
        case 'replyTemplate':
            return { replyTemplate: value };
        case 'muteDuration':
            return { muteDuration: parseInteger(value, normalizedField) };
        case 'metadata':
            return { metadata: parseMetadata(value) };
        default:
            throw new Error(`Unsupported field: ${field}`);
    }
}

function mapCommandError(session: Session, error: unknown, fallbackId?: number): string {
    const message = localizeErrorMessage(error);

    if (
        typeof fallbackId === 'number' &&
        message === commandText(session, 'ruleNotFound', [fallbackId])
    ) {
        return commandText(session, 'ruleNotFound', [fallbackId]);
    }

    return commandText(session, 'error', [message]);
}

function formatImportErrors(session: Session, errors: ImportErrorDetail[]): string {
    return errors
        .map((error) =>
            commandText(session, 'importErrorItem', [
                error.index + 1,
                localizeErrorMessage(error.error),
            ])
        )
        .join('\n');
}

export function registerCommands(ctx: Context, cfg: Config) {
    ctx.command('rguard').alias('regex-guard');

    ctx.command('rguard.add <pattern:text> [flags:string]').action(
        async ({ session }, pattern, flags = '') => {
            if (!requireAdmin(session, cfg)) {
                return commandText(session, 'notAdmin');
            }

            try {
                const rule = await ctx.ruleService.createRule(ctx, {
                    pattern,
                    flags,
                    targetGroupIds: [],
                    extraWhitelistUserIds: [],
                });
                return commandText(session, 'ruleCreated', [rule.id]);
            } catch (error) {
                return mapCommandError(session, error);
            }
        }
    );

    ctx.command('rguard.list [page:number]').action(async ({ session }, page = 1) => {
        if (!requireAdmin(session, cfg)) {
            return commandText(session, 'notAdmin');
        }

        if (!Number.isInteger(page) || page < 1) {
            return commandText(session, 'invalidPage', [page]);
        }

        try {
            const rules = await ctx.ruleService.listRules(ctx);
            if (!rules.length) {
                return commandText(session, 'ruleListEmpty');
            }

            const totalPages = Math.ceil(rules.length / PAGE_SIZE);
            if (page > totalPages) {
                return commandText(session, 'pageOutOfRange', [page, totalPages]);
            }

            const startIndex = (page - 1) * PAGE_SIZE;
            const pageRules = rules.slice(startIndex, startIndex + PAGE_SIZE);
            return commandText(session, 'ruleList', [
                page,
                totalPages,
                rules.length,
                pageRules.map((rule) => formatRuleListItem(session, rule)).join('\n'),
            ]);
        } catch (error) {
            return mapCommandError(session, error);
        }
    });

    ctx.command('rguard.get <id:number>').action(async ({ session }, id) => {
        if (!requireAdmin(session, cfg)) {
            return commandText(session, 'notAdmin');
        }

        try {
            const rule = await ctx.ruleService.getRule(ctx, id);
            if (!rule) {
                return commandText(session, 'ruleNotFound', [id]);
            }

            return formatRuleDetail(session, rule);
        } catch (error) {
            return mapCommandError(session, error, id);
        }
    });

    ctx.command('rguard.update <id:number> <field:string> <value:text>').action(
        async ({ session }, id, field, value) => {
            if (!requireAdmin(session, cfg)) {
                return commandText(session, 'notAdmin');
            }

            try {
                const update = parseUpdateField(field, value);
                await ctx.ruleService.updateRule(ctx, id, update);
                return commandText(session, 'ruleUpdated', [id]);
            } catch (error) {
                return mapCommandError(session, error, id);
            }
        }
    );

    ctx.command('rguard.delete <id:number>').action(async ({ session }, id) => {
        if (!requireAdmin(session, cfg)) {
            return commandText(session, 'notAdmin');
        }

        try {
            await ctx.ruleService.deleteRule(ctx, id);
            return commandText(session, 'ruleDeleted', [id]);
        } catch (error) {
            return mapCommandError(session, error, id);
        }
    });

    ctx.command('rguard.enable <id:number>').action(async ({ session }, id) => {
        if (!requireAdmin(session, cfg)) {
            return commandText(session, 'notAdmin');
        }

        try {
            await ctx.ruleService.enableRule(ctx, id);
            return commandText(session, 'ruleEnabled', [id]);
        } catch (error) {
            return mapCommandError(session, error, id);
        }
    });

    ctx.command('rguard.disable <id:number>').action(async ({ session }, id) => {
        if (!requireAdmin(session, cfg)) {
            return commandText(session, 'notAdmin');
        }

        try {
            await ctx.ruleService.disableRule(ctx, id);
            return commandText(session, 'ruleDisabled', [id]);
        } catch (error) {
            return mapCommandError(session, error, id);
        }
    });

    ctx.command('rguard.test <content:text> [nickname:string]').action(
        async ({ session }, content, nickname = '') => {
            if (!requireAdmin(session, cfg)) {
                return commandText(session, 'notAdmin');
            }

            try {
                const rules = await ctx.ruleService.listRules(ctx);
                const result = evaluateMessage(
                    content,
                    nickname,
                    session.guildId ?? session.channelId ?? '',
                    session.userId,
                    false,
                    rules
                );

                if (
                    !result.matched ||
                    !result.selectedRule ||
                    !result.matchResult ||
                    !result.actionPlan
                ) {
                    return commandText(session, 'testNoMatch', [result.reason]);
                }

                return commandText(session, 'testMatch', [
                    result.selectedRule.id,
                    result.selectedRule.probability,
                    result.matchResult.fullMatch ?? commandText(session, 'emptyValue'),
                    result.actionPlan.replyContent ?? commandText(session, 'emptyValue'),
                    formatBoolean(session, result.actionPlan.shouldRecall),
                    result.actionPlan.shouldMute ? result.actionPlan.muteDuration : 0,
                ]);
            } catch (error) {
                return mapCommandError(session, error);
            }
        }
    );

    ctx.command('rguard.export').action(async ({ session }) => {
        if (!requireAdmin(session, cfg)) {
            return commandText(session, 'notAdmin');
        }

        try {
            const payload = await ctx.ruleImportExportService.exportRules(ctx);
            return commandText(session, 'exportSuccess', [JSON.stringify(payload, null, 2)]);
        } catch (error) {
            return mapCommandError(session, error);
        }
    });

    ctx.command('rguard.import <json:text> [mode:string]').action(
        async ({ session }, json, mode = 'merge') => {
            if (!requireAdmin(session, cfg)) {
                return commandText(session, 'notAdmin');
            }

            if (!['merge', 'replace'].includes(mode)) {
                return commandText(session, 'invalidImportMode', [mode]);
            }

            try {
                const payload = JSON.parse(json);
                const result = await ctx.ruleImportExportService.importRules(
                    ctx,
                    payload,
                    mode as 'merge' | 'replace'
                );

                if (result.errorCount > 0) {
                    return commandText(session, 'importPartial', [
                        result.success,
                        result.errorCount,
                        formatImportErrors(session, result.errors),
                    ]);
                }

                return commandText(session, 'importSuccess', [result.success, result.errorCount]);
            } catch (error) {
                return mapCommandError(session, error);
            }
        }
    );
}
