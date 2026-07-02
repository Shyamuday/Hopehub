$originalPath = "C:\Users\Admin\Documents\Betelgeuse-\scripts\public-pages.original.ts"
$tsPath = "C:\Users\Admin\Documents\Betelgeuse-\apps\user-web\src\app\public-pages.component.ts"
$dir = Split-Path $tsPath -Parent
$original = [System.IO.File]::ReadAllText($originalPath)

$componentPattern = [regex]'@Component\(\{[\s\S]*?\}\)\s*export'
$sb = New-Object System.Text.StringBuilder
$lastIndex = 0

foreach ($m in [regex]::Matches($original, $componentPattern)) {
  [void]$sb.Append($original.Substring($lastIndex, $m.Index - $lastIndex))
  $block = $m.Value

  $selectorMatch = [regex]::Match($block, "selector:\s*'([^']+)'")
  $name = $selectorMatch.Groups[1].Value -replace '^app-', ''
  $htmlName = "${name}.component.html"

  $templateMatch = [regex]::Match($block, 'template:\s*`([\s\S]*?)`')
  if ($templateMatch.Success) {
  [System.IO.File]::WriteAllText((Join-Path $dir $htmlName), $templateMatch.Groups[1].Value)
    $newBlock = [regex]::Replace($block, 'template:\s*`[\s\S]*?`', "templateUrl: './$htmlName'")
  } else {
    $newBlock = $block
  }

  [void]$sb.Append($newBlock)
  $lastIndex = $m.Index + $m.Length
}

[void]$sb.Append($original.Substring($lastIndex))
[System.IO.File]::WriteAllText($tsPath, $sb.ToString())
Write-Output "Rebuilt public-pages.component.ts"
