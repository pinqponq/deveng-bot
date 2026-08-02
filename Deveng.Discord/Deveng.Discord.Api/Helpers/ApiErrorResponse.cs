using Microsoft.AspNetCore.Mvc;

namespace Deveng.Discord.Api.Helpers;

public static class ApiErrorResponse
{
    public static object Problem(string code, string message, string traceId) =>
        new { code, message, traceId };

    public static IActionResult ProblemResult(string code, string message, string traceId, int statusCode) =>
        new ObjectResult(Problem(code, message, traceId)) { StatusCode = statusCode };
}
