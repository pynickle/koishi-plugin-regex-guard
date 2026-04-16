import type { Session } from 'koishi';

import type { DebugLogService } from '../services/debug-log';
import type { ActionPlan, DebugLogEntry, RegexGuardRule } from '../types';

type ActionName = 'recall' | 'reply' | 'mute';

function createDebugEntry(
    eventType: DebugLogEntry['eventType'],
    action: ActionName,
    session: Session,
    rule: RegexGuardRule,
    success: boolean,
    error?: unknown
): DebugLogEntry {
    const timestamp = new Date().toISOString();

    return {
        id: `${eventType}-${action}-${rule.id}-${timestamp}`,
        timestamp,
        eventType,
        ruleId: rule.id,
        platform: session.platform,
        selfId: session.selfId,
        channelId: session.channelId,
        guildId: session.guildId,
        userId: session.userId,
        messageId: session.messageId,
        action,
        success,
        error: error ? formatError(error) : undefined,
        detail: error ? classifyError(error) : undefined,
    };
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function classifyError(error: unknown): Record<string, unknown> {
    const message = formatError(error).toLowerCase();
    const capabilityError =
        /(not\s+implemented|unsupported|capability|not\s+supported|unknown\s+method)/.test(message);
    const permissionError = /(permission|forbidden|denied|insufficient|unauthorized|admin)/.test(
        message
    );

    return {
        capabilityError,
        permissionError,
    };
}

function logActionResult(
    debugLog: DebugLogService | undefined,
    session: Session,
    rule: RegexGuardRule,
    action: ActionName,
    success: boolean,
    error?: unknown
): void {
    debugLog?.addEntry(
        createDebugEntry(
            success ? 'action_success' : 'action_failure',
            action,
            session,
            rule,
            success,
            error
        )
    );
}

async function executeRecall(plan: ActionPlan, session: Session): Promise<void> {
    if (!plan.shouldRecall || !session.messageId) return;
    await session.bot.deleteMessage(session.channelId, session.messageId);
}

async function executeReply(plan: ActionPlan, session: Session): Promise<void> {
    if (!plan.shouldReply || !plan.replyContent) return;
    await session.send(plan.replyContent);
}

async function executeMute(plan: ActionPlan, session: Session): Promise<void> {
    if (!plan.shouldMute || !plan.muteDuration || !session.guildId) return;
    await session.bot.muteGuildMember(session.guildId, session.userId, plan.muteDuration * 1000);
}

export async function executeActionPlan(
    plan: ActionPlan,
    session: Session,
    rule: RegexGuardRule,
    debugLog?: DebugLogService
): Promise<void> {
    const actions: Array<{ name: ActionName; enabled: boolean; execute: () => Promise<void> }> = [
        {
            name: 'recall',
            enabled: plan.shouldRecall && Boolean(session.messageId),
            execute: () => executeRecall(plan, session),
        },
        {
            name: 'reply',
            enabled: plan.shouldReply && Boolean(plan.replyContent),
            execute: () => executeReply(plan, session),
        },
        {
            name: 'mute',
            enabled: plan.shouldMute && plan.muteDuration > 0 && Boolean(session.guildId),
            execute: () => executeMute(plan, session),
        },
    ];

    for (const action of actions) {
        if (!action.enabled) continue;

        try {
            await action.execute();
            logActionResult(debugLog, session, rule, action.name, true);
        } catch (error) {
            logActionResult(debugLog, session, rule, action.name, false, error);
        }
    }
}
