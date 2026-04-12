<template>
  <div class="test-match">
    <div class="rg-form">
      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.testContent') }}</label>
        <textarea class="rg-textarea" v-model="form.content" :placeholder="t('console.placeholders.testContent')"></textarea>
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.nickname') }}</label>
        <input class="rg-input" v-model="form.nickname" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.groupId') }}</label>
        <input class="rg-input" v-model="form.groupId" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.userId') }}</label>
        <input class="rg-input" v-model="form.userId" />
      </div>

      <div class="rg-actions">
        <button class="rg-btn rg-btn-primary" @click="testMatch" :disabled="loading || !form.content">
          🚀 {{ t('console.actions.runTest') }}
        </button>
      </div>
    </div>

    <div v-if="result" class="rg-results">
      <h3>{{ t('console.test.resultTitle') }}</h3>
      
      <div :class="['rg-alert', result.matched ? 'rg-alert-error' : 'rg-alert-success']">
        <strong>{{ t('console.test.matchStatus') }}:</strong> 
        {{ result.matched ? t('console.status.matched') : t('console.status.notMatched') }}
        <span v-if="result.selectedRuleId"> ({{ t('console.test.triggeredRuleId') }}: #{{ result.selectedRuleId }})</span>
      </div>

        <div v-if="result.matched" class="rg-details">
          <p class="rg-reason"><strong>{{ t('console.test.reason') }}:</strong> {{ result.reason }}</p>

          <div v-if="result.selectedRule" class="rg-match-info">
            <h4>{{ t('console.test.selectedRuleTitle') }}</h4>
            <div class="rg-info-grid">
              <div class="rg-info-label">{{ t('console.form.priority') }}</div>
              <div class="rg-info-value">{{ result.selectedRule.priority }}</div>

              <div class="rg-info-label">{{ t('console.form.probability') }}</div>
              <div class="rg-info-value">{{ result.selectedRule.probability }}%</div>
            </div>
          </div>
          
          <div v-if="result.matchResult" class="rg-match-info">
            <h4>{{ t('console.test.matchDetailsTitle') }}</h4>
          <div class="rg-info-grid">
            <div class="rg-info-label">{{ t('console.test.fullMatch') }}</div>
            <div class="rg-info-value"><code class="rg-code">{{ result.matchResult.fullMatch }}</code></div>
            
            <div class="rg-info-label">{{ t('console.test.captureGroups') }}</div>
            <div class="rg-info-value"><code class="rg-code">{{ JSON.stringify(result.matchResult.groups) }}</code></div>
          </div>
        </div>

        <div v-if="result.actionPlan" class="rg-action-plan">
          <h4>{{ t('console.test.actionPlanTitle') }}</h4>
          <div class="rg-info-grid">
            <div class="rg-info-label">{{ t('console.test.shouldRecall') }}</div>
            <div class="rg-info-value">
              <span :class="result.actionPlan.shouldRecall ? 'rg-text-danger' : 'rg-text-muted'">
                {{ result.actionPlan.shouldRecall ? t('commands.rguard.messages.booleanTrue') : t('commands.rguard.messages.booleanFalse') }}
              </span>
            </div>

            <div class="rg-info-label">{{ t('console.test.shouldReply') }}</div>
            <div class="rg-info-value">
              <span :class="result.actionPlan.shouldReply ? 'rg-text-primary' : 'rg-text-muted'">
                {{ result.actionPlan.shouldReply ? t('commands.rguard.messages.booleanTrue') : t('commands.rguard.messages.booleanFalse') }}
              </span>
              <div v-if="result.actionPlan.shouldReply" class="rg-reply-content">
                "{{ result.actionPlan.replyContent }}"
              </div>
            </div>

            <div class="rg-info-label">{{ t('console.test.shouldMute') }}</div>
            <div class="rg-info-value">
              <span :class="result.actionPlan.shouldMute ? 'rg-text-warning' : 'rg-text-muted'">
                {{ result.actionPlan.shouldMute ? t('commands.rguard.messages.booleanTrue') : t('commands.rguard.messages.booleanFalse') }}
              </span>
              <span v-if="result.actionPlan.shouldMute" class="rg-mute-duration">
                ({{ result.actionPlan.muteDuration }}{{ t('console.units.seconds') }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="rg-alert rg-alert-error" style="margin-top: 1rem;">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { send } from '@koishijs/client'
import { t } from '../i18n'
import type { ConsoleApiResponse } from '../../src/console/api'
import type { TestMatchResult } from '../../src/types/index'

function isConsoleApiResponse(value: unknown): value is ConsoleApiResponse<TestMatchResult> {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return typeof candidate.success === 'boolean'
}

const form = ref({
  content: '',
  nickname: '',
  groupId: '',
  userId: ''
})

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<TestMatchResult | null>(null)

const testMatch = async () => {
  if (!form.value.content) return

  loading.value = true
  error.value = null
  result.value = null

  try {
    const res = await send(
      'regex-guard:test-match',
      form.value.content,
      form.value.nickname,
      form.value.groupId,
      form.value.userId
    )

    if (isConsoleApiResponse(res) && res.success) {
      result.value = res.data ?? null
    } else {
      error.value = isConsoleApiResponse(res)
        ? res.error || t('console.errors.testFailed')
        : t('console.errors.testFailed')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.rg-form {
  max-width: 600px;
}
.rg-actions {
  margin-top: 1.5rem;
}
.rg-results {
  margin-top: 3rem;
  border-top: 1px solid var(--rg-border);
  padding-top: 2rem;
  animation: rg-slide-up 0.4s ease;
}
.rg-results h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}
.rg-details {
  margin-top: 1.5rem;
  background: var(--rg-bg);
  padding: 1.5rem;
  border-radius: var(--rg-radius-lg);
  border: 1px solid var(--rg-border);
}
.rg-reason {
  margin: 0 0 1.5rem 0;
  font-size: 1.05rem;
}
.rg-match-info, .rg-action-plan {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px dashed var(--rg-border);
}
.rg-match-info h4, .rg-action-plan h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--rg-text);
  font-size: 1.1rem;
}
.rg-info-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1rem;
  align-items: baseline;
}
.rg-info-label {
  font-weight: 600;
  color: var(--rg-text-muted);
}
.rg-info-value {
  color: var(--rg-text);
}
.rg-code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  background-color: var(--rg-panel-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--rg-danger);
  word-break: break-all;
  border: 1px solid var(--rg-border);
}
.rg-reply-content {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: var(--rg-panel-bg);
  border-left: 3px solid var(--rg-primary);
  border-radius: 0 var(--rg-radius) var(--rg-radius) 0;
  font-style: italic;
  color: var(--rg-text-muted);
}
.rg-text-danger { color: var(--rg-danger); font-weight: 600; }
.rg-text-primary { color: var(--rg-primary); font-weight: 600; }
.rg-text-warning { color: var(--rg-warning); font-weight: 600; }
.rg-text-muted { color: var(--rg-text-muted); }
.rg-mute-duration {
  margin-left: 0.5rem;
  font-size: 0.9em;
  color: var(--rg-text-muted);
}

@keyframes rg-slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
