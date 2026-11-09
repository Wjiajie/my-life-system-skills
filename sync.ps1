[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet("Codex", "WorkBuddy", "DeepSeekHarness")]
    [string]$Platform = "Codex",
    [string]$SkillsDirectory,
    [switch]$CleanPersonal,
    [switch]$Force,
    [ValidateSet("Auto", "SymbolicLink", "Junction")]
    [string]$LinkMode = "Auto"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$syncTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$userProfileRoot = [Environment]::GetFolderPath("UserProfile")

if ([string]::IsNullOrWhiteSpace($SkillsDirectory)) {
    if ($Platform -eq "WorkBuddy") {
        $SkillsDirectory = Join-Path $userProfileRoot ".workbuddy\skills"
    }
    elseif ($Platform -eq "DeepSeekHarness") {
        # The harness resolves DSH_HOME itself, so honour it and fall back to its
        # own default of ~/.dsh.
        $configuredDshRoot = [Environment]::GetEnvironmentVariable("DSH_HOME")
        if ([string]::IsNullOrWhiteSpace($configuredDshRoot)) {
            $configuredDshRoot = Join-Path $userProfileRoot ".dsh"
        }
        $SkillsDirectory = Join-Path $configuredDshRoot "skills"
    }
    else {
        $configuredCodexRoot = [Environment]::GetEnvironmentVariable("CODEX_HOME")
        if ([string]::IsNullOrWhiteSpace($configuredCodexRoot)) {
            $configuredCodexRoot = Join-Path $userProfileRoot ".codex"
        }
        $SkillsDirectory = Join-Path $configuredCodexRoot "skills"
    }
}

$skillsRoot = [IO.Path]::GetFullPath($SkillsDirectory)
$skillsRootInfo = [IO.DirectoryInfo]$skillsRoot
if ($skillsRootInfo.Name -ne "skills" -or [string]::IsNullOrWhiteSpace($skillsRootInfo.Parent.FullName)) {
    throw "Refusing to manage an unexpected skills directory: $skillsRoot"
}

$collectionSpecs = @(
    @{ Name = "creation"; Path = (Join-Path $repoRoot "creation") },
    @{ Name = "decision"; Path = (Join-Path $repoRoot "decision") },
    @{ Name = "workflow"; Path = (Join-Path $repoRoot "workflow") },
    @{ Name = "engineering"; Path = (Join-Path $repoRoot "engineering\skills\skills") }
)

foreach ($collection in $collectionSpecs) {
    if (-not (Test-Path -LiteralPath $collection.Path -PathType Container)) {
        throw "Skill collection is missing. Initialize submodules if needed: $($collection.Path)"
    }
}

# PowerShell 5.1's New-Item -ItemType SymbolicLink never passes
# SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE, so it demands elevation even when
# Windows Developer Mode is on. Call CreateSymbolicLinkW directly with that flag
# and only fall back to a Junction if the OS still refuses.
if (-not ([System.Management.Automation.PSTypeName]'ManagedSkillSymlink').Type) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class ManagedSkillSymlink
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CreateSymbolicLinkW(string lpSymlinkFileName, string lpTargetFileName, uint dwFlags);
}
'@ -ErrorAction Stop
}

function Get-SkillNameFromFile {
    param([Parameter(Mandatory = $true)][string]$SkillFile)

    $content = [IO.File]::ReadAllText($SkillFile)
    $match = [regex]::Match($content, '(?m)^name:\s*["'']?([^\r\n"'']+)["'']?\s*$')
    if (-not $match.Success) {
        throw "Missing skill name in frontmatter: $SkillFile"
    }
    return $match.Groups[1].Value.Trim()
}

