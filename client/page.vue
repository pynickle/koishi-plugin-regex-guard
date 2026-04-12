<template>
  <div class="rg-dashboard">
    <div class="rg-sidebar">
      <div class="rg-brand">
        <h2>{{ t('pluginName') }}</h2>
        <span class="rg-badge">{{ t('console.pageTitle') }}</span>
      </div>
      <nav class="rg-nav">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="rg-nav-item"
          :class="{ active: activeTab === tab.name }"
          @click="activeTab = tab.name"
        >
          <span class="rg-nav-icon">{{ tab.icon }}</span>
          <span class="rg-nav-label">{{ t(tab.labelKey) }}</span>
        </button>
      </nav>
    </div>

    <div class="rg-main">
      <header class="rg-header">
        <h1>{{ currentTabTitle }}</h1>
        <p class="rg-subtitle" v-if="currentTabDesc">{{ currentTabDesc }}</p>
      </header>

      <div class="rg-content">
        <div v-show="activeTab === 'rules'" class="rg-panel">
          <RuleEditor
            v-if="editorVisible"
            :rule="editingRule"
            :is-create="creatingRule"
            @saved="onSaved"
            @cancel="cancelEdit"
          />
          <RuleList
            v-else
            @create="switchToEditorCreate"
            @edit="switchToEditorEdit"
          />
        </div>

        <div v-show="activeTab === 'test'" class="rg-panel">
          <TestMatch />
        </div>

        <div v-show="activeTab === 'import-export'" class="rg-panel">
          <ImportExport />
        </div>

        <div v-show="activeTab === 'debug'" class="rg-panel">
          <DebugLog />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import RuleList from './components/RuleList.vue'
import RuleEditor from './components/RuleEditor.vue'
import TestMatch from './components/TestMatch.vue'
import ImportExport from './components/ImportExport.vue'
import DebugLog from './components/DebugLog.vue'
import { t } from './i18n'
import type { RegexGuardRule } from '../src/types/index'

const activeTab = ref('rules')

const editingRule = ref<RegexGuardRule | null>(null)
const creatingRule = ref(false)

const tabs = [
  { name: 'rules', labelKey: 'console.tabs.rules', icon: '📋' },
  { name: 'test', labelKey: 'console.tabs.test', icon: '🧪' },
  { name: 'import-export', labelKey: 'console.tabs.importExport', icon: '📦' },
  { name: 'debug', labelKey: 'console.tabs.debug', icon: '🐛' }
]

const currentTabTitle = computed(() => {
  if (activeTab.value === 'rules' && editorVisible.value) {
    return t('console.cards.editor')
  }
  const tab = tabs.find(t => t.name === activeTab.value)
  return tab ? t(tab.labelKey) : ''
})

const currentTabDesc = computed(() => {
  switch (activeTab.value) {
    case 'rules': return editorVisible.value ? '' : t('console.cards.rules')
    case 'test': return t('console.cards.test')
    case 'import-export': return t('console.cards.importExport')
    case 'debug': return t('console.cards.debug')
    default: return ''
  }
})

const editorVisible = computed(() => {
  return creatingRule.value || editingRule.value !== null
})

const switchToEditorCreate = () => {
  editingRule.value = null
  creatingRule.value = true
  activeTab.value = 'rules'
}

const switchToEditorEdit = (rule: RegexGuardRule) => {
  editingRule.value = rule
  creatingRule.value = false
  activeTab.value = 'rules'
}

const cancelEdit = () => {
  editingRule.value = null
  creatingRule.value = false
  activeTab.value = 'rules'
}

const onSaved = () => {
  editingRule.value = null
  creatingRule.value = false
  activeTab.value = 'rules'
}
</script>

<style>
/* Global CSS variables for the redesign */
:root {
  --rg-bg: #f8fafc;
  --rg-panel-bg: #ffffff;
  --rg-border: #e2e8f0;
  --rg-text: #0f172a;
  --rg-text-muted: #64748b;
  --rg-primary: #3b82f6;
  --rg-primary-hover: #2563eb;
  --rg-danger: #ef4444;
  --rg-danger-hover: #dc2626;
  --rg-success: #10b981;
  --rg-success-bg: #d1fae5;
  --rg-warning: #f59e0b;
  --rg-warning-bg: #fef3c7;
  --rg-radius: 8px;
  --rg-radius-lg: 12px;
  --rg-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --rg-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --rg-font: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --rg-sidebar-w: 240px;
}

html.dark, .dark {
  --rg-bg: #0f172a;
  --rg-panel-bg: #1e293b;
  --rg-border: #334155;
  --rg-text: #f8fafc;
  --rg-text-muted: #94a3b8;
  --rg-primary: #3b82f6;
  --rg-primary-hover: #60a5fa;
  --rg-danger: #ef4444;
  --rg-danger-hover: #f87171;
  --rg-success: #10b981;
  --rg-success-bg: #064e3b;
  --rg-warning: #f59e0b;
  --rg-warning-bg: #78350f;
  --rg-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5);
  --rg-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.5);
}

/* Base resets inside rg-dashboard */
.rg-dashboard {
  display: flex;
  width: 100%;
  min-height: calc(100vh - 64px);
  background-color: var(--rg-bg);
  color: var(--rg-text);
  font-family: var(--rg-font);
  line-height: 1.5;
  overflow: hidden;
  border-radius: var(--rg-radius-lg);
  margin-left: 70px;
}

