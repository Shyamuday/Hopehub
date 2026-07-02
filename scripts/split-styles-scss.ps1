$srcPath = "C:\Users\Admin\Documents\Betelgeuse-\apps\user-web\src\styles.scss"
$outDir = "C:\Users\Admin\Documents\Betelgeuse-\apps\user-web\src\styles"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$lines = [System.IO.File]::ReadAllLines($srcPath)

function Write-Partial([string]$name, [int]$start, [int]$end) {
  $content = ($lines[($start - 1)..($end - 1)] -join "`n") + "`n"
  [System.IO.File]::WriteAllText((Join-Path $outDir "_$name.scss"), $content)
  $count = $end - $start + 1
  Write-Output "$name`: $count lines"
}

Write-Partial "base" 3 90
Write-Partial "shell" 91 291
Write-Partial "public-pages" 293 497
Write-Partial "home" 499 746
Write-Partial "home-sections" 747 899
Write-Partial "sections" 900 1074
Write-Partial "dashboard" 1075 1246
Write-Partial "animations" 1247 1264
Write-Partial "responsive" 1265 1620

$main = @'
@import '@angular/cdk/overlay-prebuilt.css';

@import 'styles/base';
@import 'styles/shell';
@import 'styles/public-pages';
@import 'styles/home';
@import 'styles/home-sections';
@import 'styles/sections';
@import 'styles/dashboard';
@import 'styles/animations';
@import 'styles/responsive';
'@

[System.IO.File]::WriteAllText($srcPath, $main + "`n")
Write-Output "Updated styles.scss"