function Test-NeedsCodexAdapter {
    param([Parameter(Mandatory = $true)][string]$SkillFile)

    $content = [IO.File]::ReadAllText($SkillFile)
    $frontmatter = [regex]::Match($content, '\A---\s*\r?\n(?<body>.*?)\r?\n---\s*\r?\n', [Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $frontmatter.Success) {
        throw "Malformed frontmatter: $SkillFile"
    }

    return [regex]::IsMatch(
        $frontmatter.Groups['body'].Value,
        '(?m)^(disable-model-invocation|argument-hint):'
    )
}

$discovered = @()
foreach ($collection in $collectionSpecs) {
    foreach ($skillFile in Get-ChildItem -LiteralPath $collection.Path -Filter "SKILL.md" -File -Recurse) {
        $source = $skillFile.Directory.FullName
        $name = Get-SkillNameFromFile -SkillFile $skillFile.FullName
        if ($name -ne $skillFile.Directory.Name) {
            throw "Skill name '$name' does not match folder '$($skillFile.Directory.Name)': $source"
        }
        $discovered += [PSCustomObject]@{
            Name = $name
            Source = $source
            InstallSource = $source
            Collection = $collection.Name
            NeedsCodexAdapter = (Test-NeedsCodexAdapter -SkillFile $skillFile.FullName)
        }
    }
}

$duplicateGroups = $discovered | Group-Object Name | Where-Object Count -gt 1
if ($duplicateGroups) {
    $details = $duplicateGroups | ForEach-Object {
        "{0}: {1}" -f $_.Name, (($_.Group.Source) -join ", ")
    }
    throw "Duplicate skill names cannot share one $Platform directory:`n$($details -join "`n")"
}

if ($discovered.Count -eq 0) {
    throw "No skills were discovered under the configured collections."
}

$adapterRoot = Join-Path $repoRoot ".codex-generated\skills"
$adapterCount = 0
if ($Platform -ne "Codex") {
    # WorkBuddy and DeepSeek Harness read the same SKILL.md frontmatter as Claude
    # Code, so the upstream `disable-model-invocation` / `argument-hint` keys stay
    # intact and the links point straight at the sources instead of generated
    # mirrors. DeepSeek Harness honours `disable-model-invocation` natively and
    # ignores `argument-hint`; it rejects the legacy camelCase invocation keys,
    # which no skill in this repository uses.
    foreach ($skill in $discovered) {
        $skill.InstallSource = $skill.Source
    }
}
foreach ($skill in ($discovered | Where-Object { $Platform -eq "Codex" -and $_.NeedsCodexAdapter })) {
    $adapterPath = Join-Path $adapterRoot $skill.Name
    $skill.InstallSource = $adapterPath
    $adapterCount++

    if ($WhatIfPreference) {
        continue
    }

    $resolvedAdapterParent = [IO.Path]::GetFullPath((Split-Path -Parent $adapterPath))
    if ($resolvedAdapterParent -ne [IO.Path]::GetFullPath($adapterRoot)) {
        throw "Refusing to generate a Codex adapter outside the adapter root: $adapterPath"
    }

    if (-not (Test-Path -LiteralPath $adapterRoot)) {
        New-Item -ItemType Directory -Path $adapterRoot -Force | Out-Null
    }
    if (Test-Path -LiteralPath $adapterPath) {
        Remove-Item -LiteralPath $adapterPath -Force -Recurse
    }

    Copy-Item -LiteralPath $skill.Source -Destination $adapterPath -Recurse
    $adapterSkillFile = Join-Path $adapterPath "SKILL.md"
    # ReadAllText decodes UTF-8 regardless of the console code page that
    # Windows PowerShell 5.1 would otherwise use for Get-Content -Raw.
    $adapterContent = [IO.File]::ReadAllText($adapterSkillFile)
    $adapterContent = [regex]::Replace(
        $adapterContent,
        '(?m)^(disable-model-invocation|argument-hint):.*\r?\n',
        ''
    )
    [IO.File]::WriteAllText(
        $adapterSkillFile,
        $adapterContent,
        [Text.UTF8Encoding]::new($false)
    )
}

if (-not (Test-Path -LiteralPath $skillsRoot)) {
    if ($PSCmdlet.ShouldProcess($skillsRoot, "Create $Platform skills directory")) {
        New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null
    }
}

$preservedNames = switch ($Platform) {
    "WorkBuddy" { @() }
    "DeepSeekHarness" { @(".system") }
    default { @(".system", "codex-primary-runtime") }
}
$removed = 0
$backedUp = 0
$backupRoot = Join-Path $skillsRootInfo.Parent.FullName ("skill-backups\" + $syncTimestamp)
$created = 0
$reused = 0
$fallbacks = 0

function Remove-SkillItem {
    param(
        [Parameter(Mandatory = $true)][System.IO.FileSystemInfo]$Item,
        [Parameter(Mandatory = $true)][string]$Reason
    )

    $parentDirectory = if ($Item.PSIsContainer) { $Item.Parent } else { $Item.Directory }
    $resolvedParent = [IO.Path]::GetFullPath($parentDirectory.FullName)
    if ($resolvedParent -ne $skillsRoot) {
        throw "Refusing to remove an item outside the managed directory: $($Item.FullName)"
    }

    if ($PSCmdlet.ShouldProcess($Item.FullName, "Remove $Reason")) {
        if (($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            # Delete the link itself, never its target. Directory.Delete on a reparse
            # point does not follow it, and using the BCL avoids Remove-Item wrappers
            # that resolve the link first and refuse to delete a non-empty directory.
            $linkDeleted = $false
            if ($Item.PSIsContainer) {
                try {
                    [System.IO.Directory]::Delete($Item.FullName)
                    $linkDeleted = $true
                }
                catch {
                    $linkDeleted = $false
                }
            }
            if (-not $linkDeleted) {
                [System.IO.File]::Delete($Item.FullName)
            }
        }
        elseif ($Item.PSIsContainer) {
            Remove-Item -LiteralPath $Item.FullName -Force -Recurse
        }
        else {
            Remove-Item -LiteralPath $Item.FullName -Force
        }
        $script:removed++
    }
}

function Move-SkillItemToBackup {
    param([Parameter(Mandatory = $true)][System.IO.DirectoryInfo]$Item)

    $resolvedParent = [IO.Path]::GetFullPath($Item.Parent.FullName)
    if ($resolvedParent -ne $skillsRoot) {
        throw "Refusing to move an item outside the managed directory: $($Item.FullName)"
    }

    $backupContainer = [IO.Path]::GetFullPath((Split-Path -Parent $backupRoot))
    $backupParent = [IO.Path]::GetFullPath((Split-Path -Parent $backupContainer))
    if (
        $backupParent -ne [IO.Path]::GetFullPath($skillsRootInfo.Parent.FullName) -or
        (Split-Path -Leaf $backupContainer) -ne "skill-backups"
    ) {
        throw "Refusing to create a backup outside the Codex root: $backupRoot"
    }

    $backupTarget = Join-Path $backupRoot $Item.Name
    if ($PSCmdlet.ShouldProcess($Item.FullName, "Move personal skill to $backupTarget")) {
        if (-not (Test-Path -LiteralPath $backupRoot)) {
            New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
        }
        Move-Item -LiteralPath $Item.FullName -Destination $backupTarget
        $script:backedUp++
    }
}

if ($CleanPersonal -and (Test-Path -LiteralPath $skillsRoot)) {
    foreach ($item in Get-ChildItem -Force -LiteralPath $skillsRoot) {
        if ($item.Name -in $preservedNames) {
            Write-Host "[KEEP] $($item.Name) ($Platform infrastructure)" -ForegroundColor DarkGray
            continue
        }

        $isLink = (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
        $containsSkill = $item.PSIsContainer -and (Test-Path -LiteralPath (Join-Path $item.FullName "SKILL.md"))
        if ($isLink) {
            Remove-SkillItem -Item $item -Reason "personal skill"
        }
        elseif ($containsSkill) {
            Move-SkillItemToBackup -Item $item
        }
        else {
            Write-Host "[KEEP] $($item.Name) (not a top-level personal skill)" -ForegroundColor DarkGray
        }
    }
}

$agentsRemoved = 0
$agentsBackedUp = 0
$agentsBackupRoot = $null
if ($CleanPersonal -and $Platform -eq "Codex") {
    $agentsRoot = Join-Path $userProfileRoot ".agents"
    $agentsSkillsRoot = Join-Path $agentsRoot "skills"
    $agentsBackupRoot = Join-Path $agentsRoot ("skill-backups\" + $syncTimestamp)
    $pluginRoot = [IO.Path]::GetFullPath((Join-Path $skillsRootInfo.Parent.FullName "plugins"))

    if (Test-Path -LiteralPath $agentsSkillsRoot) {
        foreach ($item in Get-ChildItem -Force -LiteralPath $agentsSkillsRoot) {
            $resolvedParent = [IO.Path]::GetFullPath($item.Parent.FullName)
            if ($resolvedParent -ne [IO.Path]::GetFullPath($agentsSkillsRoot)) {
                throw "Refusing to clean an item outside the .agents skills directory: $($item.FullName)"
            }

            $isLink = (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
            $isPluginLink = $false
            if ($isLink) {
                foreach ($targetValue in @($item.Target)) {
                    if ([string]::IsNullOrWhiteSpace($targetValue)) {
                        continue
                    }
                    $absoluteTarget = [IO.Path]::GetFullPath([string]$targetValue)
                    if ($absoluteTarget.StartsWith($pluginRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                        $isPluginLink = $true
                        break
                    }
                }
            }

            if ($isPluginLink) {
                Write-Host "[KEEP] .agents/$($item.Name) (plugin-managed link)" -ForegroundColor DarkGray
                continue
            }

            $containsSkill = $item.PSIsContainer -and (Test-Path -LiteralPath (Join-Path $item.FullName "SKILL.md"))
            if ($isLink) {
                if ($PSCmdlet.ShouldProcess($item.FullName, "Remove legacy personal skill link")) {
                    Remove-Item -LiteralPath $item.FullName -Force
                    $agentsRemoved++
                }
            }
            elseif ($containsSkill) {
                $backupContainer = [IO.Path]::GetFullPath((Split-Path -Parent $agentsBackupRoot))
                if (
                    [IO.Path]::GetFullPath((Split-Path -Parent $backupContainer)) -ne [IO.Path]::GetFullPath($agentsRoot) -or
                    (Split-Path -Leaf $backupContainer) -ne "skill-backups"
                ) {
                    throw "Refusing to create an unexpected .agents backup: $agentsBackupRoot"
                }
                $backupTarget = Join-Path $agentsBackupRoot $item.Name
                if ($PSCmdlet.ShouldProcess($item.FullName, "Move personal skill to $backupTarget")) {
                    if (-not (Test-Path -LiteralPath $agentsBackupRoot)) {
                        New-Item -ItemType Directory -Path $agentsBackupRoot -Force | Out-Null
                    }
                    Move-Item -LiteralPath $item.FullName -Destination $backupTarget
                    $agentsBackedUp++
                }
            }
            else {
                Write-Host "[KEEP] .agents/$($item.Name) (not a top-level skill)" -ForegroundColor DarkGray
            }
        }
    }

    $skillLock = Join-Path $agentsRoot ".skill-lock.json"
    if (Test-Path -LiteralPath $skillLock) {
        $lockBackup = Join-Path $agentsBackupRoot ".skill-lock.json"
        if ($PSCmdlet.ShouldProcess($skillLock, "Back up and reset the personal skill lock")) {
            if (-not (Test-Path -LiteralPath $agentsBackupRoot)) {
                New-Item -ItemType Directory -Path $agentsBackupRoot -Force | Out-Null
            }
            Move-Item -LiteralPath $skillLock -Destination $lockBackup
            Set-Content -LiteralPath $skillLock -Encoding utf8 -NoNewline -Value "{`n  `"version`": 3,`n  `"skills`": {},`n  `"dismissed`": {}`n}`n"
        }
    }
}

