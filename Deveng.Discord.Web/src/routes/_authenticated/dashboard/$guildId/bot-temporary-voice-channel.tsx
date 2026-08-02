import { createFileRoute } from '@tanstack/react-router'
import { BotTemporaryVoiceChannel } from '@/features/bot-temporary-voice-channel'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-temporary-voice-channel')({
  component: BotTemporaryVoiceChannel,
})
