#Requires -Version 5.1
<#
.SYNOPSIS
  Copy a history-free public snapshot for pinqponq/deveng-bot.

.DESCRIPTION
  Copies the working tree into a sibling folder (default: ../deveng-bot-public),
  excluding secrets, build artifacts, and local tooling. Does NOT git init,
  commit, or push — you do that.

.EXAMPLE
  .\scripts\export-public-orphan.ps1
  .\scripts\export-public-orphan.ps1 -Destination "D:\DEVENG\deveng-bot-public" -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$Destination
)

$ErrorActionPreference = "Stop"
$Source = Split-Path $PSScriptRoot -Parent
if ([string]::IsNullOrWhiteSpace($Destination)) {
  $Destination = Join-Path (Split-Path $Source -Parent) "deveng-bot-public"
}

$excludeDirNames = @(
  ".git",
  "node_modules",
  "dist",
  "bin",
  "obj",
  ".vs",
  ".cursor",
  ".idea",
  "coverage",
  "TestResults",
  "agent-transcripts"
)

$excludeFilePatterns = @(
  ".env",
  ".env.*",
  "appsettings.Development.json",
  "*.user",
  "*.suo",
  "*.userosscache",
  "config.local.json",
  "*.pem",
  "*.key",
  ".DS_Store",
  "Thumbs.db",
  "PUBLISH-CHECKLIST.md"
)

function Test-ExcludedPath {
  param([string]$FullPath, [string]$RelativePath)

  $parts = $RelativePath -split "[\\/]"
  foreach ($part in $parts) {
    if ($excludeDirNames -contains $part) { return $true }
    if ($part -eq "tmp" -and ($RelativePath -match "\.tanstack")) { return $true }
  }

  $name = Split-Path $FullPath -Leaf

  # Keep committed env templates
  if ($name -eq ".env.example") { return $false }

  foreach ($pat in $excludeFilePatterns) {
    if ($name -like $pat) { return $true }
  }

  if ($RelativePath -match "(?i)\.tanstack[\\/]tmp") { return $true }

  return $false
}

Write-Host "Source:      $Source"
Write-Host "Destination: $Destination"

if (-not (Test-Path $Source)) {
  throw "Source not found: $Source"
}

if (Test-Path $Destination) {
  $existing = Get-ChildItem -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  if ($existing) {
    throw "Destination exists and is not empty: $Destination`nRemove it or pass -Destination to a new path."
  }
}

if ($PSCmdlet.ShouldProcess($Destination, "Create public orphan export")) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null

  $copied = 0
  $skipped = 0

  Get-ChildItem -LiteralPath $Source -Recurse -Force | ForEach-Object {
    $rel = $_.FullName.Substring($Source.Length).TrimStart("\", "/")
    if ([string]::IsNullOrWhiteSpace($rel)) { return }

    if (Test-ExcludedPath -FullPath $_.FullName -RelativePath $rel) {
      $skipped++
      return
    }

    $target = Join-Path $Destination $rel

    if ($_.PSIsContainer) {
      if (-not (Test-Path $target)) {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
      }
      return
    }

    $parent = Split-Path $target -Parent
    if (-not (Test-Path $parent)) {
      New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
    $copied++
  }

  Write-Host ""
  Write-Host "Done. Files copied: $copied  (skipped paths counted: $skipped)"
  Write-Host ""
  Write-Host "Next steps (you run these):"
  Write-Host "  cd `"$Destination`""
  Write-Host "  git init -b main"
  Write-Host "  git add ."
  Write-Host "  git commit -m `"Initial public release`""
  Write-Host "  git remote add origin https://github.com/pinqponq/deveng-bot.git"
  Write-Host "  git push -u origin main"
  Write-Host "  # Then make the GitHub repo Public in Settings"
}
