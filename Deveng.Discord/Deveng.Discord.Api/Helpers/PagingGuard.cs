namespace Deveng.Discord.Api.Helpers;

/// <summary>
/// Listing endpoint'lerinde kullanıcı kaynaklı limit/offset değerlerinin sınırlanması.
/// Negatif veya makul üstü değerleri sessizce sıkıştırır; SQL LIMIT abuse + resource
/// exhaustion riskini düşürür.
/// </summary>
public static class PagingGuard
{
    /// <summary>
    /// limit'i [1, max] aralığına sıkıştırır. null veya 0 → default'a düşer; max'ı aşan değerler kesilir.
    /// </summary>
    public static int ClampLimit(int? limit, int @default, int max)
    {
        if (max < 1) max = 1;
        if (@default < 1) @default = 1;
        if (@default > max) @default = max;
        if (!limit.HasValue || limit.Value <= 0) return @default;
        if (limit.Value > max) return max;
        return limit.Value;
    }

    public static int ClampLimit(int limit, int @default, int max) => ClampLimit((int?)limit, @default, max);

    /// <summary>offset'i [0, ∞) aralığına sıkıştırır.</summary>
    public static int ClampOffset(int? offset) => offset.HasValue && offset.Value > 0 ? offset.Value : 0;
}
