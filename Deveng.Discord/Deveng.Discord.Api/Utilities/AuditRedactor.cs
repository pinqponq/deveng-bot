using System.Text.Json;

namespace Deveng.Discord.Api.Utilities;

public static class AuditRedactor
{
    private static readonly string[] SensitiveNameParts =
    [
        "token",
        "secret",
        "password",
        "apikey",
        "api_key",
        "webhook",
        "email"
    ];

    public static string? ToRedactedJson(object? value)
    {
        if (value == null) return null;

        var json = JsonSerializer.Serialize(value);
        using var document = JsonDocument.Parse(json);
        var redacted = RedactElement(document.RootElement);
        return JsonSerializer.Serialize(redacted);
    }

    private static object? RedactElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject().ToDictionary(
                property => property.Name,
                property => IsSensitive(property.Name) ? "***REDACTED***" : RedactElement(property.Value)),
            JsonValueKind.Array => element.EnumerateArray().Select(RedactElement).ToList(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var longValue) ? longValue :
                element.TryGetDecimal(out var decimalValue) ? decimalValue : element.GetRawText(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.GetRawText()
        };
    }

    private static bool IsSensitive(string name)
    {
        var normalized = name.Replace("-", string.Empty).Replace("_", string.Empty).ToLowerInvariant();
        return SensitiveNameParts.Any(part => normalized.Contains(part.Replace("_", string.Empty), StringComparison.Ordinal));
    }
}
