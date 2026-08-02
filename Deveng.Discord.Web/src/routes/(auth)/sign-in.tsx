import { z } from 'zod'
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { auth } = useAuthStore.getState()

    const maybeRedirectToApps = () => {
      if (search.redirect) return
      throw redirect({ to: '/apps', replace: true })
    }

    if (auth.user && auth.checkTokenExpiry()) {
      maybeRedirectToApps()
      return
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
            maybeRedirectToApps()
          }
        }
      } catch (e) {
        if (isRedirect(e)) throw e
      }
    }
  },
  component: SignIn,
})
