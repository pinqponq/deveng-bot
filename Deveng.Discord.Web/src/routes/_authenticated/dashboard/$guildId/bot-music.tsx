import { createFileRoute } from '@tanstack/react-router'
import { BotMusic, type MusicView } from '@/features/bot-music'

const musicViews = new Set<MusicView>(['home', 'history', 'liked', 'playlists', 'radio', 'settings'])

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-music')({
  validateSearch: (search: Record<string, unknown>): { view?: MusicView } => ({
    view: typeof search.view === 'string' && musicViews.has(search.view as MusicView) ? (search.view as MusicView) : undefined,
  }),
  component: function BotMusicRoute() {
    const { view } = Route.useSearch()
    return <BotMusic initialView={view ?? 'home'} />
  },
})
