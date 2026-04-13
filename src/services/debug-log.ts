import type { DebugLogEntry } from '../types';

export class DebugLogService {
    private readonly entries: DebugLogEntry[] = [];

    private readonly maxSize: number;

    private readonly enabled: boolean;

    constructor(maxSize: number, enabled: boolean) {
        this.maxSize = Math.max(1, Math.floor(maxSize));
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    addEntry(entry: DebugLogEntry): void {
        if (!this.enabled) return;

        this.entries.push(entry);

        if (this.entries.length > this.maxSize) {
            this.entries.shift();
        }
    }

    getEntries(limit?: number): DebugLogEntry[] {
        if (!this.enabled) return [];

        const entries = [...this.entries].sort((left, right) => {
            return right.timestamp.localeCompare(left.timestamp);
        });

        if (typeof limit !== 'number') return entries;

        return entries.slice(0, Math.max(0, Math.floor(limit)));
    }

    clear(): void {
        this.entries.length = 0;
    }

    getSize(): number {
        return this.entries.length;
    }
}
