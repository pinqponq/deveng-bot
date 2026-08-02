import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Uygulamanın en dış katmanı için hata sınırı. Router'ın kendi `errorComponent`'i
 * rota render hatalarını yakalar; bu sınır ise sağlayıcıların (Theme/Font/Direction/
 * QueryClient) veya router bootstrap'inin render sırasında fırlattığı hataları yakalar —
 * aksi halde React ağacı çözülür ve kullanıcı boş ekran görür.
 *
 * Fallback kasıtlı olarak router/i18n/Tailwind'e bağımsızdır (satır içi stil) çünkü
 * bu bağımlılıkların kendisi başarısız olduğunda dahi çalışabilmelidir.
 */
export class RootErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[RootErrorBoundary] Yakalanan hata:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100svh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
          Bir şeyler ters gitti
        </h1>
        <p style={{ maxWidth: '32rem', color: '#6b7280', margin: 0 }}>
          Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin; sorun devam
          ederse daha sonra tekrar deneyin.
        </p>
        <button
          type='button'
          onClick={() => window.location.reload()}
          style={{
            cursor: 'pointer',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            padding: '0.5rem 1.25rem',
            fontSize: '1rem',
            background: '#111827',
            color: '#fff',
          }}
        >
          Sayfayı yenile
        </button>
      </div>
    )
  }
}
