/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
        },
      ) => string
      remove: (id: string) => void
    }
  }
}
