# browser-harness keep-alive
#
# Chrome 136+ locks remote debugging down on the default profile, and M144+ asks for
# consent once per CDP connection ("Allow remote debugging?"). That gate is deliberate:
# the official chrome-devtools-mcp `--autoConnect` path hits the very same dialog.
# browser-harness spawns a background daemon that owns the connection, so the dialog is
# per daemon, not per browser call. This script holds one daemon open for the whole
# session, turning "a dialog per command" into "a dialog at most once per Chrome start".
#
# It only reads the current tab. It never navigates, clicks or closes anything.
#
# Autostart: browser-harness-keepalive.cmd in the Startup folder runs this hidden at logon.
# Run it by hand the same way after starting Chrome later in the day.

$ErrorActionPreference = "Continue"

$exe = (Get-Command browser-harness -ErrorAction SilentlyContinue).Source
if (-not $exe) { $exe = Join-Path $env:USERPROFILE ".local\bin\browser-harness.exe" }
if (-not (Test-Path -LiteralPath $exe)) {
    Write-Error "browser-harness not found. Install it with: uv tool install --python 3.12 browser-harness"
    exit 1
}

$stateDir = Join-Path $env:USERPROFILE ".config\browser-harness"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$log = Join-Path $stateDir "keep-alive.log"
$beat = Join-Path $stateDir "keep-alive.heartbeat"
Add-Content -LiteralPath $log -Value "$(Get-Date -Format o)  starting, exe=$exe"

# One connect, then hold. No periodic browser calls: every reconnect would re-open the
# CDP connection and make Chrome ask again. The heartbeat proves the client is alive.
$python = @"
import time

beat = r"$beat"
try:
    print("connected:", page_info().get("url"), flush=True)
except Exception as error:
    print("not connected yet:", error, flush=True)

while True:
    try:
        with open(beat, "a", encoding="utf-8") as handle:
            handle.write(str(int(time.time())) + chr(10))
    except Exception:
        pass
    time.sleep(60)
"@

while ($true) {
    $python | & $exe 2>&1 | Out-File -LiteralPath $log -Append -Encoding utf8
    Add-Content -LiteralPath $log -Value "$(Get-Date -Format o)  client exited, reconnecting in 15s"
    Start-Sleep -Seconds 15
}