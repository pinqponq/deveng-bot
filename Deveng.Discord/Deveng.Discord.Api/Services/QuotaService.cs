using Deveng.Discord.Api.Exceptions;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Limits;

namespace Deveng.Discord.Api.Services;

public sealed class QuotaService : IQuotaService
{
    /// <inheritdoc />
    public Task EnforceQuotaAsync(string guildId, string quotaKey, int currentCount)
    {
        _ = guildId;
        var limit = FeatureLimits.GetLimit(quotaKey);
        if (currentCount >= limit)
        {
            throw new FeatureLimitException(
                quotaKey, limit, currentCount,
                $"Bu özellik için sunucu kotası dolmuş ({currentCount}/{limit}).");
        }

        return Task.CompletedTask;
    }
}
