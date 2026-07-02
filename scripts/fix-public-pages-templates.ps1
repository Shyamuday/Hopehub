$originalPath = "C:\Users\Admin\Documents\Betelgeuse-\scripts\public-pages.original.ts"
$tsPath = "C:\Users\Admin\Documents\Betelgeuse-\apps\user-web\src\app\public-pages.component.ts"
$dir = Split-Path $tsPath -Parent
$original = [System.IO.File]::ReadAllText($originalPath)

$componentPattern = '@Component\(\{[\s\S]*?\}\)\s*export'
$matches = [regex]::Matches($original, $componentPattern)

foreach ($m in $matches) {
  $block = $m.Value
  $selectorMatch = [regex]::Match($block, "selector:\s*'([^']+)'")
  $templateMatch = [regex]::Match($block, 'template:\s*`([\s\S]*?)`')
  if (-not $selectorMatch.Success) { continue }

  $name = $selectorMatch.Groups[1].Value -replace '^app-', ''
  $htmlName = "${name}.component.html"
  $htmlPath = Join-Path $dir $htmlName

  if ($templateMatch.Success) {
    [System.IO.File]::WriteAllText($htmlPath, $templateMatch.Groups[1].Value)
    Write-Output "Wrote $htmlName from inline template"
  } elseif ($block -match "templateUrl:\s*'\./([^']+)'") {
    Write-Output "Skipped $htmlName (already external)"
  }
}

$tsContent = [System.IO.File]::ReadAllText($tsPath)
$tsContent = $tsContent -replace "(?s)(selector:\s*'app-[^']+'[\s\S]*?)templateUrl:\s*'\./treatments\.component\.html'", {
  param($m)
  if ($m.Value -match "selector:\s*'(app-[^']+)'") {
    $name = $Matches[1] -replace '^app-', ''
    return ($m.Value -replace "templateUrl:\s*'\./treatments\.component\.html'", "templateUrl: './${name}.component.html'")
  }
  return $m.Value
}
[System.IO.File]::WriteAllText($tsPath, $tsContent)
Write-Output "Fixed templateUrl references"
