import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId')({
  beforeLoad: ({ params }) => {
    const { auth } = useAuthStore.getState()
    const guildId = params.guildId

    // Kullanıcının sunucuları arasında bu guild var mı kontrol et
    const userGuilds = auth.user?.discord?.guilds || []
    const guild = userGuilds.find((g) => g.id === guildId)

    if (!guild) {
      throw redirect({
        to: '/apps',
        replace: true,
      })
    }

    // URL'deki guildId ile selectedGuild'i senkronize et
    const currentSelected = auth.selectedGuild
    if (!currentSelected || currentSelected.id !== guildId) {
      auth.setSelectedGuild({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        iconUrl:
          guild.iconUrl ||
          (guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
            : undefined),
      })
    }
  },
  component: () => <Outlet />,
})
