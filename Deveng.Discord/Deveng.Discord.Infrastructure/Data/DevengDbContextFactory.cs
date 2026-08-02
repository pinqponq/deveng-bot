using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Deveng.Discord.Infrastructure.Data;

/// <summary>
/// EF design-time factory. Connection must come from env — never hardcode secrets/hosts.
/// Prefer: ConnectionStrings__DefaultConnection or DATABASE_URL.
/// </summary>
public sealed class DevengDbContextFactory : IDesignTimeDbContextFactory<DevengDbContext>
{
    public DevengDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "Host=localhost;Port=5432;Database=deveng;Username=deveng;Password=";

        var optionsBuilder = new DbContextOptionsBuilder<DevengDbContext>();
        optionsBuilder.UseNpgsql(connectionString);
        optionsBuilder.ConfigureWarnings(w =>
            w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        return new DevengDbContext(optionsBuilder.Options);
    }
}
