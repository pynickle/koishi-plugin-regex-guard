import type { Context } from 'koishi';
import type { ImportExportPayload, ImportResult, RegexGuardRuleInput } from '../types/index.js';
import { RuleService, ruleService } from './rule-service.js';

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toImportError(index: number, reason: string): { index: number; error: string } {
    return { index, error: reason };
}

export class RuleImportExportService {
    constructor(private readonly rules: RuleService = ruleService) {}

    async exportRules(ctx: Context): Promise<ImportExportPayload> {
        const rules = await this.rules.listRules(ctx);

        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            rules: rules.map((rule) => ({
                enabled: rule.enabled,
                priority: rule.priority,
                probability: rule.probability,
                pattern: rule.pattern,
                flags: rule.flags,
                targetGroupIds: [...rule.targetGroupIds],
                extraWhitelistUserIds: [...rule.extraWhitelistUserIds],
                adminExempt: rule.adminExempt,
                recallEnabled: rule.recallEnabled,
                replyTemplate: rule.replyTemplate,
                muteDuration: rule.muteDuration,
                metadata: { ...rule.metadata },
            })),
        };
    }

    async importRules(
        ctx: Context,
        payload: ImportExportPayload,
        mode: 'merge' | 'replace'
    ): Promise<ImportResult> {
        this.validatePayloadShape(payload);

        const result: ImportResult = {
            success: 0,
            errorCount: 0,
            errors: [],
        };

        for (let index = 0; index < payload.rules.length; index += 1) {
            const candidate = payload.rules[index];

            if (!isObject(candidate)) {
                result.errors.push(toImportError(index, 'Rule must be an object.'));
                continue;
            }

            const validation = this.rules.validateRuleInput(candidate as RegexGuardRuleInput);
            if (!validation.valid) {
                result.errors.push(toImportError(index, validation.error ?? 'Invalid rule input.'));
            }
        }

        if (result.errors.length > 0) {
            result.errorCount = result.errors.length;
            return result;
        }

        if (mode === 'replace') {
            const existing = await this.rules.listRules(ctx);
            for (const rule of existing) {
                await this.rules.deleteRule(ctx, rule.id);
            }
        }

        for (let index = 0; index < payload.rules.length; index += 1) {
            const candidate = payload.rules[index] as RegexGuardRuleInput;

            try {
                if (mode === 'merge') {
                    await this.mergeRule(ctx, candidate);
                } else {
                    await this.rules.createRule(ctx, candidate);
                }

                result.success += 1;
            } catch (error) {
                result.errors.push(
                    toImportError(index, error instanceof Error ? error.message : String(error))
                );
            }
        }

        result.errorCount = result.errors.length;
        return result;
    }

    private validatePayloadShape(payload: ImportExportPayload): void {
        if (!isObject(payload)) {
            throw new Error('Import payload must be an object.');
        }

        if (!('version' in payload)) {
            throw new Error('Import payload is missing required version field.');
        }

        if (payload.version !== '1.0') {
            throw new Error(`Unsupported version: ${String(payload.version)}`);
        }

        if (!Array.isArray(payload.rules)) {
            throw new Error('Import payload rules must be an array.');
        }
    }

    private async mergeRule(ctx: Context, candidate: RegexGuardRuleInput): Promise<void> {
        const existing = await this.rules.listRules(ctx);
        const matched = existing.find((rule) => {
            return rule.pattern === candidate.pattern && rule.flags === (candidate.flags ?? '');
        });

        if (matched) {
            await this.rules.updateRule(ctx, matched.id, candidate);
            return;
        }

        await this.rules.createRule(ctx, candidate);
    }
}

export const ruleImportExportService = new RuleImportExportService();