$desiredByName = @{}
foreach ($skill in $discovered) {
    $desiredByName[$skill.Name] = $skill
}

if (-not $CleanPersonal -and (Test-Path -LiteralPath $skillsRoot)) {
    foreach ($item in Get-ChildItem -Force -LiteralPath $skillsRoot) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
            continue
        }

        $targets = @($item.Target) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        $pointsIntoRepo = $false
        foreach ($targetValue in $targets) {
            $absoluteTarget = [IO.Path]::GetFullPath([string]$targetValue)
            if ($absoluteTarget.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                $pointsIntoRepo = $true
                break
            }
        }

        if ($pointsIntoRepo -and -not $desiredByName.ContainsKey($item.Name)) {
            Remove-SkillItem -Item $item -Reason "stale repository skill link"
        }
    }
}

function New-ManagedSkillLink {
    param(
        [Parameter(Mandatory = $true)][string]$TargetPath,
        [Parameter(Mandatory = $true)][string]$SourcePath
    )

    $modes = switch ($LinkMode) {
        "Auto" { @("SymbolicLink", "Junction") }
        default { @($LinkMode) }
    }

    $lastError = $null
    foreach ($mode in $modes) {
        try {
            if ($mode -eq "SymbolicLink") {
                $flags = 0x1 -bor 0x2 # SYMBOLIC_LINK_FLAG_DIRECTORY | SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE
                if (-not [ManagedSkillSymlink]::CreateSymbolicLinkW($TargetPath, $SourcePath, $flags)) {
                    $win32 = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
                    throw ("CreateSymbolicLinkW failed with Win32 error {0}" -f $win32)
                }
            }
            else {
                New-Item -ItemType Junction -Path $TargetPath -Target $SourcePath -ErrorAction Stop | Out-Null
                if ($LinkMode -eq "Auto") {
                    $script:fallbacks++
                }
            }
            return $mode
        }
        catch {
            $lastError = $_
        }
    }

    throw "Unable to create link '$TargetPath' -> '$SourcePath': $lastError"
}

