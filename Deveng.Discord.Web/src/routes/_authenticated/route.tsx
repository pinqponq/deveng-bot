import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { auth } = useAuthStore.getState()

    if (!auth.user || !auth.checkTokenExpiry()) {
      try {
        const session = await authApi.getSession()
        if (!session.authenticated) {
          throw redirect({
            to: '/sign-in',
            search: {
              redirect: typeof window !== 'undefined' ? window.location.href : '',
            },
          })
        }
        auth.hydrateFromSession(session)
      } catch (e) {
        if (isRedirect(e)) throw e
        throw redirect({
          to: '/sign-in',
          search: {
            redirect: typeof window !== 'undefined' ? window.location.href : '',
          },
        })
      }
    }

    const { auth: authAfter } = useAuthStore.getState()
    if (!authAfter.user || !authAfter.checkTokenExpiry()) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: typeof window !== 'undefined' ? window.location.href : '',
        },
      })
    }

    const allowedPathsWithoutGuild = ['/apps', '/select-server']
    const currentPath = location.pathname
    const isDashboardWithGuild = /^\/dashboard\/[^/]+(\/|$)/.test(currentPath)

    if (
      !authAfter.selectedGuild &&
      !allowedPathsWithoutGuild.some((path) => currentPath === path || currentPath.startsWith(path + '/')) &&
      !isDashboardWithGuild
    ) {
      throw redirect({
        to: '/apps',
        replace: true,
      })
    }
  },
  component: AuthenticatedLayout,
})
