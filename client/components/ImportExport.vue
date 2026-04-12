<template>
  <div class="import-export">
    <div class="rg-section">
      <div class="rg-section-header">
        <h3 class="rg-section-title">📤 {{ t('console.importExport.exportTitle') }}</h3>
        <p class="rg-section-desc">{{ t('console.importExport.exportDescription') }}</p>
      </div>
      <div class="rg-section-body">
        <button class="rg-btn rg-btn-primary" @click="doExport" :disabled="loading">
          {{ t('console.actions.downloadBackup') }}
        </button>
      </div>
    </div>

    <div class="rg-section" style="margin-top: 2rem;">
      <div class="rg-section-header">
        <h3 class="rg-section-title">📥 {{ t('console.importExport.importTitle') }}</h3>
        <p class="rg-section-desc">{{ t('console.importExport.importDescription') }}</p>
      </div>
      <div class="rg-section-body">
        <div class="rg-form">
          <div class="rg-form-item">
            <label class="rg-form-label">{{ t('console.importExport.importMode') }}</label>
            <div class="rg-radio-group">
              <label v-for="option in modeOptions" :key="option.value" class="rg-radio-label">
                <input type="radio" v-model="importMode" :value="option.value" class="rg-radio-input" />
                <span class="rg-radio-text">{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="rg-form-item">
            <label class="rg-form-label">{{ t('console.importExport.selectFile') }}</label>
            <div class="rg-file-input-wrapper">
              <input type="file" accept=".json" @change="handleFileChange" class="rg-file-input" id="rg-file" />
              <label for="rg-file" class="rg-file-label">
                {{ selectedFile ? selectedFile.name : `📁 ${t('console.importExport.selectFile')}` }}
              </label>
            </div>
          </div>

          <div class="rg-form-actions">
            <button class="rg-btn rg-btn-danger" @click="doImport" :disabled="loading || !selectedFile">
              ⚠️ {{ t('console.actions.importNow') }}
            </button>
          </div>
        </div>

        <div v-if="result" :class="['rg-alert', result.errorCount > 0 ? 'rg-alert-warning' : 'rg-alert-success']" style="margin-top: 1.5rem;">
          <strong>{{ t('console.importExport.importResult', [result.success, result.errorCount]) }}</strong>
          <ul v-if="result.errors && result.errors.length" class="rg-error-list">
            <li v-for="(err, i) in result.errors" :key="i">
              {{ t('console.importExport.importErrorItem', [err.index, err.error]) }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="error" class="rg-alert rg-alert-error" style="margin-top: 1.5rem;">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRules } from '../composables/useRules'
import { t } from '../i18n'
import type { ImportResult } from '../../src/types/index'

const { exportRules, importRules, loading, error } = useRules()

const importMode = ref<'merge' | 'replace'>('merge')
const modeOptions = [
  { label: t('console.importExport.modeMerge'), value: 'merge' },
  { label: t('console.importExport.modeReplace'), value: 'replace' }
]

const selectedFile = ref<File | null>(null)
const result = ref<ImportResult | null>(null)

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  } else {
    selectedFile.value = null
  }
}

const doExport = async () => {
  try {
    const payload = await exportRules()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `regex-guard-rules-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

const doImport = async () => {
  if (!selectedFile.value) return

  error.value = null
  result.value = null

  try {
    const text = await selectedFile.value.text()
    const payload = JSON.parse(text)
    if (!payload.version || !payload.rules) {
      throw new Error(t('errors.invalidImportFile'))
    }
    
    result.value = await importRules(payload, importMode.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<style scoped>
.rg-section {
  background: var(--rg-bg);
  border: 1px solid var(--rg-border);
  border-radius: var(--rg-radius-lg);
  overflow: hidden;
}
.rg-section-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--rg-border);
  background: var(--rg-panel-bg);
}
.rg-section-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--rg-text);
}
.rg-section-desc {
  margin: 0;
  color: var(--rg-text-muted);
  font-size: 0.95rem;
}
.rg-section-body {
  padding: 1.5rem;
}
.rg-radio-group {
  display: flex;
  gap: 1.5rem;
}
.rg-radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.rg-radio-input {
  accent-color: var(--rg-primary);
  width: 1.1rem;
  height: 1.1rem;
}
.rg-file-input-wrapper {
  position: relative;
}
.rg-file-input {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}
.rg-file-label {
  display: inline-block;
  padding: 0.75rem 1rem;
  background-color: var(--rg-panel-bg);
  border: 1px dashed var(--rg-primary);
  border-radius: var(--rg-radius);
  color: var(--rg-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}
.rg-file-label:hover {
  background-color: var(--rg-bg);
}
.rg-error-list {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  font-size: 0.9em;
}
</style>
