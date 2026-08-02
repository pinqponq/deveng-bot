using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Deveng.Discord.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GuildController : ControllerBase
{
    private readonly IGuildService _guildService;
    private readonly IGuildFeatureService _guildFeatureService;

    public GuildController(IGuildService guildService, IGuildFeatureService guildFeatureService)
    {
        _guildService = guildService;
        _guildFeatureService = guildFeatureService;
    }

    /// <summary>
    /// Panel: yalnızca OAuth kullanıcının üye olduğu sunucular. Bot token: tam liste (iç operasyon).
    /// requireGuildPermission=false: rotada guildId yok; includeGuilds=true: liste filtrelemek için Discord /users/@me/guilds gerekli.
    /// </summary>
    [DiscordAuth(requireGuildPermission: false, includeGuilds: true)]
    [HttpGet]
    public async Task<ActionResult<List<GuildDto>>> GetAll()
    {
        if (HttpContext.Items.TryGetValue("DiscordAuthIsBot", out var isBot) && isBot is true)
            return Ok(await _guildService.GetAllGuildsAsync());

        if (HttpContext.Items["DiscordUserGuilds"] is not List<DiscordGuildInfo> userGuilds || userGuilds.Count == 0)
            return Ok(new List<GuildDto>());

        var filtered = await _guildService.GetGuildsForDiscordUserGuildIdsAsync(userGuilds.ConvertAll(static g => g.Id));
        return Ok(filtered);
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<GuildDto>> GetByGuildId(string guildId)
    {
        var guild = await _guildService.GetGuildByGuildIdAsync(guildId);
        if (guild == null)
            return NotFound($"Guild kaydı bulunamadı (GuildId: {guildId})");

        return Ok(guild);
    }

    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<GuildDto>> Create([FromBody] CreateGuildDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var guild = await _guildService.CreateGuildAsync(createDto);
            return CreatedAtAction(nameof(GetByGuildId), new { guildId = guild.GuildId }, guild);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message, guildId = createDto.GuildId });
        }
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<GuildDto>> Update(string guildId, [FromBody] UpdateGuildDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var guild = await _guildService.UpdateGuildAsync(guildId, updateDto);
        if (guild == null)
            return NotFound($"Guild kaydı bulunamadı (GuildId: {guildId})");

        return Ok(guild);
    }

    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var result = await _guildService.DeleteGuildAsync(guildId);
        if (!result)
            return NotFound($"Guild kaydı bulunamadı (GuildId: {guildId})");

        await _guildFeatureService.InvalidateGuildFeaturesCacheAsync(guildId);
        return NoContent();
    }
}