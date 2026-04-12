import zhCN from '../locales/zh-CN.json';
import { Schema } from 'koishi';

export type RuleScope = 'global' | 'guild' | 'channel';

export interface Config {
    adminIds?: string[];
    debugMode?: boolean;
    enabled?: boolean;
    maxRules?: number;
    consoleEnabled?: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        adminIds: Schema.array(String).role('table').default([]),
        debugMode: Schema.boolean().default(false),
        enabled: Schema.boolean().default(true),
    }).description('权限与调试'),
    Schema.object({
        maxRules: Schema.number().default(100).min(1).max(1000),
    }).description('规则配置'),
    Schema.object({
        consoleEnabled: Schema.boolean().default(true),
    }).description('控制台'),
]).i18n({
    'zh-CN': zhCN,
});
