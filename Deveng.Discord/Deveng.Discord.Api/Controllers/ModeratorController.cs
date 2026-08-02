using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModeratorController : ControllerBase
{
    private readonly IModeratorService _moderatorService;
    private readonly IPanelAuditLogService _panelAuditLogService;

    public ModeratorController(IModeratorService moderatorService, IPanelAuditLogService panelAuditLogService)
    {
        _moderatorService = moderatorService;
        _panelAuditLogService = panelAuditLogService;
    }

    /// <summary>
    ///     Tüm moderator kayıtlarını getirir (bot: tam liste; kullanıcı: yalnızca kendi sunucusu)
    /// </summary>
    [DiscordAuth(false)]
    [HttpGet]
    public async Task<ActionResult<List<ModeratorDto>>> GetAll([FromQuery] string? guildId)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is true)
        {
            var moderators = await _moderatorService.GetAllModeratorsAsync();
            return Ok(moderators);
        }

        if (string.IsNullOrWhiteSpace(guildId))
            return BadRequest(new { message = "guildId sorgu parametresi zorunludur." });

        var moderator = await _moderatorService.GetModeratorByGuildIdAsync(guildId.Trim());
        return Ok(moderator == null ? new List<ModeratorDto>() : new List<ModeratorDto> { moderator });
    }

    /// <summary>
    ///     Guild ID ile moderator kaydını getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<ModeratorDto>> GetByGuildId(string guildId)
    {
        var moderator = await _moderatorService.GetModeratorByGuildIdAsync(guildId);
        if (moderator == null)
            return NotFound($"Moderator kaydı bulunamadı (GuildId: {guildId})");

        return Ok(moderator);
    }

    /// <summary>
    ///     Yeni moderator kaydı oluşturur veya günceller
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<ModeratorDto>> CreateOrUpdate(string guildId,
        [FromBody] CreateModeratorDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var before = await _moderatorService.GetModeratorByGuildIdAsync(guildId);
        var moderator = await _moderatorService.CreateOrUpdateModeratorAsync(guildId, createDto);
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "moderator.upsert", "Moderator", guildId, before, moderator));
        return Ok(moderator);
    }

    /// <summary>
    ///     Moderator kaydını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}")]
    public async Task<ActionResult<ModeratorDto>> Update(string guildId, [FromBody] UpdateModeratorDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var before = await _moderatorService.GetModeratorByGuildIdAsync(guildId);
        var moderator = await _moderatorService.UpdateModeratorAsync(guildId, updateDto);
        if (moderator == null)
            return NotFound($"Moderator kaydı bulunamadı (GuildId: {guildId})");

        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "moderator.update", "Moderator", guildId, before, moderator));
        return Ok(moderator);
    }

    /// <summary>
    ///     Moderator kaydını siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}")]
    public async Task<IActionResult> Delete(string guildId)
    {
        var before = await _moderatorService.GetModeratorByGuildIdAsync(guildId);
        var result = await _moderatorService.DeleteModeratorAsync(guildId);
        if (!result)
            return NotFound($"Moderator kaydı bulunamadı (GuildId: {guildId})");

        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "moderator.delete", "Moderator", guildId, before, null));
        return NoContent();
    }

    /// <summary>
    ///     Moderator kuralını günceller
    /// </summary>
    [DiscordAuth]
    [HttpPut("guild/{guildId}/rule/{ruleType}")]
    public async Task<ActionResult<ModeratorRuleDto>> UpdateRule(string guildId, string ruleType,
        [FromBody] UpdateModeratorRuleDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var before = await _moderatorService.GetModeratorByGuildIdAsync(guildId);
        var rule = await _moderatorService.UpdateModeratorRuleAsync(guildId, ruleType, updateDto);
        if (rule == null)
            return NotFound($"Moderator kuralı bulunamadı (GuildId: {guildId}, RuleType: {ruleType})");

        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "moderator.rule.update", "ModeratorRule", ruleType, before, rule));
        return Ok(rule);
    }

    /// <summary>
    ///     Yasaklı kelime ekler
    /// </summary>
    [DiscordAuth]
    [HttpPost("guild/{guildId}/forbidden-word")]
    public async Task<ActionResult<ForbiddenWordDto>> AddForbiddenWord(string guildId,
        [FromBody] AddForbiddenWordDto addDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var before = await _moderatorService.GetModeratorByGuildIdAsync(guildId);
        var word = await _moderatorService.AddForbiddenWordAsync(guildId, addDto);
        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "moderator.forbidden_word.add", "ForbiddenWord", word.Id.ToString(), before, word));
        return Ok(word);
    }

    /// <summary>
    ///     Yasaklı kelimeyi siler
    /// </summary>
    [DiscordAuth]
    [HttpDelete("guild/{guildId}/forbidden-word/{wordId}")]
    public async Task<IActionResult> DeleteForbiddenWord(string guildId, int wordId)
    {
        var words = await _moderatorService.GetForbiddenWordsAsync(guildId);
        if (!words.Any(w => w.Id == wordId))
            return NotFound($"Yasaklı kelime bulunamadı (WordId: {wordId})");

        var before = words.FirstOrDefault(w => w.Id == wordId);
        var result = await _moderatorService.DeleteForbiddenWordAsync(wordId);
        if (!result)
            return NotFound($"Yasaklı kelime bulunamadı (WordId: {wordId})");

        await _panelAuditLogService.CreateAsync(CreateAudit(guildId, "moderator.forbidden_word.delete", "ForbiddenWord", wordId.ToString(), before, null));
        return NoContent();
    }

    /// <summary>
    ///     Yasaklı kelimeleri getirir
    /// </summary>
    [DiscordAuth]
    [HttpGet("guild/{guildId}/forbidden-words")]
    public async Task<ActionResult<List<ForbiddenWordDto>>> GetForbiddenWords(string guildId)
    {
        var words = await _moderatorService.GetForbiddenWordsAsync(guildId);
        return Ok(words);
    }

    private CreatePanelAuditLogDto CreateAudit(
        string guildId,
        string action,
        string resourceType,
        string? resourceId,
        object? before,
        object? after)
    {
        return new CreatePanelAuditLogDto
        {
            GuildId = guildId,
            ActorType = HttpContext.Items["DiscordAuthIsBot"] is true ? "bot" : "user",
            ActorUserId = HttpContext.Items["DiscordUserId"]?.ToString(),
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Before = before,
            After = after,
            RequestId = HttpContext.TraceIdentifier,
            Result = "success"
        };
    }
}