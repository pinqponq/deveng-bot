using System.Globalization;
using System.Text;

namespace Deveng.Discord.Api.Helpers;

public static class TextSearchHelper
{
    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");

    public static string NormalizeForContains(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var sb = new StringBuilder(value.Trim().ToLower(Turkish));
        for (var i = 0; i < sb.Length; i++)
        {
            sb[i] = sb[i] switch
            {
                'ü' => 'u',
                'ö' => 'o',
                'ş' => 's',
                'ç' => 'c',
                'ğ' => 'g',
                'ı' => 'i',
                'â' => 'a',
                'î' => 'i',
                'û' => 'u',
                _ => sb[i]
            };
        }

        return sb.ToString();
    }

    public static bool ContainsNormalized(string? haystack, string? needle)
    {
        if (string.IsNullOrWhiteSpace(needle)) return true;
        if (string.IsNullOrWhiteSpace(haystack)) return false;

        var normalizedNeedle = NormalizeForContains(needle);
        return NormalizeForContains(haystack).Contains(normalizedNeedle, StringComparison.Ordinal);
    }
}
