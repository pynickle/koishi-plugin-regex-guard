import { localeText } from '../src/locales/index.js'

export function t(path: string, params: Array<string | number> | Record<string, string | number> = []) {
  return localeText(path, params)
}
