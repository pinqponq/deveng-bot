import { apiClient } from './client'

export interface TicketRow {
  id: number
  ticketPanelId: number
  ticketTypeId: number | null
  guildId: string
  channelId: string
  userId: string
  status: number
  claimedBy: string | null
  claimedAt: string | null
  closedBy: string | null
  closedAt: string | null
  transcriptId: number | null
  lastMessageAt: string | null
  lastMessageAuthorId: string | null
  createdAt: string
  updatedAt: string
  isUnreadForStaff: boolean
}

export interface TicketStaffMessageBody {
  content: string
  embedTitle?: string | null
  embedDescription?: string | null
  embedColor?: string | null
}

export const ticketsApi = {
  list: async (guildId: string, status?: number): Promise<TicketRow[]> => {
    const { data } = await apiClient.get<TicketRow[]>(`/api/Ticket/guild/${guildId}`, {
      params: status !== undefined ? { status } : undefined,
    })
    return data
  },

  markRead: async (guildId: string, ticketId: number): Promise<void> => {
    await apiClient.post(`/api/Ticket/guild/${guildId}/${ticketId}/read`)
  },

  sendStaffMessage: async (guildId: string, ticketId: number, body: TicketStaffMessageBody): Promise<void> => {
    await apiClient.post(`/api/Ticket/guild/${guildId}/${ticketId}/staff-message`, body)
  },
}
