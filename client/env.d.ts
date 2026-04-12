declare module '@koishijs/client' {
  interface Context {
    console: {
      call(method: string, ...args: any[]): Promise<any>
      on(event: string, callback: (...args: any[]) => void): void
    }
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{}, {}, any>
  export default component
}

export {}
