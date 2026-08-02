using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Utilities;
using Deveng.Discord.Infrastructure.Data;
using Deveng.Discord.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deveng.Discord.Api.Services;

public class PollService : IPollService
{
    private readonly DevengDbContext _db;

    public PollService(DevengDbContext db)
    {
        _db = db;
    }

    public async Task<PollDto?> GetPollByIdAsync(int id)
    {
        var poll = await PollGraphQuery().FirstOrDefaultAsync(p => p.Id == id);
        return poll == null ? null : MapToDto(poll);
    }

    public async Task<PollDto?> GetActivePollByChannelIdAsync(string channelId)
    {
        var poll = await PollGraphQuery()
            .Where(p => p.ChannelId == channelId && p.IsActive)
            .OrderBy(p => p.Id)
            .FirstOrDefaultAsync();
        return poll == null ? null : MapToDto(poll);
    }

    public async Task<int> GetActivePollCountByGuildIdAsync(string guildId) =>
        await _db.Polls.CountAsync(p => p.GuildId == guildId && p.IsActive);

    private static string? NormalizeCreatedVia(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "panel";
        var v = value.Trim().ToLowerInvariant();
        return v is "panel" or "slash" ? v : "panel";
    }

    public async Task<List<PollDto>> GetAllPollsByGuildIdAsync(string guildId, int offset = 0, int? limit = null)
    {
        IQueryable<Poll> query = PollGraphQuery()
            .Where(p => p.GuildId == guildId)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id);

        if (offset > 0)
            query = query.Skip(offset);
        if (limit.HasValue)
            query = query.Take(limit.Value);

