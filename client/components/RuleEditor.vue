<template>
  <div class="rule-editor">
    <div class="rg-form">
      <div class="rg-form-item">
        <label class="rg-form-label required">{{ t('console.form.pattern') }}</label>
        <input class="rg-input" v-model="form.pattern" :placeholder="t('console.placeholders.pattern')" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.flags') }}</label>
        <input class="rg-input" v-model="form.flags" :placeholder="t('console.placeholders.flags')" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.priority') }}</label>
        <input class="rg-input" v-model.number="form.priority" type="number" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.probability') }}</label>
        <input class="rg-input" v-model.number="form.probability" type="number" min="0" max="100" step="0.01" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.targetGroups') }}</label>
        <input class="rg-input" v-model="targetGroupIdsString" :placeholder="t('console.placeholders.targetGroups')" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.whitelist') }}</label>
        <input class="rg-input" v-model="extraWhitelistUserIdsString" :placeholder="t('console.placeholders.whitelist')" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.enabled') }}</label>
        <label class="rg-checkbox-wrap">
          <input class="rg-checkbox" v-model="form.enabled" type="checkbox">
          <span>{{ form.enabled ? t('commands.rguard.messages.enabledLabel') : t('commands.rguard.messages.disabledLabel') }}</span>
        </label>
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.adminExempt') }}</label>
        <label class="rg-checkbox-wrap">
          <input class="rg-checkbox" v-model="form.adminExempt" type="checkbox">
          <span>{{ form.adminExempt ? t('commands.rguard.messages.booleanTrue') : t('commands.rguard.messages.booleanFalse') }}</span>
        </label>
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.recallEnabled') }}</label>
        <label class="rg-checkbox-wrap">
          <input class="rg-checkbox" v-model="form.recallEnabled" type="checkbox">
          <span>{{ form.recallEnabled ? t('commands.rguard.messages.booleanTrue') : t('commands.rguard.messages.booleanFalse') }}</span>
        </label>
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.muteDuration') }}</label>
        <input class="rg-input" v-model.number="form.muteDuration" type="number" />
      </div>

      <div class="rg-form-item">
        <label class="rg-form-label">{{ t('console.form.replyTemplate') }}</label>
        <textarea class="rg-textarea" v-model="form.replyTemplate" :placeholder="t('console.placeholders.replyTemplate')"></textarea>
        <div class="rg-hints">{{ t('console.hints.replyTemplateVariables') }}</div>
      </div>

      <div class="rg-form-actions">
        <button class="rg-btn rg-btn-primary" @click="save" :disabled="loading">
          💾 {{ t('console.actions.save') }}
        </button>
        <button class="rg-btn" @click="$emit('cancel')" :disabled="loading">
          ❌ {{ t('console.actions.cancel') }}
        </button>
      </div>

      <div v-if="error" class="rg-alert rg-alert-error" style="margin-top: 1.5rem;">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRules } from '../composables/useRules'
import { t } from '../i18n'
import type { RegexGuardRule, RegexGuardRuleInput } from '../../src/types/index'

const props = defineProps<{
  rule?: RegexGuardRule | null
  isCreate?: boolean
}>()

const emit = defineEmits<{
  (e: 'saved', rule: RegexGuardRule): void
  (e: 'cancel'): void
}>()

const { createRule, updateRule, loading, error } = useRules()

const defaultForm = (): RegexGuardRuleInput => ({
  pattern: '',
  flags: '',
  priority: 0,
  probability: 100,
  enabled: true,
  adminExempt: true,
  recallEnabled: true,
  muteDuration: 0,
  replyTemplate: '',
  targetGroupIds: [],
  extraWhitelistUserIds: []
})

const form = ref<RegexGuardRuleInput>(defaultForm())

const targetGroupIdsString = computed({
  get: () => form.value.targetGroupIds.join(','),
  set: (val) => {
    form.value.targetGroupIds = val.split(',').map(s => s.trim()).filter(Boolean)
  }
})

const extraWhitelistUserIdsString = computed({
  get: () => form.value.extraWhitelistUserIds.join(','),
  set: (val) => {
    form.value.extraWhitelistUserIds = val.split(',').map(s => s.trim()).filter(Boolean)
  }
})

watch(
  () => props.rule,
  (newRule) => {
    if (newRule) {
      form.value = {
        pattern: newRule.pattern,
        flags: newRule.flags,
        priority: newRule.priority,
        probability: newRule.probability,
        enabled: newRule.enabled,
        adminExempt: newRule.adminExempt,
        recallEnabled: newRule.recallEnabled,
        muteDuration: newRule.muteDuration,
        replyTemplate: newRule.replyTemplate,
        targetGroupIds: [...newRule.targetGroupIds],
        extraWhitelistUserIds: [...newRule.extraWhitelistUserIds]
      }
    } else {
      form.value = defaultForm()
    }
  },
  { immediate: true }
)

const save = async () => {
  if (!form.value.pattern) {
    error.value = t('errors.patternRequired')
    return
  }

  try {
    let savedRule: RegexGuardRule
    if (props.rule && !props.isCreate) {
      savedRule = await updateRule(props.rule.id, form.value)
    } else {
      savedRule = await createRule(form.value)
    }
    emit('saved', savedRule)
  } catch (e) {
    // error is handled in useRules
  }
}
</script>

<style scoped>
.rg-form {
  max-width: 600px;
}
.rg-form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rg-border);
}
.rg-hints {
  font-size: 0.85em;
  color: var(--rg-text-muted);
  margin-top: 0.5rem;
}
</style>
