using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GoodbyeController : ControllerBase
{
    private readonly IGoodbyeService _goodbyeService;
    private readonly IDiscordAuthService _discordAuthService;

    public GoodbyeController(IGoodbyeService goodbyeService, IDiscordAuthService discordAuthService)
    {
        _goodbyeService = goodbyeService;
        _discordAuthService = discordAuthService;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<GoodbyeDto>>> GetAll()
    {
        var goodbyes = await _goodbyeService.GetAllGoodbyesAsync();
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(goodbyes);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var allowed = new HashSet<string>(userInfo.Guilds.Select(g => g.Id));
        return Ok(goodbyes.Where(g => allowed.Contains(g.GuildId)).ToList());
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<GoodbyeDto>> GetByGuildId(string guildId, [FromQuery] string language = "tr")
    {
        var goodbye = await _goodbyeService.GetGoodbyeByGuildIdAsync(guildId, language);
        if (goodbye == null)
            return NotFound($"Goodbye kaydı bulunamadı (GuildId: {guildId}, Language: {language})");

        return Ok(goodbye);
    }

    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<GoodbyeDto>> Create([FromBody] CreateGoodbyeDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var goodbye = await _goodbyeService.CreateGoodbyeAsync(createDto);
        return CreatedAtAction(nameof(GetByGuildId), new { guildId = goodbye.GuildId, language = goodbye.Language },
            goodbye);
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<GoodbyeDto>> Update(string guildId, [FromBody] UpdateGoodbyeDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var goodbye = await _goodbyeService.UpdateGoodbyeAsync(guildId, updateDto);
        if (goodbye == null)
            return NotFound($"Goodbye kaydı bulunamadı (GuildId: {guildId})");

        return Ok(goodbye);
    }

    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var result = await _goodbyeService.DeleteGoodbyeAsync(guildId);
        if (!result)
            return NotFound($"Goodbye kaydı bulunamadı (GuildId: {guildId})");

        return NoContent();
    }
}