using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class ReactionRoleService : IReactionRoleService
{
    private const string FeatureName = "ReactionRole";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;

    public ReactionRoleService(DevengDbContext db, IGuildFeatureService guildFeatureService)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
    }

    public async Task<List<ReactionRoleDto>> GetReactionRolesByGuildIdAsync(string guildId)
    {
        var list = await ReactionRoleGraphQuery()
            .Where(r => r.GuildId == guildId)
            .OrderBy(r => r.Id)
            .ToListAsync();

        var result = new List<ReactionRoleDto>();
        foreach (var entity in list)
            result.Add(await MapToDtoAsync(entity));
        return result;
    }

    public async Task<ReactionRoleDto?> GetReactionRoleByIdAsync(int id)
    {
        var entity = await ReactionRoleGraphQuery()
            .FirstOrDefaultAsync(r => r.Id == id);
        return entity == null ? null : await MapToDtoAsync(entity);
    }

    public async Task<ReactionRoleDto> CreateReactionRoleAsync(CreateReactionRoleDto createDto)
    {
        var now = DateTime.UtcNow;
        var reactionRole = new ReactionRole
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            NormalMessage = createDto.NormalMessage,
            IsEmbed = createDto.IsEmbed,
            EmbedTitle = createDto.EmbedTitle,
            EmbedDescription = createDto.EmbedDescription,
            EmbedColor = createDto.EmbedColor,
            EmbedThumbnail = createDto.EmbedThumbnail,
            EmbedImage = createDto.EmbedImage,
            EmbedFooter = createDto.EmbedFooter,
            EmbedTitleUrl = createDto.EmbedTitleUrl,
            EmbedAuthorName = createDto.EmbedAuthorName,
            EmbedAuthorIcon = createDto.EmbedAuthorIcon,
            EmbedAuthorUrl = createDto.EmbedAuthorUrl,
            EmbedFooterIcon = createDto.EmbedFooterIcon,
            EmbedUseTimestamp = createDto.EmbedUseTimestamp,
            EmbedFieldsJson = createDto.EmbedFieldsJson,
            EnableEmoji = createDto.EnableEmoji,
            EnableButton = createDto.EnableButton,
            EnableMenu = createDto.EnableMenu,
            CreatedAt = now,
            UpdatedAt = now
        };

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.ReactionRoles.Add(reactionRole);
        await _db.SaveChangesAsync();

        AddChildEntities(reactionRole.Id, createDto, now);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetReactionRoleByIdAsync(reactionRole.Id)
               ?? throw new InvalidOperationException("ReactionRole kaydı oluşturulamadı");
    }

    public async Task<ReactionRoleDto?> UpdateReactionRoleAsync(string guildId, int id, CreateReactionRoleDto updateDto)
    {
        var reactionRole = await _db.ReactionRoles
            .Include(r => r.Emojis)
            .Include(r => r.Buttons)
            .Include(r => r.Menus)
            .ThenInclude(m => m.Options)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (reactionRole == null || reactionRole.GuildId != guildId || updateDto.GuildId != guildId)
            return null;

        await using var tx = await _db.Database.BeginTransactionAsync();

        reactionRole.ChannelId = updateDto.ChannelId;
        reactionRole.NormalMessage = updateDto.NormalMessage;
        reactionRole.IsEmbed = updateDto.IsEmbed;
        reactionRole.EmbedTitle = updateDto.EmbedTitle;
        reactionRole.EmbedDescription = updateDto.EmbedDescription;
        reactionRole.EmbedColor = updateDto.EmbedColor;
        reactionRole.EmbedThumbnail = updateDto.EmbedThumbnail;
        reactionRole.EmbedImage = updateDto.EmbedImage;
        reactionRole.EmbedFooter = updateDto.EmbedFooter;
        reactionRole.EmbedTitleUrl = updateDto.EmbedTitleUrl;
        reactionRole.EmbedAuthorName = updateDto.EmbedAuthorName;
        reactionRole.EmbedAuthorIcon = updateDto.EmbedAuthorIcon;
        reactionRole.EmbedAuthorUrl = updateDto.EmbedAuthorUrl;
        reactionRole.EmbedFooterIcon = updateDto.EmbedFooterIcon;
        reactionRole.EmbedUseTimestamp = updateDto.EmbedUseTimestamp;
        reactionRole.EmbedFieldsJson = updateDto.EmbedFieldsJson;
        reactionRole.MessageId = updateDto.MessageId;
        reactionRole.EnableEmoji = updateDto.EnableEmoji;
        reactionRole.EnableButton = updateDto.EnableButton;
        reactionRole.EnableMenu = updateDto.EnableMenu;
        reactionRole.UpdatedAt = DateTime.UtcNow;

        _db.ReactionRoleEmojis.RemoveRange(reactionRole.Emojis);
        _db.ReactionRoleButtons.RemoveRange(reactionRole.Buttons);
        foreach (var menu in reactionRole.Menus)
            _db.ReactionRoleMenuOptions.RemoveRange(menu.Options);
        _db.ReactionRoleMenus.RemoveRange(reactionRole.Menus);

        var now = DateTime.UtcNow;
        AddChildEntities(id, updateDto, now);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetReactionRoleByIdAsync(id);
    }

    public async Task<bool> DeleteReactionRoleAsync(string guildId, int id)
    {
        var reactionRole = await _db.ReactionRoles.FirstOrDefaultAsync(r => r.Id == id && r.GuildId == guildId);
        if (reactionRole == null) return false;

        _db.ReactionRoles.Remove(reactionRole);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => await _db.ReactionRoles.AnyAsync(r => r.Id == id));
    }

    public async Task<List<ReactionRoleDto>> GetAllReactionRolesAsync()
    {
        var list = await ReactionRoleGraphQuery()
            .OrderBy(r => r.Id)
            .ToListAsync();

        var result = new List<ReactionRoleDto>();
        foreach (var entity in list)
            result.Add(await MapToDtoAsync(entity));
        return result;
    }

    private IQueryable<ReactionRole> ReactionRoleGraphQuery() =>
        _db.ReactionRoles.AsNoTracking()
            .Include(r => r.Emojis)
            .Include(r => r.Buttons)
            .Include(r => r.Menus)
            .ThenInclude(m => m.Options);

    private void AddChildEntities(int reactionRoleId, CreateReactionRoleDto dto, DateTime now)
    {
        foreach (var emojiDto in dto.Emojis)
        {
            _db.ReactionRoleEmojis.Add(new ReactionRoleEmoji
            {
                ReactionRoleId = reactionRoleId,
                Emoji = emojiDto.Emoji,
                RoleId = emojiDto.RoleId,
                OrderIndex = emojiDto.OrderIndex,
                Enabled = emojiDto.Enabled,
                CreatedAt = now
            });
        }

        foreach (var buttonDto in dto.Buttons)
        {
            _db.ReactionRoleButtons.Add(new ReactionRoleButton
            {
                ReactionRoleId = reactionRoleId,
                Label = buttonDto.Label,
                Emoji = buttonDto.Emoji,
                RoleId = buttonDto.RoleId,
                Style = buttonDto.Style,
                OrderIndex = buttonDto.OrderIndex,
                Enabled = buttonDto.Enabled,
                CreatedAt = now
            });
        }

        foreach (var menuDto in dto.Menus)
        {
            var menu = new ReactionRoleMenu
            {
                ReactionRoleId = reactionRoleId,
                Placeholder = menuDto.Placeholder,
                MinValues = menuDto.MinValues,
                MaxValues = menuDto.MaxValues,
                Enabled = menuDto.Enabled,
                CreatedAt = now
            };
            foreach (var optionDto in menuDto.Options)
            {
                menu.Options.Add(new ReactionRoleMenuOption
                {
                    Label = optionDto.Label,
                    Description = optionDto.Description,
                    RoleId = optionDto.RoleId,
                    Emoji = optionDto.Emoji,
                    OrderIndex = optionDto.OrderIndex,
                    Enabled = optionDto.Enabled,
                    CreatedAt = now
                });
            }
            _db.ReactionRoleMenus.Add(menu);
        }
    }

    private async Task<ReactionRoleDto> MapToDtoAsync(ReactionRole r)
    {
        var dto = new ReactionRoleDto
        {
            Id = r.Id,
            GuildId = r.GuildId,
            ChannelId = r.ChannelId,
            NormalMessage = r.NormalMessage,
            IsEmbed = r.IsEmbed,
            EmbedTitle = r.EmbedTitle,
            EmbedDescription = r.EmbedDescription,
            EmbedColor = r.EmbedColor,
            EmbedThumbnail = r.EmbedThumbnail,
            EmbedImage = r.EmbedImage,
            EmbedFooter = r.EmbedFooter,
            EmbedTitleUrl = r.EmbedTitleUrl,
            EmbedAuthorName = r.EmbedAuthorName,
            EmbedAuthorIcon = r.EmbedAuthorIcon,
            EmbedAuthorUrl = r.EmbedAuthorUrl,
            EmbedFooterIcon = r.EmbedFooterIcon,
            EmbedUseTimestamp = r.EmbedUseTimestamp,
            EmbedFieldsJson = r.EmbedFieldsJson,
            MessageId = r.MessageId,
            Enabled = await _guildFeatureService.IsFeatureEnabledAsync(r.GuildId, FeatureName),
            EnableEmoji = r.EnableEmoji,
            EnableButton = r.EnableButton,
            EnableMenu = r.EnableMenu,
            Emojis = r.Emojis.OrderBy(e => e.OrderIndex).Select(e => new ReactionRoleEmojiDto
            {
                Id = e.Id,
                Emoji = e.Emoji,
                RoleId = e.RoleId,
                OrderIndex = e.OrderIndex,
                Enabled = e.Enabled
            }).ToList(),
            Buttons = r.Buttons.OrderBy(b => b.OrderIndex).Select(b => new ReactionRoleButtonDto
            {
                Id = b.Id,
                Label = b.Label,
                Emoji = b.Emoji,
                RoleId = b.RoleId,
                Style = b.Style,
                OrderIndex = b.OrderIndex,
                Enabled = b.Enabled
            }).ToList(),
            Menus = r.Menus.Select(m => new ReactionRoleMenuDto
            {
                Id = m.Id,
                Placeholder = m.Placeholder,
                MinValues = m.MinValues,
                MaxValues = m.MaxValues,
                Enabled = m.Enabled,
                Options = m.Options.OrderBy(o => o.OrderIndex).Select(o => new ReactionRoleMenuOptionDto
                {
                    Id = o.Id,
                    Label = o.Label,
                    Description = o.Description,
                    RoleId = o.RoleId,
                    Emoji = o.Emoji,
                    OrderIndex = o.OrderIndex,
                    Enabled = o.Enabled
                }).ToList()
            }).ToList()
        };
        return dto;
    }
}
