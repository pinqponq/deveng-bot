# Pull Request - Deveng Bot

## Summary / Ozet
<!-- EN: What does this PR do? -->
<!-- TR: Bu PR ne yapiyor? -->

## Change type / Degisiklik turu
- [ ] Bug fix
- [ ] Feature / Yeni ozellik
- [ ] Refactor (no behavior change)
- [ ] Security fix
- [ ] Dependency update
- [ ] Docs / Belge

## Security checklist
*(required for new endpoints or authz changes)*

- [ ] New endpoints use `[DiscordAuth]`, `[RequireDiscordUser]`, or `[AllowAnonymous]` (deny-by-default filter)
- [ ] New `{guildId}/{id}` routes verify entity ownership (`existing.GuildId == guildId` or SP `@GuildId` filter)
- [ ] Error responses do not leak `ex.Message` / stack traces / SQL / internal hostnames
- [ ] Logs do not contain plaintext tokens / cookies / Authorization headers
- [ ] Frontend responses minimize sensitive admin fields
- [ ] Rate-limit / cooldown partitions wired when needed
- [ ] DTO validation: required / length / enum; no mass-assignment risk
- [ ] User-controlled URLs go through allowlist sanitizers
- [ ] Bot\leftrightarrow API HMAC headers preserved (`buildHmacHeaders` / `BotHttpHmac.AddSignedHeaders`)

## Test plan
- [ ] `dotnet build` (API) - 0 errors
- [ ] `dotnet test`
- [ ] Bot: `npm run build` / `npx tsc --noEmit`
- [ ] Web: `npm run build` / `pnpm build`
- [ ] Manual steps for new behavior documented below
- [ ] AuthZ regression covered when relevant (cross-guild 403 / unauthorized 401)

### Manual steps
<!-- 1. ... -->

## Related issue
<!-- Closes #123 -->

## Screenshots / output
<!-- UI or sample API response if useful -->
