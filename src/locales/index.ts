import zhCN from './zh-CN.json';

type LocaleParams = Array<string | number> | Record<string, string | number>;

function getLocaleValue(path: string): string | undefined {
    const segments = path.split('.');
    let current: any = zhCN;

    for (const segment of segments) {
        if (!current || typeof current !== 'object' || !(segment in current)) {
            return undefined;
        }

        current = current[segment];
    }

    return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params: LocaleParams = []): string {
    if (Array.isArray(params)) {
        return params.reduce<string>((message, value, index) => {
            return message.replaceAll(`{${index}}`, String(value));
        }, template);
    }

    return Object.entries(params).reduce<string>((message, [key, value]) => {
        return message.replaceAll(`{${key}}`, String(value));
    }, template);
}

function localizeDatabaseAction(action: string): string {
    if (action === 'create rule') return localeText('errors.databaseActions.createRule');
    if (action === 'list rules') return localeText('errors.databaseActions.listRules');

    let match = action.match(/^get rule (\d+)$/);
    if (match) return localeText('errors.databaseActions.getRule', [match[1]]);

    match = action.match(/^update rule (\d+)$/);
    if (match) return localeText('errors.databaseActions.updateRule', [match[1]]);

    match = action.match(/^delete rule (\d+)$/);
    if (match) return localeText('errors.databaseActions.deleteRule', [match[1]]);

    match = action.match(/^enable rule (\d+)$/);
    if (match) return localeText('errors.databaseActions.enableRule', [match[1]]);

    match = action.match(/^disable rule (\d+)$/);
    if (match) return localeText('errors.databaseActions.disableRule', [match[1]]);

    return action;
}

export function localeText(path: string, params: LocaleParams = []): string {
    const template = getLocaleValue(path);
    if (!template) return path;
    return interpolate(template, params);
}

export function localizeErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    let match = message.match(/^Failed to (.+?): (.+)$/);
    if (match) {
        return localeText('errors.databaseActionFailed', [
            localizeDatabaseAction(match[1]),
            localizeErrorMessage(match[2]),
        ]);
    }

    match = message.match(/^Rule (\d+) not found\.$/);
    if (match) return localeText('commands.rguard.messages.ruleNotFound', [match[1]]);

    match = message.match(/^Invalid integer for (.+)\.$/);
    if (match) return localeText('errors.invalidInteger', [match[1]]);

    match = message.match(/^Invalid boolean for (.+)\.$/);
    if (match) return localeText('errors.invalidBoolean', [match[1]]);

    if (message === 'Array JSON is required.') {
        return localeText('errors.arrayJsonRequired');
    }

    if (message === 'Object JSON is required.') {
        return localeText('errors.objectJsonRequired');
    }

    match = message.match(/^Unsupported field: (.+)$/);
    if (match) return localeText('errors.unsupportedField', [match[1]]);

    if (message === 'Rule input must be an object.') {
        return localeText('errors.ruleInputObject');
    }

    if (message === 'pattern is required and must be a non-empty string.') {
        return localeText('errors.patternRequired');
    }

    if (message === 'flags must be a string.') {
        return localeText('errors.flagsString');
    }

    match = message.match(/^Invalid regex: (.+)$/);
    if (match) return localeText('errors.invalidRegex', [match[1]]);

    if (message === 'priority must be a valid number.') {
        return localeText('errors.priorityNumber');
    }

    if (message === 'probability must be a valid number.') {
        return localeText('errors.probabilityNumber');
    }

    if (message === 'probability must be between 0 and 100.') {
        return localeText('errors.probabilityRange');
    }

    if (message === 'muteDuration must be a valid number.') {
        return localeText('errors.muteDurationNumber');
    }

    if (message === 'muteDuration must be non-negative.') {
        return localeText('errors.muteDurationNonNegative');
    }

    match = message.match(/^(.+?) must be an array of strings\.$/);
    if (match) return localeText('errors.arrayOfStrings', [match[1]]);

    match = message.match(/^(.+?)\[(\d+)\] must be a string\.$/);
    if (match) return localeText('errors.arrayStringItem', [match[1], match[2]]);

    if (message === 'metadata must be an object.') {
        return localeText('errors.metadataObject');
    }

    if (message === 'Import payload must be an object.') {
        return localeText('errors.importPayloadObject');
    }

    if (message === 'Import payload is missing required version field.') {
        return localeText('errors.importPayloadMissingVersion');
    }

    match = message.match(/^Unsupported version: (.+)$/);
    if (match) return localeText('errors.importPayloadUnsupportedVersion', [match[1]]);

    if (message === 'Import payload rules must be an array.') {
        return localeText('errors.importPayloadRulesArray');
    }

    if (message === 'Rule must be an object.') {
        return localeText('errors.importRuleObject');
    }

    if (message === 'Invalid rule input.') {
        return localeText('errors.invalidRuleInput');
    }

    if (message === 'Import mode must be merge or replace.') {
        return localeText('errors.importModeInvalid');
    }

    if (message === 'Rule id must be a non-negative integer.') {
        return localeText('errors.ruleIdInvalid');
    }

    if (message === 'Debug log limit must be a non-negative number.') {
        return localeText('errors.debugLimitInvalid');
    }

    return message;
}
