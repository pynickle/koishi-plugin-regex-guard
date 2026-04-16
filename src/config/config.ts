import { Schema } from 'koishi';

import zhCN from '../locales/zh-CN.json';

export type RuleScope = 'global' | 'guild' | 'channel';

export interface Config {
    adminIds?: string[];
    debugMode?: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        adminIds: Schema.array(String).role('table').default([]),
    }).description('权限管理'),
    Schema.object({
        debugMode: Schema.boolean().default(false),
    }).description('运行与调试'),
]).i18n({
    'zh-CN': zhCN.config,
});
