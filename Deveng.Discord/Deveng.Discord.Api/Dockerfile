# syntax=docker/dockerfile:1
# Deveng.Discord.Api — local OSS image (no .env COPY, no private registry)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Deveng.Shared.Redis/Deveng.Shared.Redis.csproj Deveng.Shared.Redis/
COPY Deveng.Discord.Scheduling.Contracts/Deveng.Discord.Scheduling.Contracts.csproj Deveng.Discord.Scheduling.Contracts/
COPY Deveng.Discord.Infrastructure/Deveng.Discord.Infrastructure.csproj Deveng.Discord.Infrastructure/
COPY Deveng.Discord.Api/Deveng.Discord.Api.csproj Deveng.Discord.Api/
RUN dotnet restore Deveng.Discord.Api/Deveng.Discord.Api.csproj

COPY . .
RUN dotnet publish Deveng.Discord.Api/Deveng.Discord.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
ENV ASPNETCORE_URLS=http://+:9000
EXPOSE 9000
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "Deveng.Discord.Api.dll"]
