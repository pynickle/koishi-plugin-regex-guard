import { Context } from 'koishi';
import {} from '@koishijs/plugin-console';
import { resolve } from 'node:path';
import { Config } from './config/config';
import { registerConsoleApi } from './console/index.js';
import { registerCommands } from './core/command/index.js';
import { RegexGuardRule } from './types';
import { provideDebugLog, provideRuleServices } from './services/index.js';
import { registerMiddleware } from './runtime/index.js';
import zhCN from './locales/zh-CN.json';

export const name = 'regex-guard';

export const inject = ['database'];

declare module '@koishijs/plugin-console' {
    interface Events {
        'regex-guard:get-debug-entries'(limit: number): any;
        'regex-guard:list-rules'(): any;
        'regex-guard:get-rule'(id: number): any;
        'regex-guard:create-rule'(input: any): any;
        'regex-guard:update-rule'(id: number, input: any): any;
        'regex-guard:delete-rule'(id: number): any;
        'regex-guard:enable-rule'(id: number): any;
        'regex-guard:disable-rule'(id: number): any;
        'regex-guard:import-rules'(payload: any, mode: 'merge' | 'replace'): any;
        'regex-guard:export-rules'(): any;
    }
}

export * from './config/config';
export * from './core';
export * from './runtime/index.js';
export * from './services/index.js';
export * from './console/index.js';
export * from './types';

declare module 'koishi' {
    interface Tables {
        regex_guard_rule: RegexGuardRule;
    }
}

export function apply(ctx: Context, cfg: Config) {
    ctx.i18n.define('zh-CN', zhCN);
    provideDebugLog(ctx, 100, cfg.debugMode ?? false);
    provideRuleServices(ctx);

    ctx.model.extend(
        'regex_guard_rule',
        {
            id: 'unsigned',
            enabled: { type: 'boolean', initial: true },
            priority: { type: 'integer', initial: 0 },
            probability: { type: 'float', initial: 100 },
            pattern: 'string',
            flags: { type: 'string', initial: '' },
            targetGroupIds: 'list',
            extraWhitelistUserIds: 'list',
            adminExempt: { type: 'boolean', initial: true },
            recallEnabled: { type: 'boolean', initial: true },
            replyTemplate: { type: 'text', initial: '' },
            muteDuration: { type: 'unsigned', initial: 0 },
            createdAt: 'timestamp',
            updatedAt: 'timestamp',
            metadata: 'json',
        },
        {
            primary: 'id',
            autoInc: true,
        }
    );

    ctx.inject(['console'], (ctx) => {
        if (!cfg.consoleEnabled) return;

        ctx.console.addEntry({
            dev: resolve(__dirname, '../client/index.ts'),
            prod: resolve(__dirname, '../dist'),
        });

        registerConsoleApi(ctx, cfg);
    });

    registerMiddleware(ctx, cfg);
    registerCommands(ctx, cfg);
}
