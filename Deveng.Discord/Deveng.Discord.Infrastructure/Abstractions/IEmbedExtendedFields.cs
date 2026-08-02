namespace Deveng.Discord.Infrastructure.Abstractions;

/// <summary>Standart embed genişletme alanları — entity'lere kopyalanır.</summary>
public interface IEmbedExtendedFields
{
    string? EmbedTitleUrl { get; set; }
    string? EmbedAuthorName { get; set; }
    string? EmbedAuthorIcon { get; set; }
    string? EmbedAuthorUrl { get; set; }
    string? EmbedFooterIcon { get; set; }
    bool EmbedUseTimestamp { get; set; }
    string? EmbedFieldsJson { get; set; }
}

public static class EmbedExtendedDefaults
{
    public const bool UseTimestamp = true;
}
