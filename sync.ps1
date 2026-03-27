$repoPath = "C:\Users\jiaji\Documents\github-project\my-life-system-skills"
Set-Location $repoPath
git add .
$status = git status --porcelain
if ($status) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto sync: $timestamp"
    git push
}
