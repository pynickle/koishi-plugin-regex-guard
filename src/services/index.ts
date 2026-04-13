import type { Context } from 'koishi';
import { DebugLogService } from './debug-log';
import { RuleImportExportService, ruleImportExportService } from './import-export';
import { RuleService, ruleService } from './rule-service';

declare module 'koishi' {
    interface Context {
        debugLog: DebugLogService;
        ruleService: RuleService;
        ruleImportExportService: RuleImportExportService;
    }
}

export * from './debug-log';
export * from './import-export';
export * from './rule-service';

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
