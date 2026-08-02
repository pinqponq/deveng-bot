using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Deveng.Discord.Api.Services;

public class TicketPanelService : ITicketPanelService
{
    private const string FeatureName = "TicketPanel";
    private readonly DevengDbContext _db;
    private readonly IGuildFeatureService _guildFeatureService;
    private readonly ILogger<TicketPanelService> _logger;

    public TicketPanelService(
        DevengDbContext db,
        IGuildFeatureService guildFeatureService,
        ILogger<TicketPanelService> logger)
    {
        _db = db;
        _guildFeatureService = guildFeatureService;
        _logger = logger;
    }

    public async Task<TicketPanelDto?> GetTicketPanelByGuildIdAsync(string guildId)
    {
        var panel = await PanelGraphQuery()
            .FirstOrDefaultAsync(tp => tp.GuildId == guildId);
        if (panel == null) return null;

        return await EnrichPanelDtoAsync(MapToDto(panel));
    }

    public async Task<TicketPanelDto> CreateTicketPanelAsync(CreateTicketPanelDto createDto)
    {
        var now = DateTime.UtcNow;
        var panel = MapCreateToEntity(createDto, now);

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.TicketPanels.Add(panel);
        await _db.SaveChangesAsync();

        foreach (var roleId in createDto.RoleIds)
        {
            _db.TicketPanelRoles.Add(new TicketPanelRole
            {
                TicketPanelId = panel.Id,
                RoleId = roleId,
                CreatedAt = now
            });
        }

        if (createDto.TicketTypes.Count > 0)
        {
            foreach (var ticketTypeDto in createDto.TicketTypes)
            {
                _db.TicketTypes.Add(MapCreateTicketType(ticketTypeDto, panel.Id, now));
            }
        }
        else
        {
            // En az bir aktif tür garanti et; aksi halde panel Discord'da butonsuz görünür.
            _db.TicketTypes.Add(BuildDefaultTicketType(panel.Id, now));
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetTicketPanelByIdAsync(panel.Id)
               ?? await GetTicketPanelByGuildIdAsync(createDto.GuildId)
               ?? throw new InvalidOperationException(
                   "TicketPanel kaydı okunamadı; oluşturma sonrası yükleme başarısız.");
    }

    public async Task<TicketPanelDto?> UpdateTicketPanelAsync(string guildId, CreateTicketPanelDto updateDto)
    {
        var panel = await _db.TicketPanels
            .Include(tp => tp.Roles)
            .Include(tp => tp.TicketTypes)
            .FirstOrDefaultAsync(tp => tp.GuildId == guildId);
        if (panel == null) return null;

        await using var tx = await _db.Database.BeginTransactionAsync();
        ApplyPanelFields(panel, updateDto);
        panel.UpdatedAt = DateTime.UtcNow;

        _db.TicketPanelRoles.RemoveRange(panel.Roles);
        foreach (var roleId in updateDto.RoleIds)
        {
            _db.TicketPanelRoles.Add(new TicketPanelRole
            {
                TicketPanelId = panel.Id,
                RoleId = roleId,
                CreatedAt = DateTime.UtcNow
            });
        }

        _db.TicketTypes.RemoveRange(panel.TicketTypes);
        var now = DateTime.UtcNow;
        if (updateDto.TicketTypes.Count > 0)
        {
            foreach (var ticketTypeDto in updateDto.TicketTypes)
            {
                _db.TicketTypes.Add(MapCreateTicketType(ticketTypeDto, panel.Id, now));
            }
        }
        else
        {
            // En az bir aktif tür garanti et; aksi halde panel Discord'da butonsuz görünür.
            _db.TicketTypes.Add(BuildDefaultTicketType(panel.Id, now));
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetTicketPanelByIdAsync(panel.Id)
               ?? await GetTicketPanelByGuildIdAsync(guildId);
    }

    public async Task<bool> DeleteTicketPanelAsync(string guildId)
    {
        var panel = await _db.TicketPanels.FirstOrDefaultAsync(tp => tp.GuildId == guildId);
        if (panel == null) return false;

        _db.TicketPanels.Remove(panel);
        var rows = await _db.SaveChangesAsync();
        return await SpNonQuery.AfterDeleteWithExistsCheckAsync(rows,
            async () => await _db.TicketPanels.AnyAsync(tp => tp.GuildId == guildId));
    }

    public async Task<List<TicketPanelDto>> GetAllTicketPanelsAsync()
    {
        var panels = await (
            from tp in PanelGraphQuery()
            join gf in _db.GuildFeatures.AsNoTracking()
                on tp.GuildId equals gf.GuildId
            where gf.FeatureName == FeatureName && gf.IsEnabled
            orderby tp.Id
            select tp
        ).ToListAsync();

        return panels.Select(MapToDto).ToList();
    }

    private async Task<TicketPanelDto> EnrichPanelDtoAsync(TicketPanelDto dto)
    {
        try
        {
            dto.Enabled = await _guildFeatureService.IsFeatureEnabledAsync(dto.GuildId, FeatureName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Guild feature okunamadı (TicketPanel), Enabled=false kullanılıyor. GuildId={GuildId}",
                dto.GuildId);
            dto.Enabled = false;
        }

        return dto;
    }

    private async Task<TicketPanelDto?> GetTicketPanelByIdAsync(int ticketPanelId)
    {
        var panel = await PanelGraphQuery()
            .FirstOrDefaultAsync(tp => tp.Id == ticketPanelId);
        if (panel == null) return null;

        return await EnrichPanelDtoAsync(MapToDto(panel));
    }

    private IQueryable<TicketPanel> PanelGraphQuery() =>
        _db.TicketPanels.AsNoTracking()
            .Include(tp => tp.Roles)
            .Include(tp => tp.TicketTypes);

    private static TicketPanel MapCreateToEntity(CreateTicketPanelDto createDto, DateTime now) => new()
    {
        GuildId = createDto.GuildId,
        ChannelId = createDto.ChannelId,
        PanelMessage = createDto.PanelMessage,
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
        WelcomeMessage = createDto.WelcomeMessage,
        IsWelcomeEmbed = createDto.IsWelcomeEmbed,
        WelcomeEmbedTitle = createDto.WelcomeEmbedTitle,
        WelcomeEmbedDescription = createDto.WelcomeEmbedDescription,
        WelcomeEmbedColor = createDto.WelcomeEmbedColor,
        WelcomeEmbedThumbnail = createDto.WelcomeEmbedThumbnail,
        WelcomeEmbedImage = createDto.WelcomeEmbedImage,
        WelcomeEmbedFooter = createDto.WelcomeEmbedFooter,
        WelcomeEmbedTitleUrl = createDto.WelcomeEmbedTitleUrl,
        WelcomeEmbedAuthorName = createDto.WelcomeEmbedAuthorName,
        WelcomeEmbedAuthorIcon = createDto.WelcomeEmbedAuthorIcon,
        WelcomeEmbedAuthorUrl = createDto.WelcomeEmbedAuthorUrl,
        WelcomeEmbedFooterIcon = createDto.WelcomeEmbedFooterIcon,
        WelcomeEmbedUseTimestamp = createDto.WelcomeEmbedUseTimestamp,
        WelcomeEmbedFieldsJson = createDto.WelcomeEmbedFieldsJson,
        TranscriptChannelId = createDto.TranscriptChannelId,
        SendTranscriptToUser = createDto.SendTranscriptToUser,
        OpenCategoryId = createDto.OpenCategoryId,
        OpenCategoryName = createDto.OpenCategoryName,
        ClaimedCategoryId = createDto.ClaimedCategoryId,
        ClaimedCategoryName = createDto.ClaimedCategoryName,
        ClosedCategoryId = createDto.ClosedCategoryId,
        ClosedCategoryName = createDto.ClosedCategoryName,
        CreatedAt = now,
        UpdatedAt = now
    };

    private static void ApplyPanelFields(TicketPanel panel, CreateTicketPanelDto dto)
    {
        panel.ChannelId = dto.ChannelId;
        panel.PanelMessage = dto.PanelMessage;
        panel.IsEmbed = dto.IsEmbed;
        panel.EmbedTitle = dto.EmbedTitle;
        panel.EmbedDescription = dto.EmbedDescription;
        panel.EmbedColor = dto.EmbedColor;
        panel.EmbedThumbnail = dto.EmbedThumbnail;
        panel.EmbedImage = dto.EmbedImage;
        panel.EmbedFooter = dto.EmbedFooter;
        panel.EmbedTitleUrl = dto.EmbedTitleUrl;
        panel.EmbedAuthorName = dto.EmbedAuthorName;
        panel.EmbedAuthorIcon = dto.EmbedAuthorIcon;
        panel.EmbedAuthorUrl = dto.EmbedAuthorUrl;
        panel.EmbedFooterIcon = dto.EmbedFooterIcon;
        panel.EmbedUseTimestamp = dto.EmbedUseTimestamp;
        panel.EmbedFieldsJson = dto.EmbedFieldsJson;
        panel.WelcomeMessage = dto.WelcomeMessage;
        panel.IsWelcomeEmbed = dto.IsWelcomeEmbed;
        panel.WelcomeEmbedTitle = dto.WelcomeEmbedTitle;
        panel.WelcomeEmbedDescription = dto.WelcomeEmbedDescription;
        panel.WelcomeEmbedColor = dto.WelcomeEmbedColor;
        panel.WelcomeEmbedThumbnail = dto.WelcomeEmbedThumbnail;
        panel.WelcomeEmbedImage = dto.WelcomeEmbedImage;
        panel.WelcomeEmbedFooter = dto.WelcomeEmbedFooter;
        panel.WelcomeEmbedTitleUrl = dto.WelcomeEmbedTitleUrl;
        panel.WelcomeEmbedAuthorName = dto.WelcomeEmbedAuthorName;
        panel.WelcomeEmbedAuthorIcon = dto.WelcomeEmbedAuthorIcon;
        panel.WelcomeEmbedAuthorUrl = dto.WelcomeEmbedAuthorUrl;
        panel.WelcomeEmbedFooterIcon = dto.WelcomeEmbedFooterIcon;
        panel.WelcomeEmbedUseTimestamp = dto.WelcomeEmbedUseTimestamp;
        panel.WelcomeEmbedFieldsJson = dto.WelcomeEmbedFieldsJson;
        panel.TranscriptChannelId = dto.TranscriptChannelId;
        panel.SendTranscriptToUser = dto.SendTranscriptToUser;
        panel.OpenCategoryId = dto.OpenCategoryId;
        panel.OpenCategoryName = dto.OpenCategoryName;
        panel.ClaimedCategoryId = dto.ClaimedCategoryId;
        panel.ClaimedCategoryName = dto.ClaimedCategoryName;
        panel.ClosedCategoryId = dto.ClosedCategoryId;
        panel.ClosedCategoryName = dto.ClosedCategoryName;
    }

    private static TicketType BuildDefaultTicketType(int ticketPanelId, DateTime now) => new()
    {
        TicketPanelId = ticketPanelId,
        Type = 0,
        Label = "Talep Oluştur",
        Emoji = null,
        Style = 1,
        Placeholder = null,
        OrderIndex = 0,
        Enabled = true,
        CreatedAt = now
    };

    private static TicketType MapCreateTicketType(CreateTicketTypeDto dto, int ticketPanelId, DateTime now) => new()
    {
        TicketPanelId = ticketPanelId,
        Type = dto.Type,
        Label = dto.Label,
        Emoji = dto.Emoji,
        Style = dto.Style,
        Placeholder = dto.Placeholder,
        OrderIndex = dto.OrderIndex,
        OpenCategoryId = dto.OpenCategoryId,
        OpenCategoryName = dto.OpenCategoryName,
        ClaimedCategoryId = dto.ClaimedCategoryId,
        ClaimedCategoryName = dto.ClaimedCategoryName,
        ClosedCategoryId = dto.ClosedCategoryId,
        ClosedCategoryName = dto.ClosedCategoryName,
        Enabled = dto.Enabled,
        CreatedAt = now
    };

    private static TicketPanelDto MapToDto(TicketPanel panel) => new()
    {
        Id = panel.Id,
        GuildId = panel.GuildId,
        ChannelId = panel.ChannelId,
        MessageId = panel.MessageId,
        PanelMessage = panel.PanelMessage,
        IsEmbed = panel.IsEmbed,
        EmbedTitle = panel.EmbedTitle,
        EmbedDescription = panel.EmbedDescription,
        EmbedColor = panel.EmbedColor,
        EmbedThumbnail = panel.EmbedThumbnail,
        EmbedImage = panel.EmbedImage,
        EmbedFooter = panel.EmbedFooter,
        EmbedTitleUrl = panel.EmbedTitleUrl,
        EmbedAuthorName = panel.EmbedAuthorName,
        EmbedAuthorIcon = panel.EmbedAuthorIcon,
        EmbedAuthorUrl = panel.EmbedAuthorUrl,
        EmbedFooterIcon = panel.EmbedFooterIcon,
        EmbedUseTimestamp = panel.EmbedUseTimestamp,
        EmbedFieldsJson = panel.EmbedFieldsJson,
        WelcomeMessage = panel.WelcomeMessage,
        IsWelcomeEmbed = panel.IsWelcomeEmbed,
        WelcomeEmbedTitle = panel.WelcomeEmbedTitle,
        WelcomeEmbedDescription = panel.WelcomeEmbedDescription,
        WelcomeEmbedColor = panel.WelcomeEmbedColor,
        WelcomeEmbedThumbnail = panel.WelcomeEmbedThumbnail,
        WelcomeEmbedImage = panel.WelcomeEmbedImage,
        WelcomeEmbedFooter = panel.WelcomeEmbedFooter,
        WelcomeEmbedTitleUrl = panel.WelcomeEmbedTitleUrl,
        WelcomeEmbedAuthorName = panel.WelcomeEmbedAuthorName,
        WelcomeEmbedAuthorIcon = panel.WelcomeEmbedAuthorIcon,
        WelcomeEmbedAuthorUrl = panel.WelcomeEmbedAuthorUrl,
        WelcomeEmbedFooterIcon = panel.WelcomeEmbedFooterIcon,
        WelcomeEmbedUseTimestamp = panel.WelcomeEmbedUseTimestamp,
        WelcomeEmbedFieldsJson = panel.WelcomeEmbedFieldsJson,
        TranscriptChannelId = panel.TranscriptChannelId,
        SendTranscriptToUser = panel.SendTranscriptToUser,
        OpenCategoryId = panel.OpenCategoryId,
        OpenCategoryName = panel.OpenCategoryName,
        ClaimedCategoryId = panel.ClaimedCategoryId,
        ClaimedCategoryName = panel.ClaimedCategoryName,
        ClosedCategoryId = panel.ClosedCategoryId,
        ClosedCategoryName = panel.ClosedCategoryName,
        Enabled = false,
        RoleIds = panel.Roles.Select(r => r.RoleId).ToList(),
        TicketTypes = panel.TicketTypes.OrderBy(t => t.OrderIndex).Select(t => new TicketTypeDto
        {
            Id = t.Id,
            Type = t.Type,
            Label = t.Label,
            Emoji = t.Emoji,
            Style = t.Style,
            Placeholder = t.Placeholder,
            OrderIndex = t.OrderIndex,
            OpenCategoryId = t.OpenCategoryId,
            OpenCategoryName = t.OpenCategoryName,
            ClaimedCategoryId = t.ClaimedCategoryId,
            ClaimedCategoryName = t.ClaimedCategoryName,
            ClosedCategoryId = t.ClosedCategoryId,
            ClosedCategoryName = t.ClosedCategoryName,
            Enabled = t.Enabled
        }).ToList()
    };
}
