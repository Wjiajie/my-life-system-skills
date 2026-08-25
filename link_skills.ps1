[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$SkillsDirectory,
    [switch]$CleanPersonal,
    [ValidateSet("Auto", "SymbolicLink", "Junction")]
    [string]$LinkMode = "Auto"
)

$syncScript = Join-Path $PSScriptRoot "sync.ps1"
& $syncScript @PSBoundParameters
exit $LASTEXITCODE
