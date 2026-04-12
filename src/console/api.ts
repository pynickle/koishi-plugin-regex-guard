import type { Config } from '../config/config.js';
import { evaluateMessage } from '../core/engine.js';
import { localizeErrorMessage } from '../locales/index.js';
import '../services/index.js';
import type {
    ActionPlan,
    DebugLogEntry,
    ImportExportPayload,
    ImportResult,
    MatchResult,
    RegexGuardRule,
    RegexGuardRuleInput,
} from '../types/index.js';

export interface ConsoleApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

type ImportMode = 'merge' | 'replace';

type ConsoleApiContext = {
    console: {
        addListener(event: string, callback: (...args: any[]) => Promise<any> | any): void;
        broadcast(type: string, body: any): Promise<void>;
    };
    debugLog: {
        addEntry(entry: DebugLogEntry): void;
        getEntries(limit?: number): DebugLogEntry[];
        getSize(): number;
    };
    ruleService: {
        listRules(ctx: any): Promise<RegexGuardRule[]>;
        getRule(ctx: any, id: number): Promise<RegexGuardRule | null>;
        createRule(ctx: any, input: RegexGuardRuleInput): Promise<RegexGuardRule>;
        updateRule(
            ctx: any,
            id: number,
            input: Partial<RegexGuardRuleInput>
        ): Promise<RegexGuardRule>;
        deleteRule(ctx: any, id: number): Promise<void>;
        enableRule(ctx: any, id: number): Promise<void>;
        disableRule(ctx: any, id: number): Promise<void>;
    };
    ruleImportExportService: {
        exportRules(ctx: any): Promise<ImportExportPayload>;
        importRules(
            ctx: any,
            payload: ImportExportPayload,
            mode: ImportMode
        ): Promise<ImportResult>;
    };
};

function getErrorMessage(error: unknown): string {
    return localizeErrorMessage(error);
}

function validateRuleId(id: unknown): number {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
        throw new Error('Rule id must be a non-negative integer.');
    }

    return id;
}

function validateDebugLimit(limit?: number): number | undefined {
    if (typeof limit === 'undefined') return undefined;
    if (typeof limit !== 'number' || Number.isNaN(limit) || limit < 0) {
        throw new Error('Debug log limit must be a non-negative number.');
    }

    return Math.floor(limit);
}

function validateImportMode(mode: unknown): ImportMode {
    if (mode === 'merge' || mode === 'replace') return mode;
    throw new Error('Import mode must be merge or replace.');
}

function broadcastRulesUpdated(ctx: ConsoleApiContext, payload: Record<string, unknown>): void {
    void ctx.console.broadcast('regex-guard:rules-updated', payload);
}

function broadcastDebugEntriesUpdated(ctx: ConsoleApiContext): void {
    void ctx.console.broadcast('regex-guard:debug-entries-updated', {
        size: ctx.debugLog.getSize(),
    });
}

