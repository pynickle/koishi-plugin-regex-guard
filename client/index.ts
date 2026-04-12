import { defineExtension } from '@koishijs/client'
import Page from './page.vue'
import { t } from './i18n'

export default defineExtension((ctx) => {
  ctx.page({
    path: '/regex-guard',
    name: t('console.pageTitle'),
    component: Page,
    authority: 1
  })
})