foreach ($skill in $discovered | Sort-Object Name) {
    $target = Join-Path $skillsRoot $skill.Name
    $sourceFull = [IO.Path]::GetFullPath($skill.InstallSource)

    $existing = Get-Item -Force -LiteralPath $target -ErrorAction SilentlyContinue
    if ($null -ne $existing) {
        $isLink = (($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
        if (-not $isLink) {
            throw "Target already exists as a real directory. Use -CleanPersonal or move it first: $target"
        }

        $targetMatches = @($existing.Target) | Where-Object {
            -not [string]::IsNullOrWhiteSpace($_) -and
            [IO.Path]::GetFullPath([string]$_) -eq $sourceFull
        }
        if ($targetMatches.Count -gt 0 -and -not $Force) {
            Write-Host "[OK]   $($skill.Name) (already linked)" -ForegroundColor DarkGreen
            $reused++
            continue
        }

        Remove-SkillItem -Item $existing -Reason "outdated skill link"
    }

    if ($PSCmdlet.ShouldProcess($target, "Link $($skill.Name) to $sourceFull")) {
        $createdMode = New-ManagedSkillLink -TargetPath $target -SourcePath $sourceFull
        Write-Host "[LINK] $($skill.Name) [$createdMode] <- $($skill.Collection)" -ForegroundColor Green
        $created++
    }
}

$verificationErrors = @()
if (-not $WhatIfPreference) {
    foreach ($skill in $discovered) {
        $target = Join-Path $skillsRoot $skill.Name
        $linkedSkillFile = Join-Path $target "SKILL.md"
        if (-not (Test-Path -LiteralPath $linkedSkillFile)) {
            $verificationErrors += "Missing linked SKILL.md: $target"
            continue
        }
        $skillBytes = [IO.File]::ReadAllBytes($linkedSkillFile)
        if (
            $skillBytes.Length -lt 3 -or
            $skillBytes[0] -ne 0x2D -or
            $skillBytes[1] -ne 0x2D -or
            $skillBytes[2] -ne 0x2D
        ) {
            $verificationErrors += "SKILL.md must start with an unprefixed YAML delimiter (---): $linkedSkillFile"
        }
        $item = Get-Item -Force -LiteralPath $target
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
            $verificationErrors += "Target is not a filesystem link: $target"
        }
    }
}

if ($verificationErrors.Count -gt 0) {
    throw "Skill link verification failed:`n$($verificationErrors -join "`n")"
}

Write-Host ""
Write-Host "$Platform skill sync complete" -ForegroundColor Cyan
Write-Host "  discovered : $($discovered.Count)"
Write-Host "  created    : $created"
Write-Host "  reused     : $reused"
Write-Host "  removed    : $removed"
Write-Host "  backed up  : $backedUp"
if ($backedUp -gt 0) {
    Write-Host "  backup     : $backupRoot"
}
if ($Platform -eq "Codex") {
    Write-Host "  .agents links removed: $agentsRemoved"
    Write-Host "  .agents skills backed up: $agentsBackedUp"
    if ($agentsBackedUp -gt 0 -or $agentsRemoved -gt 0) {
        Write-Host "  .agents backup: $agentsBackupRoot"
    }
}
Write-Host "  $Platform adapters: $adapterCount"
Write-Host "  junction fallback: $fallbacks"
Write-Host "  destination: $skillsRoot"
