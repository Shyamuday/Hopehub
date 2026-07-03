# Scaffolds Phase D/E portal apps from existing templates.
param([switch]$SkipNpmInstall)

$root = Split-Path -Parent $PSScriptRoot

function Scaffold-App {
  param(
    [string]$SourceApp,
    [string]$TargetApp,
    [array]$Replacements
  )
  $src = Join-Path $root "apps\$SourceApp"
  $dst = Join-Path $root "apps\$TargetApp"
  if (Test-Path $dst) {
    Write-Host "Skip existing $TargetApp"
    return
  }
  Write-Host "Scaffolding $TargetApp from $SourceApp..."
  robocopy $src $dst /E /XD node_modules dist .angular /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  Get-ChildItem -Path $dst -Recurse -File | ForEach-Object {
    $content = [IO.File]::ReadAllText($_.FullName)
    $updated = $content
    foreach ($pair in $Replacements) {
      $updated = $updated.Replace($pair[0], $pair[1])
    }
    if ($updated -ne $content) {
      [IO.File]::WriteAllText($_.FullName, $updated)
    }
  }
}

Scaffold-App 'accountant-web' 'branch-owner-web' @(
  @('accountant-web', 'branch-owner-web'),
  @('Accountant Portal', 'Branch Owner Portal'),
  @('accountant_token', 'branch_owner_token'),
  @('/accountant/', '/branch-owner/'),
  @('/accountant', '/branch-owner'),
  @('4700', '5200')
)

Scaffold-App 'clinic-manager-web' 'coordinator-web' @(
  @('clinic-manager-web', 'coordinator-web'),
  @('Clinic Manager', 'Patient Coordinator'),
  @('clinic_manager_token', 'coordinator_token'),
  @('/clinic-manager/', '/coordinator/'),
  @('/clinic-manager', '/coordinator'),
  @('4600', '5300')
)

Scaffold-App 'receptionist-web' 'callcenter-web' @(
  @('receptionist-web', 'callcenter-web'),
  @('Reception', 'Call Center'),
  @('reception_token', 'callcenter_token'),
  @('/reception/', '/call-center/'),
  @('/reception', '/call-center'),
  @('4500', '5400')
)

Scaffold-App 'clinic-manager-web' 'marketing-web' @(
  @('clinic-manager-web', 'marketing-web'),
  @('Clinic Manager', 'Marketing'),
  @('clinic_manager_token', 'marketing_token'),
  @('/clinic-manager/', '/marketing/'),
  @('/clinic-manager', '/marketing'),
  @('4600', '5500')
)

Scaffold-App 'supplier-web' 'corporate-wellness-web' @(
  @('supplier-web', 'corporate-wellness-web'),
  @('Supplier Portal', 'Corporate Wellness'),
  @('supplier_token', 'corporate_wellness_token'),
  @('/supplier/', '/corporate-wellness/'),
  @('/supplier', '/corporate-wellness'),
  @('4800', '5600')
)

Scaffold-App 'supplier-web' 'insurance-web' @(
  @('supplier-web', 'insurance-web'),
  @('Supplier Portal', 'Insurance Partner'),
  @('supplier_token', 'insurance_token'),
  @('/supplier/', '/insurance/'),
  @('/supplier', '/insurance'),
  @('4800', '5700')
)

Write-Host 'Done scaffolding ecosystem apps.'
