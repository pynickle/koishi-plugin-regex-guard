import type { Context, Next, Session } from 'koishi';
import type { Config } from '../config/config';
import { evaluateMessage } from '../core/engine';
import { executeActionPlan } from './executor';
import type { DebugLogEntry } from '../types';

function createRuntimeDebugEntry(
    eventType: DebugLogEntry['eventType'],
    session: Session,
    detail: Record<string, unknown>
): DebugLogEntry {
    const timestamp = new Date().toISOString();

    return {
        id: `${eventType}-runtime-${timestamp}`,
        timestamp,
        eventType,
        platform: session.platform,
        selfId: session.selfId,
        channelId: session.channelId,
        guildId: session.guildId,
        userId: session.userId,
        messageId: session.messageId,
        content: session.content,
        detail,
    };
}

function flushDebugEvents(ctx: Context, events: DebugLogEntry[]): void {
    for (const event of events) {
        ctx.debugLog?.addEntry(event);
    }
}

export function registerMiddleware(ctx: Context, cfg: Config) {
    return ctx.middleware(async (session: Session, next: Next) => {
        if (!cfg.enabled) return next();
        if (!session.guildId) return next();
        if (!session.content?.trim()) return next();

        const rules = await ctx.ruleService.listRules(ctx, { enabled: true });

        const applicableRules = rules.filter((rule) => {
            return (
                rule.targetGroupIds.length === 0 || rule.targetGroupIds.includes(session.guildId)
            );
        });

        const isAdmin = cfg.adminIds?.includes(session.userId) ?? false;
        const nickname = session.author?.nickname ?? session.username ?? '';
        const result = evaluateMessage(
            session.content,
            nickname,
            session.guildId,
            session.userId,
            isAdmin,
            applicableRules
        );

        flushDebugEvents(ctx, result.debugEvents);

        if (!result.matched || !result.actionPlan || !result.selectedRule) {
            ctx.debugLog?.addEntry(
                createRuntimeDebugEntry('selection', session, {
                    matched: false,
                    reason: result.reason,
                    applicableRuleCount: applicableRules.length,
                })
            );
            return next();
        }

        ctx.debugLog?.addEntry(
            createRuntimeDebugEntry('selection', session, {
                matched: true,
                ruleId: result.selectedRule.id,
                reason: result.reason,
                applicableRuleCount: applicableRules.length,
            })
        );

        await executeActionPlan(result.actionPlan, session, result.selectedRule, ctx.debugLog);

        return next();
    }, true);
}
