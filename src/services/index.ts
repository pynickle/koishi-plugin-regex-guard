import type { Context } from 'koishi';
import { DebugLogService } from './debug-log.js';
import { RuleImportExportService, ruleImportExportService } from './import-export.js';
import { RuleService, ruleService } from './rule-service.js';

declare module 'koishi' {
    interface Context {
        debugLog: DebugLogService;
        ruleService: RuleService;
        ruleImportExportService: RuleImportExportService;
    }
}

export * from './debug-log.js';
export * from './import-export.js';
export * from './rule-service.js';

export function provideDebugLog(ctx: Context, maxSize: number, enabled: boolean): DebugLogService {
    const debugLog = new DebugLogService(maxSize, enabled);
    ctx.debugLog = debugLog;
    return debugLog;
}

export function provideRuleServices(ctx: Context): {
    ruleService: RuleService;
    ruleImportExportService: RuleImportExportService;
} {
    ctx.ruleService = ruleService;
    ctx.ruleImportExportService = ruleImportExportService;

    return {
        ruleService,
        ruleImportExportService,
    };
}
