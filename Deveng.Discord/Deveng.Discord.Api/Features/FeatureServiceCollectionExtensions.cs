using Microsoft.Extensions.DependencyInjection;

namespace Deveng.Discord.Api.Features;

/// <summary>
/// Vertical slice DI giriş noktası — modül başına AddXFeature() uzatın (VS-001).
/// </summary>
public static class FeatureServiceCollectionExtensions
{
    public static IServiceCollection AddDevengVerticalSliceFeatures(this IServiceCollection services)
    {
        return services;
    }
}
