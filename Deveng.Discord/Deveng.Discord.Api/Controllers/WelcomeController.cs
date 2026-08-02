using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WelcomeController : ControllerBase
{
    private readonly IWelcomeService _welcomeService;
    private readonly IDiscordAuthService _discordAuthService;

    public WelcomeController(IWelcomeService welcomeService, IDiscordAuthService discordAuthService)
    {
        _welcomeService = welcomeService;
        _discordAuthService = discordAuthService;
    }

    private string? GetBearerToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    /// <summary>
    ///     Tüm welcome kayıtlarını getirir
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<WelcomeDto>>> GetAll()
    {
        var welcomes = await _welcomeService.GetAllWelcomesAsync();
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
            return Ok(welcomes);

        var token = GetBearerToken();
        if (string.IsNullOrEmpty(token)) return Unauthorized();
        var userInfo = await _discordAuthService.ValidateTokenAsync(token, true);
        if (userInfo == null) return Unauthorized();
        var allowed = new HashSet<string>(userInfo.Guilds.Select(g => g.Id));
        return Ok(welcomes.Where(w => allowed.Contains(w.GuildId)).ToList());
    }

    /// <summary>
    ///     Guild ID ve dil ile welcome kaydını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<WelcomeDto>> GetByGuildId(string guildId, [FromQuery] string language = "tr")
    {
        var welcome = await _welcomeService.GetWelcomeByGuildIdAsync(guildId, language);
        if (welcome == null)
            return NotFound($"Welcome kaydı bulunamadı (GuildId: {guildId}, Language: {language})");

        return Ok(welcome);
    }

    /// <summary>
    ///     Yeni welcome kaydı oluşturur
    /// </summary>
    [DiscordAuth]
    [HttpPost]
    public async Task<ActionResult<WelcomeDto>> Create([FromBody] CreateWelcomeDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var welcome = await _welcomeService.CreateWelcomeAsync(createDto);
        return CreatedAtAction(nameof(GetByGuildId), new { guildId = welcome.GuildId, language = welcome.Language },
            welcome);
    }

    /// <summary>
    ///     Welcome kaydını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<WelcomeDto>> Update(string guildId, [FromBody] UpdateWelcomeDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var welcome = await _welcomeService.UpdateWelcomeAsync(guildId, updateDto);
        if (welcome == null)
            return NotFound($"Welcome kaydı bulunamadı (GuildId: {guildId})");

        return Ok(welcome);
    }

    /// <summary>
    ///     Welcome kaydını siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var result = await _welcomeService.DeleteWelcomeAsync(guildId);
        if (!result)
            return NotFound($"Welcome kaydı bulunamadı (GuildId: {guildId})");

        return NoContent();
    }
}