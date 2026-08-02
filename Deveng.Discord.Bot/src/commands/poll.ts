import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { commonGuildOnly, pollMsg } from '../utils/slashLocale';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Mevcut kanalda anket oluşturur')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('soru')
        .setDescription('Anket sorusu')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('seçenek1')
        .setDescription('1. seçenek')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('seçenek2')
        .setDescription('2. seçenek')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('seçenek3')
        .setDescription('3. seçenek')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('seçenek4')
        .setDescription('4. seçenek')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('seçenek5')
        .setDescription('5. seçenek')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('dakika')
        .setDescription('Kaç dakika sonra anket bitsin?')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20160)
    )
    .addIntegerOption(option =>
      option
        .setName('oy')
        .setDescription('Kaç oydan sonra anket bitsin?')
        .setRequired(false)
        .setMinValue(1)
    )
    .addBooleanOption(option =>
      option
        .setName('çoklu-oy')
        .setDescription('Birden fazla seçeneğe oy verilebilir mi?')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: commonGuildOnly(interaction), flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const question = interaction.options.getString('soru', true);
      const option1 = interaction.options.getString('seçenek1', true);
      const option2 = interaction.options.getString('seçenek2', true);
      const option3 = interaction.options.getString('seçenek3');
      const option4 = interaction.options.getString('seçenek4');
      const option5 = interaction.options.getString('seçenek5');
      const endAfterMinutes = interaction.options.getInteger('dakika');
      const endAfterVotes = interaction.options.getInteger('oy');
      const allowMultipleVotes = interaction.options.getBoolean('çoklu-oy') ?? false;

      if ((endAfterMinutes != null && endAfterMinutes < 1) || (endAfterVotes != null && endAfterVotes < 1)) {
        await interaction.editReply({ content: 'Süre (dakika) ve oy sayısı en az 1 olmalıdır.' });
        return;
      }

      // Anket kanalı izin ön-kontrolü (embed + tepkiler).
      const me = interaction.guild.members.me;
      const ch = interaction.channel;
      const perms = me && ch && 'permissionsFor' in ch ? ch.permissionsFor(me) : null;
      const missingPerms: string[] = [];
      if (!perms || !perms.has(PermissionFlagsBits.SendMessages)) missingPerms.push('Mesaj Gönder');
      if (!perms || !perms.has(PermissionFlagsBits.EmbedLinks)) missingPerms.push('Bağlantıları Göm');
      if (!perms || !perms.has(PermissionFlagsBits.AddReactions)) missingPerms.push('Tepki Ekle');
      if (missingPerms.length > 0) {
        await interaction.editReply({ content: `Anket oluşturulamıyor: bu kanalda botta şu izin(ler) eksik: **${missingPerms.join(', ')}**.` });
        return;
      }

      // Seçenekleri topla
      const options: Array<{ optionText: string; emoji: string | null; orderIndex: number }> = [
        { optionText: option1, emoji: '1️⃣', orderIndex: 0 },
        { optionText: option2, emoji: '2️⃣', orderIndex: 1 },
      ];

      if (option3) options.push({ optionText: option3, emoji: '3️⃣', orderIndex: 2 });
      if (option4) options.push({ optionText: option4, emoji: '4️⃣', orderIndex: 3 });
      if (option5) options.push({ optionText: option5, emoji: '5️⃣', orderIndex: 4 });

      // API'ye istek gönder
      const { getApiBaseUrl, getBotApiHeaders } = await import('../utils/apiClient');
      const apiBaseUrl = getApiBaseUrl();
      
      if (!apiBaseUrl) {
        await interaction.editReply({ content: pollMsg(interaction, 'noApi') });
        return;
      }

      // Anket oluştur
      const createResponse = await fetch(`${apiBaseUrl}/api/Poll`, {
        method: 'POST',
        headers: getBotApiHeaders(),
        body: JSON.stringify({
          guildId: interaction.guild.id,
          channelId: interaction.channelId,
          question: question,
          endAfterMinutes: endAfterMinutes || null,
          endAfterVotes: endAfterVotes || null,
          allowMultipleVotes: allowMultipleVotes,
          options: options,
          rolePermissions: [],
          createdVia: 'slash',
        }),
      });

      if (!createResponse.ok) {
        if (createResponse.status === 409) {
          await interaction.editReply({ content: pollMsg(interaction, 'channelConflict') });
          return;
        }
        const errorData = await createResponse.json().catch(() => ({ message: pollMsg(interaction, 'unknownError') })) as {
          message?: string;
        };
        const msg =
          createResponse.status === 402 || createResponse.status === 403
            ? pollMsg(interaction, 'quotaOrForbidden')
            : `${pollMsg(interaction, 'createFailed')}: ${errorData.message || pollMsg(interaction, 'unknownError')}`;
        await interaction.editReply({ content: msg });
        return;
      }

      const poll = await createResponse.json() as { id: number };

      // Mesajı gönder
      const sendResponse = await fetch(`${apiBaseUrl}/api/Poll/${poll.id}/send`, {
        method: 'POST',
        headers: getBotApiHeaders(),
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json().catch(() => ({ message: 'Bilinmeyen hata' })) as {
          message?: string
          retryAfterSeconds?: number
        };
        if (sendResponse.status === 429) {
          const wait = typeof errorData.retryAfterSeconds === 'number' ? errorData.retryAfterSeconds : 45;
          await interaction.editReply({
            content: `Anket oluşturuldu ancak gönderim sınırına takıldı. ${wait} saniye sonra /poll ile tekrar deneyin veya panelden gönderin.\n${errorData.message || ''}`,
          });
          return;
        }
        await interaction.editReply({ content: `Anket oluşturuldu ancak gönderilemedi: ${errorData.message || 'Bilinmeyen hata'}` });
        return;
      }

      let response = `Anket başarıyla oluşturuldu ve gönderildi!\n\n`;
      response += `**Soru:** ${question}\n`;
      response += `**Seçenekler:** ${options.length}\n`;
      if (endAfterMinutes) response += `**Bitiş:** ${endAfterMinutes} dakika sonra\n`;
      if (endAfterVotes) response += `**Bitiş:** ${endAfterVotes} oydan sonra\n`;
      if (allowMultipleVotes) response += `**Mod:** Çoklu oy kullanımı aktif\n`;
      response += `\n**Not:** Daha fazla düzenleme için web arayüzünü kullanabilirsiniz.`;

      await interaction.editReply({ content: response });
    } catch (error) {
      console.error('[ERROR] Anket komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/poll:editReply', error, 'debug'));
    }
  },
};

