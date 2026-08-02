using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Deveng.Discord.Api.Controllers;

/// <summary>
///     Kimlik doğrulaması gerektirmeyen, panel vitrin/landing için.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
[EnableRateLimiting("public-read")]
public class PublicController : ControllerBase
{
    public const string ShowcaseGuildsRedisKey = "deveng:public:showcase-guilds:v1";

    private readonly IRedisCacheService _redis;

    public PublicController(IRedisCacheService redis)
    {
        _redis = redis;
    }

    /// <summary>
    ///     Botun periyodik olarak (~1 saat) Redis’e yazdığı sunucu listesi (simge, üye, banner URL).
    /// </summary>
    [HttpGet("showcase-guilds")]
    [ProducesResponseType(typeof(ShowcaseGuildsPayloadDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ShowcaseGuildsPayloadDto>> GetShowcaseGuilds(CancellationToken cancellationToken = default)
    {
        var data = await _redis.GetAsync<ShowcaseGuildsPayloadDto>(ShowcaseGuildsRedisKey, cancellationToken);
        if (data == null)
        {
            return Ok(new ShowcaseGuildsPayloadDto
            {
                UpdatedAt = null,
                TotalGuilds = 0,
                TotalMembersApprox = 0,
                Guilds = new List<ShowcaseGuildDto>()
            });
        }

        if (data.Guilds is null) data.Guilds = new List<ShowcaseGuildDto>();
        return Ok(data);
    }
}
