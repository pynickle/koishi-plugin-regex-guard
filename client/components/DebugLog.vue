<template>
  <div class="debug-log">
    <div class="rg-toolbar">
      <label class="rg-checkbox-wrap" style="margin-right: 1rem;">
        <input class="rg-checkbox" type="checkbox" v-model="autoRefresh" />
        <span>{{ t('console.debug.autoRefresh') }}</span>
      </label>
      <button class="rg-btn rg-btn-primary" @click="fetchEntries(100)" :disabled="loading">
        🔄 {{ t('console.actions.refresh') }}
      </button>
      <button class="rg-btn rg-btn-danger" @click="clearEntries">
        🗑️ {{ t('console.actions.clear') }}
      </button>
    </div>

    <div v-if="error" class="rg-alert rg-alert-error" style="margin-bottom: 1rem;">{{ error }}</div>

    <div class="rg-table-container">
      <table class="rg-table">
        <thead>
          <tr>
            <th>{{ t('console.debug.columns.time') }}</th>
            <th>{{ t('console.debug.columns.event') }}</th>
            <th>{{ t('console.debug.columns.scope') }}</th>
            <th>{{ t('console.debug.columns.result') }}</th>
            <th>{{ t('console.debug.columns.detail') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td class="rg-time-cell">{{ new Date(entry.timestamp).toLocaleString() }}</td>
            <td>
              <span :class="['rg-event-badge', `rg-event-${entry.eventType}`]">
                {{ entry.eventType }}
              </span>
              <span v-if="entry.ruleId" class="rg-rule-id">#{{ entry.ruleId }}</span>
            </td>
            <td class="rg-scope-cell">
              <div v-if="entry.platform" class="rg-scope-item">
                <span class="rg-scope-icon">🌐</span> {{ entry.platform }}
              </div>
              <div v-if="entry.guildId" class="rg-scope-item">
                <span class="rg-scope-icon">👥</span> {{ entry.guildId }}
              </div>
              <div v-if="entry.userId" class="rg-scope-item">
                <span class="rg-scope-icon">👤</span> {{ entry.userId }}
              </div>
            </td>
            <td>
              <div v-if="entry.action" class="rg-action-label">{{ entry.action }}</div>
              <div v-if="entry.success !== undefined">
                <span :class="entry.success ? 'rg-text-success' : 'rg-text-danger'">
                  {{ entry.success ? '✓ ' + t('console.status.success') : '✗ ' + t('console.status.failure') }}
                </span>
                <div v-if="entry.error" class="rg-error-detail">{{ entry.error }}</div>
              </div>
            </td>
            <td>
              <div class="rg-detail-cell">
                <details v-if="entry.content || entry.detail" class="rg-details">
                  <summary class="rg-summary">{{ t('console.debug.viewDetail') }}</summary>
                  <pre class="rg-json-content">{{ JSON.stringify(entry.detail || entry.content, null, 2) }}</pre>
                </details>
              </div>
            </td>
          </tr>
          <tr v-if="entries.length === 0">
            <td colspan="5" class="rg-empty">{{ t('console.debug.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebugLog } from '../composables/useDebugLog'
import { t } from '../i18n'

const { entries, loading, error, autoRefresh, fetchEntries, clearEntries } = useDebugLog()
</script>

<style scoped>
.rg-toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}
.rg-table-container {
  overflow-x: auto;
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius);
  background-color: var(--rg-panel-bg);
}
.rg-time-cell {
  font-variant-numeric: tabular-nums;
  color: var(--rg-text-muted);
  font-size: 0.85rem;
  white-space: nowrap;
}
.rg-event-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background-color: var(--rg-bg);
  border: 1px solid var(--rg-border);
  color: var(--rg-text);
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rg-event-match { border-color: var(--rg-primary); color: var(--rg-primary); }
.rg-event-selection { border-color: var(--rg-warning); color: var(--rg-warning); }
.rg-event-action_success { border-color: var(--rg-success); color: var(--rg-success); }
.rg-event-action_failure { border-color: var(--rg-danger); color: var(--rg-danger); }
.rg-rule-id {
  margin-left: 0.5rem;
  color: var(--rg-text-muted);
  font-size: 0.85em;
  font-family: monospace;
}
.rg-scope-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--rg-text);
  margin-bottom: 0.25rem;
}
.rg-scope-icon {
  font-size: 0.9em;
  opacity: 0.7;
}
.rg-action-label {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.rg-text-success {
  color: var(--rg-success);
  font-weight: 600;
  font-size: 0.9em;
}
.rg-text-danger {
  color: var(--rg-danger);
  font-weight: 600;
  font-size: 0.9em;
}
.rg-error-detail {
  color: var(--rg-danger);
  font-size: 0.85em;
  margin-top: 0.25rem;
  background: var(--rg-danger-bg, #fee2e2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.rg-details {
  background: var(--rg-bg);
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius);
  overflow: hidden;
}
.rg-summary {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--rg-primary);
  user-select: none;
}
.rg-summary:hover {
  background: var(--rg-panel-bg);
}
.rg-json-content {
  margin: 0;
  padding: 0.75rem;
  background: var(--rg-panel-bg);
  border-top: 1px solid var(--rg-border);
  font-size: 0.8em;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, monospace;
  color: var(--rg-text-muted);
}
</style>
