$root = "C:\Users\Admin\Documents\Betelgeuse-\apps"
$updated = @()
$errors = @()

Get-ChildItem -Path $root -Recurse -Filter "*.ts" |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
  ForEach-Object {
    $file = $_
    $content = [System.IO.File]::ReadAllText($file.FullName)
    if ($content -match 'templateUrl\s*:') { return }
    if ($content -notmatch 'template\s*:\s*`') { return }

    $pattern = '(?s)(\r?\n\s*)template:\s*`([\s\S]*?)`(\s*,)?'
    $match = [regex]::Match($content, $pattern)
    if (-not $match.Success) {
      $errors += "$($file.FullName): pattern not matched"
      return
    }

    $html = $match.Groups[2].Value
    $suffix = $match.Groups[3].Value
    $htmlName = "$($file.BaseName).html"
    $htmlPath = Join-Path $file.DirectoryName $htmlName
    [System.IO.File]::WriteAllText($htmlPath, $html)

    $replacement = "$($match.Groups[1].Value)templateUrl: './$htmlName'$suffix"
    $newContent = $content.Substring(0, $match.Index) + $replacement + $content.Substring($match.Index + $match.Length)
    [System.IO.File]::WriteAllText($file.FullName, $newContent)
    $updated += $file.FullName
  }

Write-Output "Updated $($updated.Count) files"
$updated | ForEach-Object { Write-Output $_ }
if ($errors.Count -gt 0) {
  Write-Output '--- ERRORS ---'
  $errors | ForEach-Object { Write-Output $_ }
}