.rg-sidebar {
  width: var(--rg-sidebar-w);
  background-color: var(--rg-panel-bg);
  border-right: 1px solid var(--rg-border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
}

.rg-brand {
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.rg-brand h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--rg-text);
  letter-spacing: -0.025em;
}

.rg-badge {
  display: inline-block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  background-color: var(--rg-primary);
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}

.rg-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rg-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: var(--rg-radius);
  color: var(--rg-text-muted);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.rg-nav-item:hover {
  background-color: var(--rg-bg);
  color: var(--rg-text);
}

.rg-nav-item.active {
  background-color: var(--rg-bg);
  color: var(--rg-primary);
}

.rg-nav-icon {
  font-size: 1.1rem;
}

.rg-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rg-header {
  padding: 2rem 3rem 1.5rem;
}

.rg-header h1 {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--rg-text);
}

.rg-subtitle {
  margin: 0.5rem 0 0;
  color: var(--rg-text-muted);
  font-size: 1rem;
}

.rg-content {
  padding: 0 3rem 3rem;
  flex: 1;
}

.rg-panel {
  background-color: var(--rg-panel-bg);
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius-lg);
  box-shadow: var(--rg-shadow-sm);
  padding: 2rem;
  animation: rg-fade-in 0.3s ease;
}

@keyframes rg-fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 960px) {
  .rg-sidebar {
    width: 220px;
    padding: 1.25rem 0.875rem;
  }

  .rg-header {
    padding: 1.5rem 1.5rem 1rem;
  }

  .rg-content {
    padding: 0 1.5rem 1.5rem;
  }

  .rg-panel {
    padding: 1.5rem;
  }
}

@media (max-width: 720px) {
  .rg-dashboard {
    flex-direction: column;
    min-height: auto;
  }

  .rg-sidebar {
    width: auto;
    border-right: none;
    border-bottom: 1px solid var(--rg-border);
  }

  .rg-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .rg-nav-item {
    flex: 1 1 140px;
  }
}

/* Global Shared Components */
.rg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--rg-panel-bg);
  color: var(--rg-text);
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--rg-shadow-sm);
  font-family: var(--rg-font);
}

.rg-btn:hover:not(:disabled) {
  background-color: var(--rg-bg);
  border-color: var(--rg-text-muted);
}

.rg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rg-btn-primary {
  background-color: var(--rg-primary);
  color: white;
  border-color: transparent;
}

.rg-btn-primary:hover:not(:disabled) {
  background-color: var(--rg-primary-hover);
  border-color: transparent;
  color: white;
}

.rg-btn-danger {
  background-color: var(--rg-danger);
  color: white;
  border-color: transparent;
}

.rg-btn-danger:hover:not(:disabled) {
  background-color: var(--rg-danger-hover);
  border-color: transparent;
  color: white;
}

.rg-alert {
  padding: 1rem;
  border-radius: var(--rg-radius);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.rg-alert-error {
  background-color: var(--rg-danger-bg, #fee2e2);
  color: var(--rg-danger, #b91c1c);
  border-color: var(--rg-danger, #f87171);
}

.rg-alert-success {
  background-color: var(--rg-success-bg, #d1fae5);
  color: var(--rg-success, #047857);
  border-color: var(--rg-success, #34d399);
}

.rg-alert-warning {
  background-color: var(--rg-warning-bg, #fef3c7);
  color: var(--rg-warning, #b45309);
  border-color: var(--rg-warning, #fbbf24);
}

.rg-input, .rg-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: var(--rg-bg);
  border: 1px solid var(--rg-border);
  color: var(--rg-text);
  border-radius: var(--rg-radius);
  font-size: 0.95rem;
  font-family: var(--rg-font);
  transition: all 0.2s;
  box-sizing: border-box;
}

.rg-input:focus, .rg-textarea:focus {
  outline: none;
  border-color: var(--rg-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.rg-textarea {
  resize: vertical;
  min-height: 80px;
}

.rg-form-item {
  margin-bottom: 1.5rem;
}

.rg-form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--rg-text);
}

.rg-form-label.required::after {
  content: '*';
  color: var(--rg-danger);
  margin-left: 0.25rem;
}

.rg-checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.rg-checkbox {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  background-color: var(--rg-bg);
  border: 1px solid var(--rg-border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.rg-checkbox:checked {
  background-color: var(--rg-primary);
  border-color: var(--rg-primary);
}

.rg-checkbox:checked::after {
  content: '';
  width: 0.375rem;
  height: 0.75rem;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.rg-switch {
  position: relative;
  display: inline-block;
  width: 2.75rem;
  height: 1.5rem;
}

.rg-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.rg-switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--rg-text-muted);
  transition: .3s;
  border-radius: 1.5rem;
}

.rg-switch-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: var(--rg-shadow-sm);
}

input:checked + .rg-switch-slider {
  background-color: var(--rg-success);
}

input:focus + .rg-switch-slider {
  box-shadow: 0 0 1px var(--rg-success);
}

input:checked + .rg-switch-slider:before {
  transform: translateX(1.25rem);
}

.rg-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.rg-table th {
  padding: 1rem 0.75rem;
  font-weight: 600;
  color: var(--rg-text-muted);
  border-bottom: 2px solid var(--rg-border);
  background-color: var(--rg-bg);
}

.rg-table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid var(--rg-border);
  color: var(--rg-text);
  vertical-align: top;
}

.rg-table tr:hover td {
  background-color: var(--rg-bg);
}

.rg-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--rg-text-muted);
}
</style>
