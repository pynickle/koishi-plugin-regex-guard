<template>
  <div class="rule-list">
    <div class="rg-toolbar">
      <button class="rg-btn rg-btn-primary" @click="$emit('create')">
        ➕ {{ t('console.actions.create') }}
      </button>
      <button class="rg-btn" @click="refresh" :disabled="loading">
        🔄 {{ t('console.actions.refresh') }}
      </button>
    </div>

    <div v-if="error" class="rg-alert rg-alert-error">{{ error }}</div>

    <div class="rg-table-container">
      <table class="rg-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ t('console.form.enabled') }}</th>
            <th>{{ t('console.form.priority') }}</th>
            <th>{{ t('console.form.probability') }}</th>
            <th>{{ t('console.form.pattern') }}</th>
            <th>{{ t('console.actions.edit') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in sortedRules" :key="rule.id">
            <td><strong>#{{ rule.id }}</strong></td>
            <td>
              <label class="rg-switch">
                <input
                  :checked="rule.enabled"
                  type="checkbox"
                  @change="toggleRule(rule, $event)"
                >
                <span class="rg-switch-slider"></span>
              </label>
            </td>
            <td>
              <span class="rg-badge-priority">{{ rule.priority }}</span>
            </td>
            <td>
              <span class="rg-badge-priority">{{ rule.probability }}%</span>
            </td>
            <td>
              <code class="rg-code">{{ rule.pattern }}</code>
            </td>
            <td>
              <div class="rg-actions-cell">
                <button class="rg-btn" @click="$emit('edit', rule)">✏️</button>
                <button class="rg-btn rg-btn-danger" @click="confirmDelete(rule)">🗑️</button>
              </div>
            </td>
          </tr>
          <tr v-if="sortedRules.length === 0">
              <td colspan="6" class="rg-empty">
                {{ t('commands.rguard.messages.ruleListEmpty') }}
              </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRules } from '../composables/useRules'
import { t } from '../i18n'
import type { RegexGuardRule } from '../../src/types/index'

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'edit', rule: RegexGuardRule): void
}>()

const { rules, loading, error, fetchRules, enableRule, disableRule, deleteRule } = useRules()

const sortedRules = computed(() => {
  return [...rules.value].sort((a, b) => b.priority - a.priority)
})

const refresh = () => {
  fetchRules()
}

const toggleRule = async (rule: RegexGuardRule, event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  const nextEnabled = target.checked
  const previousEnabled = rule.enabled
  rule.enabled = nextEnabled

  try {
    if (nextEnabled) {
      await enableRule(rule.id)
    } else {
      await disableRule(rule.id)
    }
  } catch (e) {
    rule.enabled = previousEnabled
    target.checked = previousEnabled
  }
}

const confirmDelete = async (rule: RegexGuardRule) => {
  if (confirm(t('console.ruleList.deleteConfirm', [rule.id]))) {
    await deleteRule(rule.id)
  }
}
</script>

<style scoped>
.rg-toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.rg-table-container {
  overflow-x: auto;
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius);
  background-color: var(--rg-panel-bg);
}

.rg-actions-cell {
  display: flex;
  gap: 0.5rem;
}

.rg-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background-color: var(--rg-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--rg-primary);
  word-break: break-all;
}

.rg-badge-priority {
  display: inline-block;
  background-color: var(--rg-bg);
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--rg-text);
  border: 1px solid var(--rg-border);
}
</style>
