export interface RegexGuardRule {
    id: number;
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
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}

export interface RegexGuardRuleInput {
    enabled?: boolean;
    priority?: number;
    probability?: number;
    pattern: string;
    flags?: string;
    targetGroupIds: string[];
    extraWhitelistUserIds: string[];
    adminExempt?: boolean;
    recallEnabled?: boolean;
    replyTemplate?: string;
    muteDuration?: number;
    metadata?: Record<string, unknown>;
}

export interface ImportExportPayload {
    version: '1.0';
    exportedAt: string;
    rules: RegexGuardRuleInput[];
}

export interface ImportErrorDetail {
    index: number;
    error: string;
}

export interface ImportResult {
    success: number;
    errorCount: number;
    errors: ImportErrorDetail[];
}

export type DebugLogEventType =
    | 'match'
    | 'selection'
    | 'action_success'
    | 'action_failure'
    | 'import'
    | 'export'
    | 'test_match';

export interface DebugLogEntry {
    id: string;
    timestamp: string;
    eventType: DebugLogEventType;
    ruleId?: number;
    platform?: string;
    selfId?: string;
    channelId?: string;
    guildId?: string;
    userId?: string;
    messageId?: string;
    content?: string;
    matchedText?: string;
    captures?: string[];
    selectedRuleId?: number;
    action?: 'recall' | 'reply' | 'mute';
    success?: boolean;
    error?: string;
    detail?: Record<string, unknown>;
}

export interface TestMatchInput {
    content: string;
    groupId?: string;
    userId?: string;
    isAdmin?: boolean;
    rules?: RegexGuardRule[];
}

export interface MatchResult {
    matched: boolean;
    fullMatch?: string;
    groups: string[];
    regexSource: string;
    regexFlags: string;
}

export interface ActionPlan {
    shouldRecall: boolean;
    shouldReply: boolean;
    shouldMute: boolean;
    replyContent?: string;
    muteDuration: number;
}

export interface EvaluationResult {
    matched: boolean;
    selectedRule?: RegexGuardRule;
    matchResult?: MatchResult;
    actionPlan?: ActionPlan;
    debugEvents: DebugLogEntry[];
    reason: string;
}

export interface TestMatchResult {
    matched: boolean;
    selectedRuleId?: number;
    selectedRule?: RegexGuardRule;
    matchResult?: MatchResult;
    actionPlan?: ActionPlan;
    reason?: string;
}
