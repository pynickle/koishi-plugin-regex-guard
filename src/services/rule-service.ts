import type { Context } from 'koishi';

import { validateRegex } from '../core/engine';
import type { RegexGuardRule, RegexGuardRuleInput } from '../types';

interface RuleListFilters {
    enabled?: boolean;
}

interface NormalizedRuleInput {
    enabled: boolean;
    priority: number;
    probability: number;
    pattern: string;
    flags: string;
    targetGroupIds: string[];
    extraWhitelistUserIds: string[];
    adminExempt: boolean;
    recallEnabled: boolean;
    replyTemplate: string;
    muteDuration: number;
    metadata: Record<string, unknown>;
}

function ensureArrayOfStrings(value: unknown, fieldName: string): string[] {
    if (value == null) return [];
    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be an array of strings.`);
    }

    return value.map((entry, index) => {
        if (typeof entry !== 'string') {
            throw new Error(`${fieldName}[${index}] must be a string.`);
        }

        return entry;
    });
}

function ensureMetadata(value: unknown): Record<string, unknown> {
    if (value == null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('metadata must be an object.');
    }
    return value as Record<string, unknown>;
}

function mapDatabaseError(action: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Failed to ${action}: ${message}`);
}

export class RuleService {
    validateRuleInput(input: RegexGuardRuleInput): { valid: boolean; error?: string } {
        try {
            this.normalizeInput(input);
            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    async createRule(ctx: Context, input: RegexGuardRuleInput): Promise<RegexGuardRule> {
        const normalized = this.normalizeInput(input);
        const now = new Date();

        try {
            const created = await ctx.database.create('regex_guard_rule', {
                ...normalized,
                createdAt: now,
                updatedAt: now,
            });

            return Array.isArray(created) ? created[0] : created;
        } catch (error) {
            throw mapDatabaseError('create rule', error);
        }
    }

    async updateRule(
        ctx: Context,
        id: number,
        input: Partial<RegexGuardRuleInput>
    ): Promise<RegexGuardRule> {
        const existing = await this.getRequiredRule(ctx, id);
        const validationCandidate: RegexGuardRuleInput = {
            enabled: input.enabled ?? existing.enabled,
            priority: input.priority ?? existing.priority,
            probability: input.probability ?? existing.probability,
            pattern: input.pattern ?? existing.pattern,
            flags: input.flags ?? existing.flags,
            targetGroupIds: input.targetGroupIds ?? existing.targetGroupIds,
            extraWhitelistUserIds: input.extraWhitelistUserIds ?? existing.extraWhitelistUserIds,
            adminExempt: input.adminExempt ?? existing.adminExempt,
            recallEnabled: input.recallEnabled ?? existing.recallEnabled,
            replyTemplate: input.replyTemplate ?? existing.replyTemplate,
            muteDuration: input.muteDuration ?? existing.muteDuration,
            metadata: input.metadata ?? existing.metadata,
        };

        const normalized = this.normalizeInput(validationCandidate);

        try {
            await ctx.database.set(
                'regex_guard_rule',
                { id },
                {
                    ...normalized,
                    updatedAt: new Date(),
                }
            );
        } catch (error) {
            throw mapDatabaseError(`update rule ${id}`, error);
        }

        return this.getRequiredRule(ctx, id);
    }

    async deleteRule(ctx: Context, id: number): Promise<void> {
        await this.getRequiredRule(ctx, id);

        try {
            await ctx.database.remove('regex_guard_rule', { id });
        } catch (error) {
            throw mapDatabaseError(`delete rule ${id}`, error);
        }
    }

    async getRule(ctx: Context, id: number): Promise<RegexGuardRule | null> {
        try {
            const rules = await ctx.database.get('regex_guard_rule', { id });
            return rules[0] ?? null;
        } catch (error) {
            throw mapDatabaseError(`get rule ${id}`, error);
        }
    }

    async listRules(ctx: Context, filters?: RuleListFilters): Promise<RegexGuardRule[]> {
        const query = typeof filters?.enabled === 'boolean' ? { enabled: filters.enabled } : {};

        try {
            return await ctx.database.get('regex_guard_rule', query);
        } catch (error) {
            throw mapDatabaseError('list rules', error);
        }
    }

    async enableRule(ctx: Context, id: number): Promise<void> {
        await this.setRuleEnabled(ctx, id, true);
    }

    async disableRule(ctx: Context, id: number): Promise<void> {
        await this.setRuleEnabled(ctx, id, false);
    }

    private async setRuleEnabled(ctx: Context, id: number, enabled: boolean): Promise<void> {
        await this.getRequiredRule(ctx, id);

        try {
            await ctx.database.set(
                'regex_guard_rule',
                { id },
                {
                    enabled,
                    updatedAt: new Date(),
                }
            );
        } catch (error) {
            throw mapDatabaseError(`${enabled ? 'enable' : 'disable'} rule ${id}`, error);
        }
    }

    private normalizeInput(input: RegexGuardRuleInput): NormalizedRuleInput {
        if (!input || typeof input !== 'object') {
            throw new Error('Rule input must be an object.');
        }

        if (typeof input.pattern !== 'string' || !input.pattern.trim()) {
            throw new Error('pattern is required and must be a non-empty string.');
        }

        const flags = input.flags ?? '';
        if (typeof flags !== 'string') {
            throw new Error('flags must be a string.');
        }

        const regexValidation = validateRegex(input.pattern, flags);
        if (!regexValidation.valid) {
            throw new Error(`Invalid regex: ${regexValidation.error}`);
        }

        const priority = input.priority ?? 0;
        if (typeof priority !== 'number' || Number.isNaN(priority)) {
            throw new Error('priority must be a valid number.');
        }

        const probability = input.probability ?? 100;
        if (typeof probability !== 'number' || Number.isNaN(probability)) {
            throw new Error('probability must be a valid number.');
        }

        if (probability < 0 || probability > 100) {
            throw new Error('probability must be between 0 and 100.');
        }

        const muteDuration = input.muteDuration ?? 0;
        if (typeof muteDuration !== 'number' || Number.isNaN(muteDuration)) {
            throw new Error('muteDuration must be a valid number.');
        }

        if (muteDuration < 0) {
            throw new Error('muteDuration must be non-negative.');
        }

        return {
            enabled: input.enabled ?? true,
            priority,
            probability,
            pattern: input.pattern,
            flags,
            targetGroupIds: ensureArrayOfStrings(input.targetGroupIds, 'targetGroupIds'),
            extraWhitelistUserIds: ensureArrayOfStrings(
                input.extraWhitelistUserIds,
                'extraWhitelistUserIds'
            ),
            adminExempt: input.adminExempt ?? true,
            recallEnabled: input.recallEnabled ?? true,
            replyTemplate: typeof input.replyTemplate === 'string' ? input.replyTemplate : '',
            muteDuration,
            metadata: ensureMetadata(input.metadata),
        };
    }

    private async getRequiredRule(ctx: Context, id: number): Promise<RegexGuardRule> {
        const rule = await this.getRule(ctx, id);
        if (!rule) {
            throw new Error(`Rule ${id} not found.`);
        }
        return rule;
    }
}

export const ruleService = new RuleService();
