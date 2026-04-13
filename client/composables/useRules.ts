import { onMounted, ref } from 'vue'
import { receive, send } from '@koishijs/client'
import type { RegexGuardRule, RegexGuardRuleInput, ImportExportPayload, ImportResult } from '../../src/types/index.js'
import { t } from '../i18n'

const rules = ref<RegexGuardRule[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let rulesReceiverRegistered = false

export function useRules() {
  if (!rulesReceiverRegistered) {
    receive('regex-guard:rules-updated', () => {
      void fetchRules()
    })
    rulesReceiverRegistered = true
  }

  const fetchRules = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await send('regex-guard:list-rules')
      if (response && response.success && response.data) {
        rules.value = response.data
      } else {
        error.value = response?.error || t('console.errors.loadRulesFailed')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  const getRule = async (id: number) => {
    try {
      const response = await send('regex-guard:get-rule', id)
      return response?.success ? response.data : null
    } catch {
      return null
    }
  }

  const createRule = async (input: RegexGuardRuleInput) => {
    const response = await send('regex-guard:create-rule', input)
    if (response?.success) {
      await fetchRules()
      return response.data
    }
    throw new Error(response?.error || t('console.errors.createRuleFailed'))
  }

  const updateRule = async (id: number, input: Partial<RegexGuardRuleInput>) => {
    const response = await send('regex-guard:update-rule', id, input)
    if (response?.success) {
      await fetchRules()
      return response.data
    }
    throw new Error(response?.error || t('console.errors.updateRuleFailed'))
  }

  const deleteRule = async (id: number) => {
    const response = await send('regex-guard:delete-rule', id)
    if (response?.success) {
      await fetchRules()
      return true
    }
    throw new Error(response?.error || t('console.errors.deleteRuleFailed'))
  }

  const enableRule = async (id: number) => {
    const response = await send('regex-guard:enable-rule', id)
    if (response?.success) {
      await fetchRules()
      return true
    }
    throw new Error(response?.error || t('console.errors.enableRuleFailed'))
  }

  const disableRule = async (id: number) => {
    const response = await send('regex-guard:disable-rule', id)
    if (response?.success) {
      await fetchRules()
      return true
    }
    throw new Error(response?.error || t('console.errors.disableRuleFailed'))
  }

  const importRules = async (payload: ImportExportPayload, mode: 'merge' | 'replace') => {
    const response = await send('regex-guard:import-rules', payload, mode)
    if (response?.success) {
      await fetchRules()
      return response.data as ImportResult
    }
    throw new Error(response?.error || t('console.errors.importRulesFailed'))
  }

  const exportRules = async () => {
    const response = await send('regex-guard:export-rules')
    if (response?.success) {
      return response.data as ImportExportPayload
    }
    throw new Error(response?.error || t('console.errors.exportRulesFailed'))
  }

  onMounted(() => {
    if (!rules.value.length) {
      void fetchRules()
    }
  })

  return {
    rules,
    loading,
    error,
    fetchRules,
    getRule,
    createRule,
    updateRule,
    deleteRule,
    enableRule,
    disableRule,
    importRules,
    exportRules
  }
}
