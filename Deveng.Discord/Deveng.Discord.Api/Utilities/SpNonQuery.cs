namespace Deveng.Discord.Api.Utilities;

/// <summary>
/// Saklı yordamlarda <c>SET NOCOUNT ON</c> varken ExecuteNonQuery çoğunlukla 0 veya -1 döner;
/// yalnız <c>rows &gt; 0</c> silme/güncellemeyi hatalı başarısız sayar.
/// </summary>
public static class SpNonQuery
{
    /// <summary>UPDATE/INSERT etkisi: pozitif veya NOCOUNT sinyali (-1) ise çoğunlukla işlem yürüdü kabul edilir (0=şüpheli).</summary>
    public static bool AffectedMightBeOk(int rows) => rows > 0 || rows < 0;

    /// <summary>DELETE sonrası: <paramref name="rows"/>&gt;0 ise kabul; değilse <paramref name="stillExistsAsync"/> hâlâ var mı sorusu (false=başarılı silme).</summary>
    public static async Task<bool> AfterDeleteWithExistsCheckAsync(
        int rows,
        Func<Task<bool>> stillExistsAsync)
    {
        if (rows > 0) return true;
        return !await stillExistsAsync();
    }
}