        var polls = await query.ToListAsync();
        return polls.Select(MapToDto).ToList();
    }

    public async Task<PollDto> CreatePollAsync(CreatePollDto createDto)
    {
        var now = DateTime.UtcNow;
        var poll = new Poll
        {
            GuildId = createDto.GuildId,
            ChannelId = createDto.ChannelId,
            Question = createDto.Question,
            EndAfterMinutes = createDto.EndAfterMinutes,
            EndAfterVotes = createDto.EndAfterVotes,
            AllowMultipleVotes = createDto.AllowMultipleVotes,
            PollEmbedTitle = createDto.PollEmbedTitle,
            PollEmbedDescription = createDto.PollEmbedDescription,
            PollEmbedColor = createDto.PollEmbedColor,
            PollEmbedThumbnail = createDto.PollEmbedThumbnail,
            PollEmbedImage = createDto.PollEmbedImage,
            PollEmbedFooter = createDto.PollEmbedFooter,
            PollEmbedTitleUrl = createDto.PollEmbedTitleUrl,
            PollEmbedAuthorName = createDto.PollEmbedAuthorName,
            PollEmbedAuthorIcon = createDto.PollEmbedAuthorIcon,
            PollEmbedAuthorUrl = createDto.PollEmbedAuthorUrl,
            PollEmbedFooterIcon = createDto.PollEmbedFooterIcon,
            PollEmbedUseTimestamp = createDto.PollEmbedUseTimestamp,
            PollEmbedFieldsJson = createDto.PollEmbedFieldsJson,
            ResultEmbedTitle = createDto.ResultEmbedTitle,
            ResultEmbedDescription = createDto.ResultEmbedDescription,
            ResultEmbedColor = createDto.ResultEmbedColor,
            ResultEmbedThumbnail = createDto.ResultEmbedThumbnail,
            ResultEmbedImage = createDto.ResultEmbedImage,
            ResultEmbedFooter = createDto.ResultEmbedFooter,
            ResultEmbedTitleUrl = createDto.ResultEmbedTitleUrl,
            ResultEmbedAuthorName = createDto.ResultEmbedAuthorName,
            ResultEmbedAuthorIcon = createDto.ResultEmbedAuthorIcon,
            ResultEmbedAuthorUrl = createDto.ResultEmbedAuthorUrl,
            ResultEmbedFooterIcon = createDto.ResultEmbedFooterIcon,
            ResultEmbedUseTimestamp = createDto.ResultEmbedUseTimestamp,
            ResultEmbedFieldsJson = createDto.ResultEmbedFieldsJson,
            CreatedVia = NormalizeCreatedVia(createDto.CreatedVia),
            CreatedAt = now,
            UpdatedAt = now
        };

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.Polls.Add(poll);
        await _db.SaveChangesAsync();

        foreach (var option in createDto.Options)
        {
            _db.PollOptions.Add(new PollOption
            {
                PollId = poll.Id,
                OptionText = option.OptionText,
                Emoji = option.Emoji,
                OrderIndex = option.OrderIndex,
                CreatedAt = now
            });
        }

        foreach (var rolePermission in createDto.RolePermissions)
        {
            _db.PollRolePermissions.Add(new PollRolePermission
            {
                PollId = poll.Id,
                RoleId = rolePermission.RoleId,
                IsAllowed = rolePermission.IsAllowed,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetPollByIdAsync(poll.Id)
               ?? throw new InvalidOperationException("Oluşturulan anket bulunamadı");
    }

    public async Task<PollDto?> UpdatePollAsync(int id, UpdatePollDto updateDto)
    {
        var poll = await _db.Polls.FindAsync(id);
        if (poll == null) return null;

        if (updateDto.ChannelId != null) poll.ChannelId = updateDto.ChannelId;
        if (updateDto.Question != null) poll.Question = updateDto.Question;
        poll.EndAfterMinutes = updateDto.EndAfterMinutes;
        poll.EndAfterVotes = updateDto.EndAfterVotes;
        if (updateDto.AllowMultipleVotes.HasValue) poll.AllowMultipleVotes = updateDto.AllowMultipleVotes.Value;
        poll.PollEmbedTitle = updateDto.PollEmbedTitle;
        poll.PollEmbedDescription = updateDto.PollEmbedDescription;
        poll.PollEmbedColor = updateDto.PollEmbedColor;
        poll.PollEmbedThumbnail = updateDto.PollEmbedThumbnail;
        poll.PollEmbedImage = updateDto.PollEmbedImage;
        poll.PollEmbedFooter = updateDto.PollEmbedFooter;
        poll.PollEmbedTitleUrl = updateDto.PollEmbedTitleUrl;
        poll.PollEmbedAuthorName = updateDto.PollEmbedAuthorName;
        poll.PollEmbedAuthorIcon = updateDto.PollEmbedAuthorIcon;
        poll.PollEmbedAuthorUrl = updateDto.PollEmbedAuthorUrl;
        poll.PollEmbedFooterIcon = updateDto.PollEmbedFooterIcon;
        if (updateDto.PollEmbedUseTimestamp.HasValue) poll.PollEmbedUseTimestamp = updateDto.PollEmbedUseTimestamp.Value;
        poll.PollEmbedFieldsJson = updateDto.PollEmbedFieldsJson;
        poll.ResultEmbedTitle = updateDto.ResultEmbedTitle;
        poll.ResultEmbedDescription = updateDto.ResultEmbedDescription;
        poll.ResultEmbedColor = updateDto.ResultEmbedColor;
        poll.ResultEmbedThumbnail = updateDto.ResultEmbedThumbnail;
        poll.ResultEmbedImage = updateDto.ResultEmbedImage;
        poll.ResultEmbedFooter = updateDto.ResultEmbedFooter;
        poll.ResultEmbedTitleUrl = updateDto.ResultEmbedTitleUrl;
        poll.ResultEmbedAuthorName = updateDto.ResultEmbedAuthorName;
        poll.ResultEmbedAuthorIcon = updateDto.ResultEmbedAuthorIcon;
        poll.ResultEmbedAuthorUrl = updateDto.ResultEmbedAuthorUrl;
        poll.ResultEmbedFooterIcon = updateDto.ResultEmbedFooterIcon;
        if (updateDto.ResultEmbedUseTimestamp.HasValue) poll.ResultEmbedUseTimestamp = updateDto.ResultEmbedUseTimestamp.Value;
        poll.ResultEmbedFieldsJson = updateDto.ResultEmbedFieldsJson;
        poll.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetPollByIdAsync(id);
    }

    public async Task<bool> DeletePollAsync(int id)
    {
        if (await GetPollByIdAsync(id) == null)
            return false;

        var poll = await _db.Polls.FindAsync(id);
        if (poll == null) return false;

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.Polls.Remove(poll);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    public async Task<bool> UpdateMessageIdAsync(int id, string messageId)
    {
        var poll = await _db.Polls.FindAsync(id);
        if (poll == null) return false;

        poll.MessageId = messageId;
        poll.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EndPollAsync(int id)
    {
        var poll = await _db.Polls.FindAsync(id);
        if (poll == null) return false;

        poll.IsActive = false;
        poll.EndedAt = DateTime.UtcNow;
        poll.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddVoteAsync(int pollId, int optionId, string userId)
    {
        var poll = await _db.Polls.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pollId);
        if (poll == null) return false;

        var optionExists = await _db.PollOptions.AnyAsync(o => o.Id == optionId && o.PollId == pollId);
        if (!optionExists) return false;

        if (!poll.AllowMultipleVotes)
        {
            if (await _db.PollVotes.AnyAsync(v => v.PollId == pollId && v.UserId == userId))
                return false;
        }

        if (await _db.PollVotes.AnyAsync(v => v.PollId == pollId && v.OptionId == optionId && v.UserId == userId))
            return false;

        await using var tx = await _db.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        _db.PollVotes.Add(new PollVote
        {
            PollId = pollId,
            OptionId = optionId,
            UserId = userId,
            CreatedAt = now
        });

        var option = await _db.PollOptions.FirstAsync(o => o.Id == optionId);
        option.VoteCount++;

        var pollEntity = await _db.Polls.FirstAsync(p => p.Id == pollId);
        pollEntity.TotalVotes++;
        pollEntity.UpdatedAt = now;

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    public async Task<bool> RemoveVoteAsync(int pollId, int optionId, string userId)
    {
        var vote = await _db.PollVotes
            .FirstOrDefaultAsync(v => v.PollId == pollId && v.OptionId == optionId && v.UserId == userId);
        if (vote == null) return true;

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.PollVotes.Remove(vote);

        var option = await _db.PollOptions.FirstOrDefaultAsync(o => o.Id == optionId);
        if (option != null && option.VoteCount > 0)
            option.VoteCount--;

        var poll = await _db.Polls.FirstOrDefaultAsync(p => p.Id == pollId);
        if (poll != null && poll.TotalVotes > 0)
        {
            poll.TotalVotes--;
            poll.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    public async Task<PollResultDto?> GetPollResultAsync(int pollId)
    {
        var poll = await GetPollByIdAsync(pollId);
        if (poll == null)
            return null;

        var result = new PollResultDto
        {
            PollId = poll.Id,
            Question = poll.Question,
            TotalVotes = poll.TotalVotes,
            EndedAt = poll.EndedAt,
            AllowMultipleVotes = poll.AllowMultipleVotes
        };

        foreach (var option in poll.Options)
        {
            var percentage = poll.TotalVotes > 0
                ? (double)option.VoteCount / poll.TotalVotes * 100
                : 0;

            result.OptionResults.Add(new PollOptionResultDto
            {
                OptionId = option.Id,
                OptionText = option.OptionText,
                Emoji = option.Emoji,
                VoteCount = option.VoteCount,
                Percentage = Math.Round(percentage, 2)
            });
        }

        return result;
    }

    public async Task<List<int>> GetUserVotesForPollAsync(int pollId, string userId) =>
        await _db.PollVotes.AsNoTracking()
            .Where(v => v.PollId == pollId && v.UserId == userId)
            .Select(v => v.OptionId)
            .ToListAsync();

    private IQueryable<Poll> PollGraphQuery() =>
        _db.Polls.AsNoTracking()
            .Include(p => p.Options)
            .Include(p => p.RolePermissions);

    private static PollDto MapToDto(Poll p) => new()
    {
        Id = p.Id,
        GuildId = p.GuildId,
        ChannelId = p.ChannelId,
        MessageId = p.MessageId,
        Question = p.Question,
        IsActive = p.IsActive,
        EndedAt = p.EndedAt,
        EndAfterMinutes = p.EndAfterMinutes,
        EndAfterVotes = p.EndAfterVotes,
        AllowMultipleVotes = p.AllowMultipleVotes,
        TotalVotes = p.TotalVotes,
        PollEmbedTitle = p.PollEmbedTitle,
        PollEmbedDescription = p.PollEmbedDescription,
        PollEmbedColor = p.PollEmbedColor,
        PollEmbedThumbnail = p.PollEmbedThumbnail,
        PollEmbedImage = p.PollEmbedImage,
        PollEmbedFooter = p.PollEmbedFooter,
        PollEmbedTitleUrl = p.PollEmbedTitleUrl,
        PollEmbedAuthorName = p.PollEmbedAuthorName,
        PollEmbedAuthorIcon = p.PollEmbedAuthorIcon,
        PollEmbedAuthorUrl = p.PollEmbedAuthorUrl,
        PollEmbedFooterIcon = p.PollEmbedFooterIcon,
        PollEmbedUseTimestamp = p.PollEmbedUseTimestamp,
        PollEmbedFieldsJson = p.PollEmbedFieldsJson,
        ResultEmbedTitle = p.ResultEmbedTitle,
        ResultEmbedDescription = p.ResultEmbedDescription,
        ResultEmbedColor = p.ResultEmbedColor,
        ResultEmbedThumbnail = p.ResultEmbedThumbnail,
        ResultEmbedImage = p.ResultEmbedImage,
        ResultEmbedFooter = p.ResultEmbedFooter,
        ResultEmbedTitleUrl = p.ResultEmbedTitleUrl,
        ResultEmbedAuthorName = p.ResultEmbedAuthorName,
        ResultEmbedAuthorIcon = p.ResultEmbedAuthorIcon,
        ResultEmbedAuthorUrl = p.ResultEmbedAuthorUrl,
        ResultEmbedFooterIcon = p.ResultEmbedFooterIcon,
        ResultEmbedUseTimestamp = p.ResultEmbedUseTimestamp,
        ResultEmbedFieldsJson = p.ResultEmbedFieldsJson,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        CreatedVia = p.CreatedVia,
        Options = p.Options.OrderBy(o => o.OrderIndex).Select(o => new PollOptionDto
        {
            Id = o.Id,
            PollId = o.PollId,
            OptionText = o.OptionText,
            Emoji = o.Emoji,
            OrderIndex = o.OrderIndex,
            VoteCount = o.VoteCount,
            CreatedAt = o.CreatedAt
        }).ToList(),
        RolePermissions = p.RolePermissions.OrderBy(r => r.Id).Select(r => new PollRolePermissionDto
        {
            Id = r.Id,
            PollId = r.PollId,
            RoleId = r.RoleId,
            IsAllowed = r.IsAllowed,
            CreatedAt = r.CreatedAt
        }).ToList()
    };
}
