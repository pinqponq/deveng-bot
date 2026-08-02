import { GuildMember, TextChannel } from 'discord.js';
import { generateWelcomeCard } from './welcomeCard';
import { WelcomeData } from '../types/database';

export async function sendWelcomeCard(
  member: GuildMember,
  channel: TextChannel,
  welcomeData: WelcomeData
): Promise<void> {
  if (!welcomeData.sendWelcomeCard) {
    return;
  }

  // Özelleştirilmiş kart kontrolü
  const hasCustomization = !!(
    welcomeData.cardTitle || 
    welcomeData.cardUsernameText || 
    welcomeData.cardMemberText ||
    welcomeData.cardBackgroundColor1 ||
    welcomeData.cardBackgroundColor2 ||
    welcomeData.cardTextColor ||
    welcomeData.cardBorderColor
  );

  try {
    const welcomeCard = await generateWelcomeCard(
      member,
      hasCustomization ? {
        title: welcomeData.cardTitle,
        usernameText: welcomeData.cardUsernameText,
        memberText: welcomeData.cardMemberText,
        backgroundColor1: welcomeData.cardBackgroundColor1,
        backgroundColor2: welcomeData.cardBackgroundColor2,
        textColor: welcomeData.cardTextColor,
        borderColor: welcomeData.cardBorderColor,
      } : undefined
    );

    await channel.send({ files: [welcomeCard] });

    console.log(`[INFO] ${member.user.tag} için ${hasCustomization ? 'özelleştirilmiş ' : 'varsayılan '}karşılama kartı gönderildi.`);
  } catch (error) {
    console.error(`[ERROR] Karşılama kartı oluşturulamadı veya gönderilemedi:`, error);
  }
}

