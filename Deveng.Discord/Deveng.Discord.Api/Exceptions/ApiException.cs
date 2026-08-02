namespace Deveng.Discord.Api.Exceptions;

/// <summary>
/// Tüm semantic API exception'larının base'i. Global handler bunları
/// HTTP status koduna ve client-safe mesaja çevirir; per-action try/catch'e gerek yok.
/// </summary>
public abstract class ApiException : Exception
{
    public abstract int StatusCode { get; }
    public abstract string Code { get; }

    protected ApiException(string message) : base(message) { }
    protected ApiException(string message, Exception inner) : base(message, inner) { }
}

public sealed class BadRequestException : ApiException
{
    public override int StatusCode => 400;
    public override string Code => "bad_request";
    public BadRequestException(string message) : base(message) { }
}

public sealed class NotFoundException : ApiException
{
    public override int StatusCode => 404;
    public override string Code => "not_found";
    public NotFoundException(string message) : base(message) { }
}

public sealed class ForbiddenException : ApiException
{
    public override int StatusCode => 403;
    public override string Code => "forbidden";
    public ForbiddenException(string message) : base(message) { }
}

public sealed class ConflictException : ApiException
{
    public override int StatusCode => 409;
    public override string Code => "conflict";
    public ConflictException(string message) : base(message) { }
}

public sealed class FeatureDisabledException : ApiException
{
    public override int StatusCode => 403;
    public override string Code => "feature_disabled";
    public FeatureDisabledException(string message) : base(message) { }
}

public sealed class UpstreamUnavailableException : ApiException
{
    public override int StatusCode => 502;
    public override string Code => "upstream_unavailable";
    public UpstreamUnavailableException(string message) : base(message) { }
    public UpstreamUnavailableException(string message, Exception inner) : base(message, inner) { }
}

/// <summary>
/// Kayıt kotasının aşıldığını belirtir (HTTP 402 — panel kota mesajı için).
/// </summary>
public sealed class FeatureLimitException : ApiException
{
    public override int StatusCode => 402;
    public override string Code => "quota_exceeded";
    public string Quota { get; }
    public int Limit { get; }
    public int Current { get; }
    public FeatureLimitException(string quota, int limit, int current, string message) : base(message)
    {
        Quota = quota;
        Limit = limit;
        Current = current;
    }
}
