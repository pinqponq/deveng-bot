using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Models;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class PanelAuditLogService : IPanelAuditLogService
{
    private readonly DevengDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PanelAuditLogService(DevengDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    private static void EnrichActorFromHttpContext(CreatePanelAuditLogDto dto, HttpContext? http)
    {
        if (http == null) return;
        if (!string.Equals(dto.ActorType, "user", StringComparison.OrdinalIgnoreCase)) return;
        if (http.Items["DiscordUserInfo"] is not DiscordUserInfo ui) return;
        if (string.IsNullOrEmpty(dto.ActorUserId) ||
            !string.Equals(ui.UserId, dto.ActorUserId, StringComparison.Ordinal))
            return;

        if (string.IsNullOrWhiteSpace(dto.ActorUsernameSnapshot))
        {
            var display = !string.IsNullOrWhiteSpace(ui.GlobalName) ? ui.GlobalName!.Trim() : ui.Username.Trim();
            if (!string.IsNullOrWhiteSpace(display))
                dto.ActorUsernameSnapshot = display;
        }

        if (string.IsNullOrWhiteSpace(dto.ActorAvatarSnapshot) && !string.IsNullOrWhiteSpace(ui.AvatarHash))
            dto.ActorAvatarSnapshot = ui.AvatarHash.Trim();
    }

    public async Task<PanelAuditLogDto> CreateAsync(CreatePanelAuditLogDto dto)
    {
        EnrichActorFromHttpContext(dto, _httpContextAccessor.HttpContext);

        var log = new PanelAuditLog
        {
            GuildId = dto.GuildId,
            ActorType = dto.ActorType,
            ActorUserId = dto.ActorUserId,
            ActorUsernameSnapshot = dto.ActorUsernameSnapshot,
            ActorAvatarSnapshot = dto.ActorAvatarSnapshot,
            ActorRolesSnapshotJson = dto.ActorRolesSnapshotJson,
            Action = dto.Action,
            ResourceType = dto.ResourceType,
            ResourceId = dto.ResourceId,
            BeforeJson = AuditRedactor.ToRedactedJson(dto.Before),
            AfterJson = AuditRedactor.ToRedactedJson(dto.After),
            ChangedFieldsJson = dto.ChangedFieldsJson,
            RequestId = dto.RequestId,
            IpHash = dto.IpHash,
            UserAgentHash = dto.UserAgentHash,
            Result = dto.Result,
            ErrorCode = dto.ErrorCode,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.PanelAuditLogs.Add(log);
        await _db.SaveChangesAsync();
        return MapToDto(log);
    }

    public async Task<List<PanelAuditLogDto>> QueryAsync(string guildId, PanelAuditLogQueryDto query)
    {
        var limit = Math.Clamp(query.Limit, 1, 500);
        var q = _db.PanelAuditLogs.AsNoTracking().Where(l => l.GuildId == guildId);

        if (!string.IsNullOrWhiteSpace(query.Action))
            q = q.Where(l => l.Action == query.Action);
        if (!string.IsNullOrWhiteSpace(query.ResourceType))
            q = q.Where(l => l.ResourceType == query.ResourceType);
        if (!string.IsNullOrWhiteSpace(query.ActorUserId))
            q = q.Where(l => l.ActorUserId == query.ActorUserId);
        if (query.From.HasValue)
            q = q.Where(l => l.CreatedAtUtc >= query.From.Value);
        if (query.To.HasValue)
            q = q.Where(l => l.CreatedAtUtc <= query.To.Value);

        return await q.OrderByDescending(l => l.CreatedAtUtc)
            .Take(limit)
            .Select(l => MapToDto(l))
            .ToListAsync();
    }

    private static PanelAuditLogDto MapToDto(PanelAuditLog l) => new()
    {
        Id = l.Id,
        GuildId = l.GuildId,
        ActorType = l.ActorType,
        ActorUserId = l.ActorUserId,
        ActorUsernameSnapshot = l.ActorUsernameSnapshot,
        ActorAvatarSnapshot = l.ActorAvatarSnapshot,
        ActorRolesSnapshotJson = l.ActorRolesSnapshotJson,
        Action = l.Action,
        ResourceType = l.ResourceType,
        ResourceId = l.ResourceId,
        BeforeJson = l.BeforeJson,
        AfterJson = l.AfterJson,
        ChangedFieldsJson = l.ChangedFieldsJson,
        RequestId = l.RequestId,
        IpHash = l.IpHash,
        UserAgentHash = l.UserAgentHash,
        Result = l.Result,
        ErrorCode = l.ErrorCode,
        CreatedAtUtc = l.CreatedAtUtc
    };
}
