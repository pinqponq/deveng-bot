import { GuildMember } from 'discord.js';
import { WelcomeData } from '../types/database';
import { replaceWelcomePlaceholders } from './placeholders';
import { createDMEmbed } from './embedBuilder';
import { generateWelcomeCard } from './welcomeCard';

/**
 * Özel mesaj (DM) gönderme yardımcı fonksiyonları
 */

export async function sendWelcomeDM(
  member: GuildMember,
  welcomeData: WelcomeData
): Promise<void> {
  if (!welcomeData.sendDM) {
    return;
  }

  if (!welcomeData.dmMessage) {
    console.log(`[INFO] ${member.user.tag} için DM mesajı gönderilmedi (DMMessage boş).`);
    return;
  }

  try {
    // DM kart açıksa tek çıktı kart olsun; aynı eventte ikinci DM gönderme.
    if (welcomeData.sendDMCard) {
      await sendWelcomeDMCard(member, welcomeData);
      console.log(`[INFO] ${member.user.tag} için DM kart modu aktif, ek DM mesajı gönderimi atlandı.`);
      return;
    }

    // \n karakterlerini düzgün işle (veritabanından \\n olarak gelebilir)
    const processedDMMessage = (welcomeData.dmMessage || '').replace(/\\n/g, '\n');
    
    // Placeholder'ları değiştir
    const finalDMMessage = replaceWelcomePlaceholders(member, processedDMMessage);

    // Embed veya normal mesaj olarak gönder (tek DM)
    if (welcomeData.isDMEmbed) {
      const embed = createDMEmbed(member, welcomeData, finalDMMessage);
      await member.send({ embeds: [embed] });
    } else {
      await member.send(finalDMMessage);
    }

    console.log(`[INFO] ${member.user.tag} için özel mesaj gönderildi (Embed: ${welcomeData.isDMEmbed}, Card: ${welcomeData.sendDMCard}).`);
  } catch (error) {
    // Kullanıcı DM'leri kapalı olabilir, bu normal bir durum
    if (error instanceof Error && error.message.includes('Cannot send messages to this user')) {
      console.log(`[INFO] ${member.user.tag} için özel mesaj gönderilemedi (DM'ler kapalı).`);
    } else {
      console.error(`[ERROR] Özel mesaj gönderilemedi:`, error);
    }
  }
}

export async function sendWelcomeDMCard(
  member: GuildMember,
  welcomeData: WelcomeData
): Promise<void> {
  if (!welcomeData.sendDMCard) {
    return;
  }

  // Özelleştirilmiş DM kart kontrolü
  const hasCustomization = !!(
    welcomeData.dmCardTitle || 
    welcomeData.dmCardUsernameText || 
    welcomeData.dmCardMemberText ||
    welcomeData.dmCardBackgroundColor1 ||
    welcomeData.dmCardBackgroundColor2 ||
    welcomeData.dmCardTextColor ||
    welcomeData.dmCardBorderColor
  );

  try {
    const welcomeCard = await generateWelcomeCard(
      member,
      hasCustomization ? {
        title: welcomeData.dmCardTitle,
        usernameText: welcomeData.dmCardUsernameText,
        memberText: welcomeData.dmCardMemberText,
        backgroundColor1: welcomeData.dmCardBackgroundColor1,
        backgroundColor2: welcomeData.dmCardBackgroundColor2,
        textColor: welcomeData.dmCardTextColor,
        borderColor: welcomeData.dmCardBorderColor,
      } : undefined
    );

    await member.send({ files: [welcomeCard] });

    console.log(`[INFO] ${member.user.tag} için ${hasCustomization ? 'özelleştirilmiş ' : 'varsayılan '}DM karşılama kartı gönderildi.`);
  } catch (error) {
    // Kullanıcı DM'leri kapalı olabilir, bu normal bir durum
    if (error instanceof Error && error.message.includes('Cannot send messages to this user')) {
      console.log(`[INFO] ${member.user.tag} için DM karşılama kartı gönderilemedi (DM'ler kapalı).`);
    } else {
      console.error(`[ERROR] DM karşılama kartı oluşturulamadı veya gönderilemedi:`, error);
    }
  }
}

