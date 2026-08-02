using System.Reflection;
using Deveng.Discord.Api.Attributes;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Deveng.Discord.Api.Tests;

/// <summary>
/// AuthZ-001: guildId güzergâhı olan denetleyicilerde açık kimlik doğrulama meta verisi beklenir.
/// </summary>
public class GuildAuthorizationContractTests
{
    [Fact]
    public void Guild_route_controllers_have_auth_attribute_on_type_or_methods()
    {
        var asm = typeof(Program).Assembly;
        var failures = new List<string>();
        foreach (var t in asm.GetTypes().Where(x =>
                     x is { IsClass: true, IsAbstract: false } &&
                     x.Name.EndsWith("Controller", StringComparison.Ordinal)))
        {
            if (t.Namespace == null || !t.Namespace.Contains("Deveng.Discord.Api.Controllers", StringComparison.Ordinal))
                continue;

            var routeAttr = t.GetCustomAttribute<RouteAttribute>();
            var routeTemplate = routeAttr?.Template ?? string.Empty;
            if (!routeTemplate.Contains("guildId", StringComparison.OrdinalIgnoreCase))
                continue;

            var typeAuth = t.GetCustomAttributes(true);
            var typeHasAuth = typeAuth.OfType<DiscordAuthAttribute>().Any()
                              || typeAuth.OfType<RequireDiscordUserAttribute>().Any();

            var methodFailures = new List<string>();
            foreach (var m in t.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly))
            {
                if (m.GetCustomAttributes(typeof(NonActionAttribute), true).Length != 0)
                    continue;
                var hasHttp = m.GetCustomAttributes(true).Any(a => a.GetType().Name.StartsWith("Http", StringComparison.Ordinal));
                if (!hasHttp) continue;

                var mattrs = m.GetCustomAttributes(true);
                var mAuth = mattrs.OfType<DiscordAuthAttribute>().Any() || mattrs.OfType<RequireDiscordUserAttribute>().Any();
                if (!typeHasAuth && !mAuth)
                    methodFailures.Add(m.Name);
            }

            if (methodFailures.Count > 0)
                failures.Add($"{t.Name}: {string.Join(", ", methodFailures)}");
        }

        Assert.True(failures.Count == 0, "Guild route controller eksik auth: " + string.Join("; ", failures));
    }
}
