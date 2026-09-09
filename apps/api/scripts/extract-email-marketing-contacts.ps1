param(
  [Parameter(Mandatory = $true)][string]$InputDirectory,
  [Parameter(Mandatory = $true)][string]$OutputFile
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic

function New-TextSet {
  return ,([System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase))
}

function Clean-Text([object]$Value) {
  if ($null -eq $Value) { return $null }
  $text = ([string]$Value).Trim()
  if ($text) { return $text }
  return $null
}

function Convert-OrderDate([object]$Value) {
  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return $null }
  if ($Value -is [double] -or $Value -is [int]) {
    try { return [datetime]::FromOADate([double]$Value).ToUniversalTime() } catch { return $null }
  }
  $parsed = [datetime]::MinValue
  if ([datetime]::TryParse([string]$Value, [ref]$parsed)) { return $parsed.ToUniversalTime() }
  return $null
}

function Convert-Amount([object]$Value) {
  $number = 0.0
  $text = ([string]$Value) -replace '[^0-9.\-]', ''
  if ([double]::TryParse($text, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return [math]::Max(0, $number)
  }
  return 0.0
}

function Add-DelimitedValues($Set, [object]$Value) {
  $text = Clean-Text $Value
  if (-not $text) { return }
  foreach ($item in ($text -split '[,;|]')) {
    $clean = $item.Trim()
    if ($clean) { [void]$Set.Add($clean) }
  }
}

function Get-OrCreateContact([hashtable]$Contacts, [string]$Email) {
  $normalized = $Email.Trim().ToLowerInvariant()
  if ($normalized -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { return $null }
  if (-not $Contacts.ContainsKey($normalized)) {
    $Contacts[$normalized] = [pscustomobject]@{
      email = $normalized
      name = $null
      mobile = $null
      alternatePhone = $null
      addressLine1 = $null
      addressLine2 = $null
      landmark = $null
      city = $null
      state = $null
      postalCode = $null
      sourceChannel = $null
      latestProfileAt = $null
      firstOrderAt = $null
      lastOrderAt = $null
      sourceSegments = New-TextSet
      tags = New-TextSet
      productNames = New-TextSet
      productSkus = New-TextSet
      paymentMethods = New-TextSet
      orderStatuses = New-TextSet
      orderTotals = @{}
    }
  }
  return $Contacts[$normalized]
}

function Add-OrderRow {
  param(
    [hashtable]$Contacts,
    [string]$Email,
    [string]$OrderKey,
    [object]$OrderDate,
    [object]$OrderTotal,
    [string]$Name,
    [string]$Mobile,
    [string]$AlternatePhone,
    [string]$AddressLine1,
    [string]$AddressLine2,
    [string]$Landmark,
    [string]$City,
    [string]$State,
    [string]$PostalCode,
    [string]$SourceChannel,
    [string]$SourceSegment,
    [string]$Tags,
    [string]$ProductName,
    [string]$ProductSku,
    [string]$PaymentMethod,
    [string]$OrderStatus
  )
  $contact = Get-OrCreateContact $Contacts $Email
  if ($null -eq $contact) { return }
  $date = Convert-OrderDate $OrderDate
  if ($date) {
    if (-not $contact.firstOrderAt -or $date -lt $contact.firstOrderAt) { $contact.firstOrderAt = $date }
    if (-not $contact.lastOrderAt -or $date -gt $contact.lastOrderAt) { $contact.lastOrderAt = $date }
  }
  $useProfile = -not $contact.latestProfileAt -or ($date -and $date -ge $contact.latestProfileAt)
  if ($useProfile) {
    foreach ($field in 'name','mobile','alternatePhone','addressLine1','addressLine2','landmark','city','state','postalCode','sourceChannel') {
      $value = Clean-Text (Get-Variable -Name $field -ValueOnly)
      if ($value) { $contact.$field = $value }
    }
    if ($date) { $contact.latestProfileAt = $date }
  }
  if ($SourceSegment) { [void]$contact.sourceSegments.Add($SourceSegment) }
  Add-DelimitedValues $contact.tags $Tags
  if ($ProductName) { [void]$contact.productNames.Add($ProductName.Trim()) }
  if ($ProductSku) { [void]$contact.productSkus.Add($ProductSku.Trim()) }
  if ($PaymentMethod) { [void]$contact.paymentMethods.Add($PaymentMethod.Trim()) }
  if ($OrderStatus) { [void]$contact.orderStatuses.Add($OrderStatus.Trim()) }
  $key = if ($OrderKey) { $OrderKey.Trim() } else { "row:$($contact.orderTotals.Count):${OrderDate}:${OrderTotal}" }
  $amount = Convert-Amount $OrderTotal
  if (-not $contact.orderTotals.ContainsKey($key) -or $amount -gt $contact.orderTotals[$key]) {
    $contact.orderTotals[$key] = $amount
  }
}

function Header-Index([string[]]$Headers, [string]$Name) {
  for ($index = 0; $index -lt $Headers.Count; $index++) {
    if ($Headers[$index].Trim() -eq $Name) { return $index }
  }
  return -1
}

$resolvedInput = (Resolve-Path -LiteralPath $InputDirectory).Path
$resolvedOutput = [IO.Path]::GetFullPath($OutputFile)
$contacts = @{}
$rowCount = 0

foreach ($file in Get-ChildItem -LiteralPath $resolvedInput -Filter *.csv -File) {
  $parser = [Microsoft.VisualBasic.FileIO.TextFieldParser]::new($file.FullName)
  try {
    $parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
    $parser.SetDelimiters(',')
    $parser.HasFieldsEnclosedInQuotes = $true
    $headers = [string[]]$parser.ReadFields()
    $indexes = @{}
    foreach ($name in 'Order ID','Channel Created At','Channel','Status','Product Name','Channel SKU','Customer Name','Customer Email','Customer Mobile','Customer Alternate Phone','Address Line 1','Address Line 2','Address City','Address State','Address Pincode','Payment Method','Order Total','Order Tags') {
      $indexes[$name] = Header-Index $headers $name
    }
    while (-not $parser.EndOfData) {
      $fields = $parser.ReadFields()
      $value = { param($name) $index = $indexes[$name]; if ($index -ge 0 -and $index -lt $fields.Count) { return Clean-Text $fields[$index] }; return $null }
      $email = & $value 'Customer Email'
      if ($email) {
        Add-OrderRow -Contacts $contacts -Email $email -OrderKey (& $value 'Order ID') -OrderDate (& $value 'Channel Created At') -OrderTotal (& $value 'Order Total') -Name (& $value 'Customer Name') -Mobile (& $value 'Customer Mobile') -AlternatePhone (& $value 'Customer Alternate Phone') -AddressLine1 (& $value 'Address Line 1') -AddressLine2 (& $value 'Address Line 2') -Landmark $null -City (& $value 'Address City') -State (& $value 'Address State') -PostalCode (& $value 'Address Pincode') -SourceChannel (& $value 'Channel') -SourceSegment $file.BaseName -Tags (& $value 'Order Tags') -ProductName (& $value 'Product Name') -ProductSku (& $value 'Channel SKU') -PaymentMethod (& $value 'Payment Method') -OrderStatus (& $value 'Status')
      }
      $rowCount++
    }
  } finally {
    $parser.Close()
  }
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  foreach ($file in Get-ChildItem -LiteralPath $resolvedInput -Filter *.xlsx -File) {
    $workbook = $excel.Workbooks.Open($file.FullName, 0, $true)
    try {
      foreach ($sheet in $workbook.Worksheets) {
        $used = $sheet.UsedRange
        $values = $used.Value2
        $columnCount = $used.Columns.Count
        $rowLimit = $used.Rows.Count
        $indexes = @{}
        foreach ($name in 'Name','Status','Tags','Created at','Lineitem name','Total','Lineitem sku','Shipping Name','Shipping Address1','Shipping Address2','Landmark','Shipping City','Shipping Province Name','Shipping Zip','Email','Shipping Phone','Payment Method') {
          $indexes[$name] = 0
          for ($column = 1; $column -le $columnCount; $column++) {
            if ((Clean-Text $values[1, $column]) -eq $name) { $indexes[$name] = $column; break }
          }
        }
        for ($row = 2; $row -le $rowLimit; $row++) {
          $raw = { param($name) $column = $indexes[$name]; if ($column -gt 0) { return $values[$row, $column] }; return $null }
          $value = { param($name) $column = $indexes[$name]; if ($column -gt 0) { return Clean-Text $values[$row, $column] }; return $null }
          $email = & $value 'Email'
          if ($email) {
            Add-OrderRow -Contacts $contacts -Email $email -OrderKey (& $value 'Name') -OrderDate (& $raw 'Created at') -OrderTotal (& $raw 'Total') -Name (& $value 'Shipping Name') -Mobile (& $value 'Shipping Phone') -AlternatePhone $null -AddressLine1 (& $value 'Shipping Address1') -AddressLine2 (& $value 'Shipping Address2') -Landmark (& $value 'Landmark') -City (& $value 'Shipping City') -State (& $value 'Shipping Province Name') -PostalCode (& $value 'Shipping Zip') -SourceChannel 'SHOPIFY_EXPORT' -SourceSegment $sheet.Name -Tags (& $value 'Tags') -ProductName (& $value 'Lineitem name') -ProductSku (& $value 'Lineitem sku') -PaymentMethod (& $value 'Payment Method') -OrderStatus (& $value 'Status')
          }
          $rowCount++
        }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($used)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
      }
    } finally {
      $workbook.Close($false)
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
    }
  }
} finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}

$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory)) { [void](New-Item -ItemType Directory -Path $outputDirectory) }
$writer = [IO.StreamWriter]::new($resolvedOutput, $false, [Text.UTF8Encoding]::new($false))
try {
  foreach ($contact in $contacts.Values | Sort-Object email) {
    $total = ($contact.orderTotals.Values | Measure-Object -Sum).Sum
    $record = [ordered]@{
      email = $contact.email
      name = $contact.name
      mobile = $contact.mobile
      alternatePhone = $contact.alternatePhone
      addressLine1 = $contact.addressLine1
      addressLine2 = $contact.addressLine2
      landmark = $contact.landmark
      city = $contact.city
      state = $contact.state
      postalCode = $contact.postalCode
      sourceChannel = $contact.sourceChannel
      sourceSegments = @($contact.sourceSegments)
      tags = @($contact.tags)
      productNames = @($contact.productNames)
      productSkus = @($contact.productSkus)
      paymentMethods = @($contact.paymentMethods)
      orderStatuses = @($contact.orderStatuses)
      firstOrderAt = if ($contact.firstOrderAt) { $contact.firstOrderAt.ToString('o') } else { $null }
      lastOrderAt = if ($contact.lastOrderAt) { $contact.lastOrderAt.ToString('o') } else { $null }
      orderCount = $contact.orderTotals.Count
      totalOrderValue = [math]::Round([double]$total, 2)
      currency = 'INR'
    }
    $writer.WriteLine(($record | ConvertTo-Json -Compress -Depth 4))
  }
} finally {
  $writer.Dispose()
}

$coverage = @{
  contacts = $contacts.Count
  sourceRows = $rowCount
  withMobile = @($contacts.Values | Where-Object mobile).Count
  withAddress = @($contacts.Values | Where-Object addressLine1).Count
  withCity = @($contacts.Values | Where-Object city).Count
  withPostalCode = @($contacts.Values | Where-Object postalCode).Count
  withOrders = @($contacts.Values | Where-Object { $_.orderTotals.Count -gt 0 }).Count
  withOrderDates = @($contacts.Values | Where-Object lastOrderAt).Count
  outputBytes = (Get-Item -LiteralPath $resolvedOutput).Length
}
$coverage | ConvertTo-Json -Compress
