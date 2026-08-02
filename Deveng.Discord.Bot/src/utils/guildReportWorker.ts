import { Client } from 'discord.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { apiRequest } from './apiClient';
import { logError } from './logger';

interface GuildReportJob {
  id: number;
  guildId: string;
  reportRange: string;
  createdAt: string;
}

export async function processGuildReportJobs(client: Client): Promise<void> {
  const jobs = await apiRequest<GuildReportJob[]>('/api/GuildReport/pending?batchSize=25');
  for (const job of jobs ?? []) {
    try {
      const guild = client.guilds.cache.get(job.guildId) ?? await client.guilds.fetch(job.guildId).catch((error) => { logError('guildReportWorker:fetchGuild', error, 'debug'); return null; });
      if (!guild) throw new Error('Guild bulunamadı');
      const summary = {
        guildId: guild.id,
        name: guild.name,
        range: job.reportRange,
        generatedAt: new Date().toISOString(),
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
      };
      const reportPdfBase64 = await buildMinimalReportPdf(summary);
      await apiRequest(`/api/GuildReport/${job.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'completed',
          summaryJson: JSON.stringify({ ...summary, reportPdfBase64 }),
          fileRef: 'embedded-pdf-v1',
        }),
      });
    } catch (error) {
      await apiRequest(`/api/GuildReport/${job.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message : 'unknown' }),
      });
    }
  }
}

async function buildMinimalReportPdf(summary: Record<string, unknown>): Promise<string> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const title = `Deveng — ${String(summary.name ?? 'Guild')}`;
  page.drawText(title, { x: 48, y: 780, size: 14, font });
  const body = JSON.stringify(summary, null, 2);
  const lines = body.split('\n');
  let y = 750;
  for (const line of lines) {
    const chunks = line.match(/.{1,95}/g) ?? [line];
    for (const chunk of chunks) {
      page.drawText(chunk, { x: 48, y, size: 9, font });
      y -= 12;
      if (y < 48) break;
    }
    if (y < 48) break;
  }
  const bytes = await doc.save();
  return Buffer.from(bytes).toString('base64');
}
