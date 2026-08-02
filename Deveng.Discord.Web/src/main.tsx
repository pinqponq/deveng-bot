import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'
import { RootErrorBoundary } from '@/components/error-boundary'
import { GeneralError } from '@/features/errors/general-error'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
// Generated Routes
import { routeTree } from './routeTree.gen'
// i18n (must run before app)
import i18n from './i18n'
// Styles
import './styles/index.css'

try {
  localStorage.removeItem('deveng_currency')
} catch {
  /* ignore */
}

// Yakalanmamış promise reddi / global hatalar sessiz kalmasın; en azından loglanır.
window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('[main] Unhandled promise rejection:', event.reason)
})
window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('[main] Uncaught error:', event.error ?? event.message)
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 5 * 60 * 1000, // 5 dakika - tekrarlayan istekleri önlemek için
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error(i18n.t('errors:contentNotModified'))
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast.error(i18n.t('errors:sessionExpired'))
          useAuthStore.getState().auth.reset()
          const redirect = `${router.history.location.href}`
          router.navigate({ to: '/sign-in', search: { redirect } })
        }
        if (error.response?.status === 500) {
          toast.error(i18n.t('errors:internalServerError'))
          // Only navigate to error page in production to avoid disrupting HMR in development
          if (import.meta.env.PROD) {
            router.navigate({ to: '/500' })
          }
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 5 * 60 * 1000, // 5 dakika - preload edilen verilerin stale olma süresi
  // Rota render hatalarında boş ekran yerine standart hata bileşenini göster.
  defaultErrorComponent: GeneralError,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app (always mount: production HTML may include crawl markup inside #root for SEO)
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}
const root = ReactDOM.createRoot(rootElement)
const App = (
  <RootErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <RouterProvider router={router} />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </RootErrorBoundary>
)

root.render(
  import.meta.env.PROD ? (
    <StrictMode>{App}</StrictMode>
  ) : (
    App
  ),
)
