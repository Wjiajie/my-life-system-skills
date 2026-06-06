# 将项目中的 skills 通过 Junction 链接到 CodeWhale 的 skills 目录
# Junction 不需要管理员权限，且对绝大多数应用程序透明

$ErrorActionPreference = "Stop"

# 项目根目录（脚本所在目录）
$repoRoot = $PSScriptRoot

# CodeWhale skills 目录
$codewhaleSkillsDir = "$env:USERPROFILE\.codewhale\skills"

# 确保目标父目录存在
if (-not (Test-Path $codewhaleSkillsDir)) {
    Write-Host "Creating: $codewhaleSkillsDir"
    New-Item -ItemType Directory -Path $codewhaleSkillsDir -Force | Out-Null
}

# 24 个包含 SKILL.md 的项目 skill 目录
$skillDirs = @(
    "canvas-design",
    "code-dev",
    "code-explorer",
    "code-review",
    "code-testing",
    "codex-project-manager",
    "context-restore",
    "context-save",
    "debug-investigator",
    "developer-growth-analysis",
    "excalidraw-diagram",
    "frontend-design",
    "goal-loop",
    "hot-info-crawler",
    "humanizer",
    "knowledge-curator",
    "m-flow-memory",
    "mcp-builder",
    "ooda-decision-advisor",
    "plan-eng-review",
    "product-office-hours",
    "qa",
    "self-evolving-agent",
    "skill-creator"
)

$created = 0
$skipped = 0
$errors = 0

foreach ($skill in $skillDirs) {
    $source = Join-Path $repoRoot $skill
    $target = Join-Path $codewhaleSkillsDir $skill

    if (-not (Test-Path $source)) {
        Write-Host "[WARN] Source not found, skipping: $source" -ForegroundColor Yellow
        $skipped++
        continue
    }

    if (Test-Path $target) {
        $item = Get-Item $target -Force
        if ($item.LinkType -eq "Junction" -or $item.Attributes -match "ReparsePoint") {
            # 已存在 junction/symlink，先删除
            Write-Host "[INFO] Removing existing link: $target" -ForegroundColor Cyan
            Remove-Item $target -Force -Recurse
        }
        else {
            Write-Host "[SKIP] Target is a real directory, won't overwrite: $target" -ForegroundColor Yellow
            $skipped++
            continue
        }
    }

    try {
        New-Item -ItemType Junction -Path $target -Target $source -Force | Out-Null
        Write-Host "[OK] $skill  -->  $target" -ForegroundColor Green
        $created++
    }
    catch {
        Write-Host "[FAIL] $skill : $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor White
Write-Host "Created : $created" -ForegroundColor Green
Write-Host "Skipped : $skipped" -ForegroundColor Yellow
Write-Host "Errors  : $errors" -ForegroundColor Red
Write-Host ""
Write-Host "CodeWhale skills directory: $codewhaleSkillsDir" -ForegroundColor Gray