async function executeConsoleAction<T>(
    callback: () => Promise<ConsoleApiResponse<T>>
): Promise<ConsoleApiResponse<T>> {
    try {
        return await callback();
    } catch (error) {
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

export function registerConsoleApi(ctx: ConsoleApiContext, cfg: Config): void {
    ctx.console.addListener('regex-guard:list-rules', async function () {
        return executeConsoleAction(async () => {
            const rules = await ctx.ruleService.listRules(ctx);
            return { success: true, data: rules };
        });
    });

    ctx.console.addListener('regex-guard:get-rule', async function (id: number) {
        return executeConsoleAction(async () => {
            const rule = await ctx.ruleService.getRule(ctx, validateRuleId(id));
            return { success: true, data: rule };
        });
    });

    ctx.console.addListener('regex-guard:create-rule', async function (input: RegexGuardRuleInput) {
        return executeConsoleAction(async () => {
            const rule = await ctx.ruleService.createRule(ctx, input);
            broadcastRulesUpdated(ctx, { type: 'create', ruleId: rule.id });
            return { success: true, data: rule };
        });
    });

    ctx.console.addListener(
        'regex-guard:update-rule',
        async function (id: number, input: Partial<RegexGuardRuleInput>) {
            return executeConsoleAction(async () => {
                const rule = await ctx.ruleService.updateRule(ctx, validateRuleId(id), input);
                broadcastRulesUpdated(ctx, { type: 'update', ruleId: rule.id });
                return { success: true, data: rule };
            });
        }
    );

    ctx.console.addListener('regex-guard:delete-rule', async function (id: number) {
        return executeConsoleAction(async () => {
            const ruleId = validateRuleId(id);
            await ctx.ruleService.deleteRule(ctx, ruleId);
            broadcastRulesUpdated(ctx, { type: 'delete', ruleId });
            return { success: true, data: { id: ruleId } };
        });
    });

    ctx.console.addListener('regex-guard:enable-rule', async function (id: number) {
        return executeConsoleAction(async () => {
            const ruleId = validateRuleId(id);
            await ctx.ruleService.enableRule(ctx, ruleId);
            const rule = await ctx.ruleService.getRule(ctx, ruleId);
            broadcastRulesUpdated(ctx, { type: 'enable', ruleId });
            return { success: true, data: rule };
        });
    });

    ctx.console.addListener('regex-guard:disable-rule', async function (id: number) {
        return executeConsoleAction(async () => {
            const ruleId = validateRuleId(id);
            await ctx.ruleService.disableRule(ctx, ruleId);
            const rule = await ctx.ruleService.getRule(ctx, ruleId);
            broadcastRulesUpdated(ctx, { type: 'disable', ruleId });
            return { success: true, data: rule };
        });
    });

    ctx.console.addListener(
        'regex-guard:test-match',
        async function (content: string, nickname = '', groupId = '', userId = '') {
            return executeConsoleAction(async () => {
                const rules = await ctx.ruleService.listRules(ctx);
                const result = evaluateMessage(
                    content,
                    nickname,
                    groupId,
                    userId,
                    cfg.adminIds?.includes(userId) ?? false,
                    rules
                );

                for (const entry of result.debugEvents) {
                    ctx.debugLog.addEntry({
                        ...entry,
                        eventType: 'test_match',
                        detail: {
                            ...(entry.detail ?? {}),
                            sourceEventType: entry.eventType,
                        },
                    });
                }

                broadcastDebugEntriesUpdated(ctx);

                return {
                    success: true,
                    data: {
                        matched: result.matched,
                        selectedRuleId: result.selectedRule?.id,
                        selectedRule: result.selectedRule,
                        matchResult: result.matchResult,
                        actionPlan: result.actionPlan,
                        debugEvents: result.debugEvents,
                        reason: result.reason,
                    },
                };
            });
        }
    );

    ctx.console.addListener('regex-guard:export-rules', async function () {
        return executeConsoleAction(async () => {
            const payload = await ctx.ruleImportExportService.exportRules(ctx);
            ctx.debugLog.addEntry({
                id: `export-${Date.now()}`,
                timestamp: new Date().toISOString(),
                eventType: 'export',
                success: true,
                detail: {
                    ruleCount: payload.rules.length,
                },
            });
            broadcastDebugEntriesUpdated(ctx);
            return { success: true, data: payload };
        });
    });

    ctx.console.addListener(
        'regex-guard:import-rules',
        async function (payload: ImportExportPayload, mode: ImportMode = 'merge') {
            return executeConsoleAction(async () => {
                const importMode = validateImportMode(mode);
                const result = await ctx.ruleImportExportService.importRules(
                    ctx,
                    payload,
                    importMode
                );
                ctx.debugLog.addEntry({
                    id: `import-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    eventType: 'import',
                    success: result.errorCount === 0,
                    detail: {
                        mode: importMode,
                        successCount: result.success,
                        errorCount: result.errorCount,
                        errors: result.errors,
                    },
                });
                broadcastRulesUpdated(ctx, {
                    type: 'import',
                    mode: importMode,
                    successCount: result.success,
                    errorCount: result.errorCount,
                });
                broadcastDebugEntriesUpdated(ctx);
                return { success: true, data: result };
            });
        }
    );

    ctx.console.addListener('regex-guard:get-debug-entries', async function (limit?: number) {
        return executeConsoleAction(async () => {
            const entries = ctx.debugLog.getEntries(validateDebugLimit(limit));
            return { success: true, data: entries };
        });
    });
}

export interface ConsoleApiMethods {
    rules: {
        list(): Promise<ConsoleApiResponse<RegexGuardRule[]>>;
        get(id: number): Promise<ConsoleApiResponse<RegexGuardRule | null>>;
        create(input: RegexGuardRuleInput): Promise<ConsoleApiResponse<RegexGuardRule>>;
        update(
            id: number,
            input: Partial<RegexGuardRuleInput>
        ): Promise<ConsoleApiResponse<RegexGuardRule>>;
        delete(id: number): Promise<ConsoleApiResponse<{ id: number }>>;
        enable(id: number): Promise<ConsoleApiResponse<RegexGuardRule | null>>;
        disable(id: number): Promise<ConsoleApiResponse<RegexGuardRule | null>>;
        testMatch(
            content: string,
            nickname?: string,
            groupId?: string,
            userId?: string
        ): Promise<
            ConsoleApiResponse<{
                matched: boolean;
                selectedRuleId?: number;
                selectedRule?: RegexGuardRule;
                matchResult?: MatchResult;
                actionPlan?: ActionPlan;
                debugEvents: DebugLogEntry[];
                reason: string;
            }>
        >;
        export(): Promise<ConsoleApiResponse<ImportExportPayload>>;
        import(
            payload: ImportExportPayload,
            mode?: ImportMode
        ): Promise<ConsoleApiResponse<ImportResult>>;
    };
    debug: {
        getEntries(limit?: number): Promise<ConsoleApiResponse<DebugLogEntry[]>>;
    };
}
