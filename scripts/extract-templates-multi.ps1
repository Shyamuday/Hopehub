$filePath = "C:\Users\Admin\Documents\Betelgeuse-\apps\web\src\app\public-pages.component.ts"
$content = [System.IO.File]::ReadAllText($filePath)
$dir = Split-Path $filePath -Parent
$pattern = "selector:\s*'([^']+)'[\s\S]*?\r?\n\s*template:\s*`([\s\S]*?)`"
$count = 0

while ($content -match $pattern) {
  $selector = $Matches[1]
  $html = $Matches[2]
  $name = $selector -replace '^app-', ''
  $htmlName = "$name.component.html"
  $htmlPath = Join-Path $dir $htmlName
  [System.IO.File]::WriteAllText($htmlPath, $html)
  $full = $Matches[0]
  $newBlock = $full -replace 'template:\s*`[\s\S]*?`', "templateUrl: './$htmlName'"
  $content = $content.Replace($full, $newBlock)
  $count++
}

[System.IO.File]::WriteAllText($filePath, $content)
Write-Output "Extracted $count templates"
