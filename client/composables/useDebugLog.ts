import { onMounted, ref } from 'vue'
import { receive, send } from '@koishijs/client'
import type { DebugLogEntry } from '../../src'
import { t } from '../i18n'

const entries = ref<DebugLogEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const autoRefresh = ref(true)

let debugReceiverRegistered = false

export function useDebugLog() {
  if (!debugReceiverRegistered) {
    receive('regex-guard:debug-entries-updated', () => {
      if (autoRefresh.value) {
        void fetchEntries()
      }
    })
    debugReceiverRegistered = true
  }

  const fetchEntries = async (limit = 100) => {
    loading.value = true
    error.value = null
    try {
      const response = await send('regex-guard:get-debug-entries', limit)
      if (response?.success && response.data) {
        entries.value = response.data
      } else {
        error.value = response?.error || t('console.errors.loadDebugEntriesFailed')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  const clearEntries = () => {
    entries.value = []
  }

  onMounted(() => {
    if (!entries.value.length) {
      void fetchEntries()
    }
  })

  return {
    entries,
    loading,
    error,
    autoRefresh,
    fetchEntries,
    clearEntries
  }
}
