using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Deveng.Discord.Infrastructure.Data.Configurations;

internal static class EntityConfigurationExtensions
{
    internal const int GuildIdMaxLength = 32;
    internal const int DiscordIdMaxLength = 32;

    internal static void ApplySnakeCaseColumnNames(this ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var columnName = property.GetColumnName();
                if (columnName is not null)
                {
                    property.SetColumnName(ToSnakeCase(columnName));
                }
            }
        }
    }

    internal static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name))
        {
            return name;
        }

        var builder = new StringBuilder(name.Length + 8);
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c))
            {
                if (i > 0)
                {
                    builder.Append('_');
                }

                builder.Append(char.ToLowerInvariant(c));
            }
            else
            {
                builder.Append(c);
            }
        }

        return builder.ToString();
    }
}
