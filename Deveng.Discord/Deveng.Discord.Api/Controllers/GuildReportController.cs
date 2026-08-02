using Deveng.Discord.Api.Attributes;
using Deveng.Discord.Api.DTOs;
using Deveng.Discord.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GuildReportController : ControllerBase
{
    private readonly IGuildReportService _service;
    private readonly IGuildReportEmailSender _reportEmail;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GuildReportController> _logger;

    public GuildReportController(
        IGuildReportService service,
        IGuildReportEmailSender reportEmail,
        IServiceScopeFactory scopeFactory,
        ILogger<GuildReportController> logger)
    {
        _service = service;
        _reportEmail = reportEmail;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}")]
    public async Task<ActionResult<List<GuildReportJobDto>>> GetByGuild(string guildId)
    {
        return Ok(await _service.GetByGuildIdAsync(guildId, 100));
    }

    [DiscordAuth]
    [HttpGet("guild/{guildId}/notify")]
    public async Task<ActionResult<GuildReportNotifyDto>> GetNotify(string guildId)
    {
        var n = await _service.GetNotifyAsync(guildId);
        return Ok(n ?? new GuildReportNotifyDto { GuildId = guildId, SendOnComplete = false });
    }

    [DiscordAuth]
    [HttpPut("guild/{guildId}/notify")]
    public async Task<ActionResult<GuildReportNotifyDto>> UpsertNotify(string guildId, [FromBody] UpsertGuildReportNotifyDto dto)
    {
        return Ok(await _service.UpsertNotifyAsync(guildId, dto));
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}")]
    public async Task<ActionResult<GuildReportJobDto>> Create(string guildId, [FromBody] CreateGuildReportJobDto dto)
    {
        return Ok(await _service.CreateAsync(guildId, HttpContext.Items["DiscordUserId"]?.ToString(), dto.ReportRange));
    }

    [DiscordAuth]
    [HttpPost("guild/{guildId}/job/{jobId:long}/email")]
    public async Task<ActionResult<GuildReportEmailSendResultDto>> ResendEmail(string guildId, long jobId)
    {
        var result = await _reportEmail.TrySendForJobAsync(jobId, guildId, respectSendOnComplete: false);
        if (result.Outcome == "not_found") return NotFound(result);
        return Ok(result);
    }

    [DiscordAuth]
    [HttpGet("pending")]
    public async Task<ActionResult<List<GuildReportJobDto>>> Pending([FromQuery] int batchSize = 25)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        return Ok(await _service.GetPendingAsync(batchSize));
    }

    [DiscordAuth]
    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id, [FromBody] CompleteGuildReportJobDto dto)
    {
        if (HttpContext.Items["DiscordAuthIsBot"] is not true) return Forbid();
        await _service.CompleteAsync(id, dto);
        if (dto.Status == "completed")
        {
            var jobId = id;
            _ = Task.Run(async () =>
            {
                try
                {
                    await using var scope = _scopeFactory.CreateAsyncScope();
                    var sender = scope.ServiceProvider.GetRequiredService<IGuildReportEmailSender>();
                    await sender.TrySendForJobAsync(jobId, null, respectSendOnComplete: true).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Guild report post-complete mail job={JobId}", jobId);
                }
            });
        }

        return NoContent();
    }
}
