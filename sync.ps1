[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$SkillsDirectory,
    [switch]$CleanPersonal,
    [ValidateSet("Auto", "SymbolicLink", "Junction")]
    [string]$LinkMode = "Auto"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$syncTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if ([string]::IsNullOrWhiteSpace($SkillsDirectory)) {
    $configuredCodexRoot = [Environment]::GetEnvironmentVariable("CODEX_HOME")
    if ([string]::IsNullOrWhiteSpace($configuredCodexRoot)) {
        $configuredCodexRoot = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".codex"
    }
    $SkillsDirectory = Join-Path $configuredCodexRoot "skills"
}

$skillsRoot = [IO.Path]::GetFullPath($SkillsDirectory)
$skillsRootInfo = [IO.DirectoryInfo]$skillsRoot
if ($skillsRootInfo.Name -ne "skills" -or [string]::IsNullOrWhiteSpace($skillsRootInfo.Parent.FullName)) {
    throw "Refusing to manage an unexpected skills directory: $skillsRoot"
}

$collectionSpecs = @(
    @{ Name = "creation"; Path = (Join-Path $repoRoot "creation") },
    @{ Name = "decision"; Path = (Join-Path $repoRoot "decision") },
    @{ Name = "engineering"; Path = (Join-Path $repoRoot "engineering\skills\skills") }
)

foreach ($collection in $collectionSpecs) {
    if (-not (Test-Path -LiteralPath $collection.Path -PathType Container)) {
        throw "Skill collection is missing. Initialize submodules if needed: $($collection.Path)"
    }
}

function Get-SkillNameFromFile {
    param([Parameter(Mandatory = $true)][string]$SkillFile)

    $content = Get-Content -Raw -LiteralPath $SkillFile
    $match = [regex]::Match($content, '(?m)^name:\s*["'']?([^\r\n"'']+)["'']?\s*$')
    if (-not $match.Success) {
        throw "Missing skill name in frontmatter: $SkillFile"
    }
    return $match.Groups[1].Value.Trim()
}

function Test-NeedsCodexAdapter {
    param([Parameter(Mandatory = $true)][string]$SkillFile)

    $content = Get-Content -Raw -LiteralPath $SkillFile
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
    throw "Duplicate skill names cannot share one Codex directory:`n$($details -join "`n")"
}

if ($discovered.Count -eq 0) {
    throw "No skills were discovered under the configured collections."
}

$adapterRoot = Join-Path $repoRoot ".codex-generated\skills"
$adapterCount = 0
foreach ($skill in $discovered | Where-Object NeedsCodexAdapter) {
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
    $adapterContent = Get-Content -Raw -LiteralPath $adapterSkillFile
    $adapterContent = [regex]::Replace(
        $adapterContent,
        '(?m)^(disable-model-invocation|argument-hint):.*\r?\n',
        ''
    )
    Set-Content -LiteralPath $adapterSkillFile -Value $adapterContent -Encoding utf8 -NoNewline
}

if (-not (Test-Path -LiteralPath $skillsRoot)) {
    if ($PSCmdlet.ShouldProcess($skillsRoot, "Create Codex skills directory")) {
        New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null
    }
}

$preservedNames = @(".system", "codex-primary-runtime")
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
            Remove-Item -LiteralPath $Item.FullName -Force
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
            Write-Host "[KEEP] $($item.Name) (Codex infrastructure)" -ForegroundColor DarkGray
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
if ($CleanPersonal) {
    $userProfileRoot = [Environment]::GetFolderPath("UserProfile")
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
            New-Item -ItemType $mode -Path $TargetPath -Target $SourcePath -ErrorAction Stop | Out-Null
            if ($LinkMode -eq "Auto" -and $mode -eq "Junction") {
                $script:fallbacks++
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
        if ($targetMatches.Count -gt 0) {
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
        if (-not (Test-Path -LiteralPath (Join-Path $target "SKILL.md"))) {
            $verificationErrors += "Missing linked SKILL.md: $target"
            continue
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
Write-Host "Codex skill sync complete" -ForegroundColor Cyan
Write-Host "  discovered : $($discovered.Count)"
Write-Host "  created    : $created"
Write-Host "  reused     : $reused"
Write-Host "  removed    : $removed"
Write-Host "  backed up  : $backedUp"
if ($backedUp -gt 0) {
    Write-Host "  backup     : $backupRoot"
}
Write-Host "  .agents links removed: $agentsRemoved"
Write-Host "  .agents skills backed up: $agentsBackedUp"
if ($agentsBackedUp -gt 0 -or $agentsRemoved -gt 0) {
    Write-Host "  .agents backup: $agentsBackupRoot"
}
Write-Host "  Codex adapters: $adapterCount"
Write-Host "  junction fallback: $fallbacks"
Write-Host "  destination: $skillsRoot"
