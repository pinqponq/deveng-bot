import { createFileRoute } from '@tanstack/react-router'
import { BotAuditLogs } from '@/features/bot-audit-logs'

export const Route = createFileRoute('/_authenticated/dashboard/$guildId/bot-audit-logs')({
  component: BotAuditLogs,
})
