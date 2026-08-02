import { GuildMember, AttachmentBuilder } from 'discord.js';
import sharp from 'sharp';
import { replacePlaceholders } from './helpers';
import { CARD_WIDTH, CARD_HEIGHT, CARD_AVATAR_SIZE } from './constants';
import { escapeSvgText } from './svgHelper';

export async function generateWelcomeCard(
  member: GuildMember,
  cardData?: {
    title?: string | null;
    usernameText?: string | null;
    memberText?: string | null;
    backgroundColor1?: string | null;
    backgroundColor2?: string | null;
    textColor?: string | null;
    borderColor?: string | null;
  }
): Promise<AttachmentBuilder> {
  // Kart boyutları
  const width = CARD_WIDTH;
  const height = CARD_HEIGHT;

  // Varsayılan değerler
  const title = cardData?.title || 'Hoşgeldin!';
  const usernameText = cardData?.usernameText || '{user}';
  const memberText = cardData?.memberText || '{count}. üye';
  const bgColor1 = cardData?.backgroundColor1 || '#5865F2';
  const bgColor2 = cardData?.backgroundColor2 || '#2C2F33';
  const textColor = cardData?.textColor || '#FFFFFF';
  const borderColor = cardData?.borderColor || '#FFFFFF';

  try {
    // Avatar'ı yükle
    const avatarResponse = await fetch(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());
    
    // Avatar'ı yuvarlak yap ve resize et
    const avatarRadius = CARD_AVATAR_SIZE / 2;
    const roundedAvatar = await sharp(avatarBuffer)
      .resize(CARD_AVATAR_SIZE, CARD_AVATAR_SIZE)
      .composite([{
        input: Buffer.from(`
          <svg width="${CARD_AVATAR_SIZE}" height="${CARD_AVATAR_SIZE}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${avatarRadius}" cy="${avatarRadius}" r="${avatarRadius}" fill="white"/>
          </svg>
        `),
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();

    // Placeholder'ları değiştir
    const finalTitle = replacePlaceholders(title, {
      user: member.user.username,
      username: member.user.username,
      tag: member.user.tag,
      serverName: member.guild.name,
      count: member.guild.memberCount.toString(),
      memberCount: member.guild.memberCount.toString(),
    });
    
    const finalUsernameText = replacePlaceholders(usernameText, {
      user: member.user.username,
      username: member.user.username,
      tag: member.user.tag,
    });
    
    const finalMemberText = replacePlaceholders(memberText, {
      count: member.guild.memberCount.toString(),
      memberCount: member.guild.memberCount.toString(),
    });

    // SVG template oluştur
    const titleEscaped = escapeSvgText(finalTitle);
    const usernameEscaped = escapeSvgText(finalUsernameText);
    const memberEscaped = escapeSvgText(finalMemberText);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${bgColor2};stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Arka plan -->
        <rect width="${width}" height="${height}" fill="url(#grad)"/>
        
        <!-- Üst kenar çizgisi -->
        <rect width="${width}" height="5" fill="${borderColor}"/>
        
        <!-- Kullanıcı avatarı için yuvarlak arka plan -->
        <circle cx="${avatarRadius * 2}" cy="${height / 2}" r="${avatarRadius}" fill="#FFFFFF"/>
        
        <!-- Başlık metni -->
        <text x="350" y="${height / 2 - 40}" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="${textColor}">${titleEscaped}</text>
        
        <!-- Kullanıcı adı metni -->
        <text x="350" y="${height / 2 + 30}" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${textColor}">${usernameEscaped}</text>
        
        <!-- Sunucu bilgisi metni -->
        <text x="350" y="${height / 2 + 90}" font-family="Arial, sans-serif" font-size="36" fill="${textColor}" opacity="0.8">${memberEscaped}</text>
      </svg>
    `;

    // SVG'yi PNG'ye çevir
    const baseImage = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    // Avatar'ı ana görsele ekle
    const avatarLeft = avatarRadius;
    const avatarTop = height / 2 - avatarRadius;
    const finalImage = await sharp(baseImage)
      .composite([{
        input: roundedAvatar,
        left: avatarLeft,
        top: avatarTop
      }])
      .png()
      .toBuffer();

    return new AttachmentBuilder(finalImage, { name: 'welcome-card.png' });
  } catch (error) {
    console.error('[ERROR] Karşılama kartı oluşturulurken hata:', error);
    // Hata durumunda basit bir SVG oluştur
    const usernameEscaped = escapeSvgText(member.user.username);
    const finalTitleFallback = replacePlaceholders(title, {
      user: member.user.username,
      username: member.user.username,
      tag: member.user.tag,
      serverName: member.guild.name,
      count: member.guild.memberCount.toString(),
      memberCount: member.guild.memberCount.toString(),
    });
    const titleEscapedFallback = escapeSvgText(finalTitleFallback);
    const fallbackSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${bgColor1}"/>
        <text x="${width / 2}" y="${height / 2}" font-family="Arial" font-size="40" fill="${textColor}" text-anchor="middle">${titleEscapedFallback} ${usernameEscaped}!</text>
      </svg>
    `;
    const fallbackImage = await sharp(Buffer.from(fallbackSvg)).png().toBuffer();
    return new AttachmentBuilder(fallbackImage, { name: 'welcome-card.png' });
  }
}
