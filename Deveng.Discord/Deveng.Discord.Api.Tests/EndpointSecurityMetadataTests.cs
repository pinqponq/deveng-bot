using System.Reflection;
using Deveng.Discord.Api.Attributes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Deveng.Discord.Api.Tests;

public class EndpointSecurityMetadataTests
{
    [Fact]
    public void ApiControllers_Declare_Explicit_Auth_Metadata()
    {
        var asm = typeof(Program).Assembly;
        var failures = new List<string>();
        foreach (var t in asm.GetTypes().Where(x =>
                     x is { IsClass: true, IsAbstract: false } &&
                     x.Name.EndsWith("Controller", StringComparison.Ordinal)))
        {
            if (t.Namespace == null || !t.Namespace.Contains("Deveng.Discord.Api.Controllers", StringComparison.Ordinal))
                continue;

            foreach (var m in t.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly))
            {
                if (m.GetCustomAttributes(typeof(NonActionAttribute), true).Length != 0)
                    continue;

                var hasHttpVerb = m.GetCustomAttributes(true).Any(a => a.GetType().Name.StartsWith("Http", StringComparison.Ordinal));
                if (!hasHttpVerb) continue;

                var methodAttrs = m.GetCustomAttributes(true);
                var typeAttrs = t.GetCustomAttributes(true);
                var ok = methodAttrs.OfType<AllowAnonymousAttribute>().Any()
                         || typeAttrs.OfType<AllowAnonymousAttribute>().Any()
                         || methodAttrs.OfType<DiscordAuthAttribute>().Any()
                         || typeAttrs.OfType<DiscordAuthAttribute>().Any()
                         || methodAttrs.OfType<RequireDiscordUserAttribute>().Any()
                         || typeAttrs.OfType<RequireDiscordUserAttribute>().Any();

                if (!ok) failures.Add($"{t.Name}.{m.Name}");
            }
        }

        Assert.True(failures.Count == 0, "Eksik auth meta verisi: " + string.Join(", ", failures));
    }
}
