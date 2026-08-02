import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { auth } = useAuthStore.getState()
    if (auth.user && auth.checkTokenExpiry()) {
      throw redirect({ to: '/apps', replace: true })
    }

    if (!auth.user) {
      try {
        const session = await authApi.getSession()
        if (session.authenticated && session.user) {
          useAuthStore.getState().auth.hydrateFromSession(session)
          if (
            useAuthStore.getState().auth.user &&
            useAuthStore.getState().auth.checkTokenExpiry()
          ) {
            throw redirect({ to: '/apps', replace: true })
          }
        }
      } catch {
        // 401 veya ağ: giriş sayfasında kal
      }
    }
  },
  component: SignIn,
})
