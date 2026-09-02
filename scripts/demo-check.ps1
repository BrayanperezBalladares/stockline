[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$AdminEmail,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$MemberEmail,

  [Parameter()]
  [SecureString]$AdminPassword,

  [Parameter()]
  [SecureString]$MemberPassword,

  [Parameter()]
  [ValidateNotNullOrEmpty()]
  [string]$BaseUrl = "http://localhost:3000/api"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
$script:Passed = 0
$script:Failed = 0

function Write-Pass {
  param([Parameter(Mandatory = $true)][string]$Message)
  $script:Passed++
  Write-Host "PASS  $Message" -ForegroundColor Green
}

function Write-Fail {
  param([Parameter(Mandatory = $true)][string]$Message)
  $script:Failed++
  Write-Host "FAIL  $Message" -ForegroundColor Red
}

function ConvertFrom-SecureValue {
  param([Parameter(Mandatory = $true)][SecureString]$Value)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Read-ResponseContent {
  param([Parameter(Mandatory = $true)]$Response)

  if ($Response.PSObject.Properties.Name -contains "Content" -and $null -ne $Response.Content) {
    if ($Response.Content -is [string]) {
      return $Response.Content
    }

    if ($Response.Content.PSObject.Methods.Name -contains "ReadAsStringAsync") {
      try { return $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult() }
      catch { return "" }
    }
  }

  if ($Response.PSObject.Methods.Name -contains "GetResponseStream") {
    try { $stream = $Response.GetResponseStream() }
    catch { return "" }
    if ($null -ne $stream) {
      $reader = [IO.StreamReader]::new($stream)
      try { return $reader.ReadToEnd() }
      finally {
        $reader.Dispose()
        $stream.Dispose()
      }
    }
  }

  return ""
}

function ConvertFrom-OptionalJson {
  param([AllowEmptyString()][string]$Content)

  if ([string]::IsNullOrWhiteSpace($Content)) { return $null }
  try { return $Content | ConvertFrom-Json }
  catch { return $Content }
}

function Invoke-DemoRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body,
    [string]$AccessToken
  )

  $headers = @{}
  if (-not [string]::IsNullOrWhiteSpace($AccessToken)) {
    $headers.Authorization = "Bearer $AccessToken"
  }

  $parameters = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    Headers = $headers
    UseBasicParsing = $true
  }
  if ($null -ne $Body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = $Body | ConvertTo-Json -Compress
  }

  try {
    $response = Invoke-WebRequest @parameters
    $raw = [string]$response.Content
    return [pscustomobject]@{
      Status = [int]$response.StatusCode
      Body = ConvertFrom-OptionalJson -Content $raw
      Raw = $raw
    }
  }
  catch {
    $response = $_.Exception.Response
    if ($null -eq $response) { throw }

    $status = 0
    if ($response.PSObject.Properties.Name -contains "StatusCode") {
      $status = [int]$response.StatusCode
    }
    $raw = Read-ResponseContent -Response $response
    return [pscustomobject]@{
      Status = $status
      Body = ConvertFrom-OptionalJson -Content $raw
      Raw = $raw
    }
  }
}

function Assert-Status {
  param(
    [Parameter(Mandatory = $true)]$Response,
    [Parameter(Mandatory = $true)][int]$Expected,
    [Parameter(Mandatory = $true)][string]$Evidence
  )

  if ($Response.Status -eq $Expected) {
    Write-Pass "$Evidence (HTTP $Expected)"
    return $true
  }

  Write-Fail "${Evidence}: expected HTTP $Expected, received HTTP $($Response.Status)"
  return $false
}

function Test-Property {
  param([object]$Object, [Parameter(Mandatory = $true)][string]$Name)
  return $null -ne $Object -and $Object.PSObject.Properties.Name -contains $Name
}

function Test-TokenPair {
  param([object]$Body)
  return (Test-Property $Body "accessToken") -and
    (Test-Property $Body "refreshToken") -and
    -not [string]::IsNullOrWhiteSpace([string]$Body.accessToken) -and
    -not [string]::IsNullOrWhiteSpace([string]$Body.refreshToken)
}

if ($null -eq $AdminPassword) {
  $AdminPassword = Read-Host "Admin password" -AsSecureString
}
if ($null -eq $MemberPassword) {
  $MemberPassword = Read-Host "Member password" -AsSecureString
}

$adminPlain = $null
$memberPlain = $null

try {
  Write-Host "Stockline technical demo checks" -ForegroundColor Cyan
  Write-Host "API: $BaseUrl"
  Write-Host "No business data will be modified. Member refresh sessions will be revoked." -ForegroundColor Yellow
  Write-Host ""

  $adminPlain = ConvertFrom-SecureValue $AdminPassword
  $memberPlain = ConvertFrom-SecureValue $MemberPassword

  $health = Invoke-DemoRequest -Method GET -Path "/health"
  $healthOk = (Assert-Status $health 200 "API health")
  if ($healthOk -and (Test-Property $health.Body "status") -and $health.Body.status -eq "ok") {
    Write-Pass "Health payload reports status=ok"
  }
  else { Write-Fail "Health payload does not report status=ok" }

  $unauthorized = Invoke-DemoRequest -Method GET -Path "/users/me"
  [void](Assert-Status $unauthorized 401 "Protected route rejects missing token")

  $adminLogin = Invoke-DemoRequest -Method POST -Path "/login" -Body @{
    email = $AdminEmail
    password = $adminPlain
  }
  $adminLoginOk = (Assert-Status $adminLogin 200 "Admin login") -and (Test-TokenPair $adminLogin.Body)
  if ($adminLoginOk) { Write-Pass "Admin login returned access and refresh tokens" }
  else {
    Write-Fail "Admin login did not return a valid token pair"
    throw "Cannot continue without a valid admin token pair."
  }

  $adminMe = Invoke-DemoRequest -Method GET -Path "/users/me" -AccessToken $adminLogin.Body.accessToken
  $adminMeOk = Assert-Status $adminMe 200 "Admin can read /users/me"
  if ($adminMeOk -and (Test-Property $adminMe.Body "role") -and $adminMe.Body.role -eq "ADMIN") {
    Write-Pass "/users/me identifies the ADMIN role"
  }
  else { Write-Fail "/users/me did not identify the ADMIN role" }

  $users = Invoke-DemoRequest -Method GET -Path "/users" -AccessToken $adminLogin.Body.accessToken
  [void](Assert-Status $users 200 "Admin can list users")

  $memberLogin = Invoke-DemoRequest -Method POST -Path "/login" -Body @{
    email = $MemberEmail
    password = $memberPlain
  }
  $memberLoginOk = (Assert-Status $memberLogin 200 "Member login") -and (Test-TokenPair $memberLogin.Body)
  if ($memberLoginOk) { Write-Pass "Member login returned access and refresh tokens" }
  else {
    Write-Fail "Member login did not return a valid token pair"
    throw "Cannot continue without a valid member token pair."
  }

  $memberMe = Invoke-DemoRequest -Method GET -Path "/users/me" -AccessToken $memberLogin.Body.accessToken
  $memberMeOk = Assert-Status $memberMe 200 "Member can read /users/me"
  if ($memberMeOk -and (Test-Property $memberMe.Body "role") -and $memberMe.Body.role -eq "SUBSCRIPTION_L1") {
    Write-Pass "/users/me identifies the SUBSCRIPTION_L1 role"
  }
  else { Write-Fail "/users/me did not identify the SUBSCRIPTION_L1 role" }

  $forbidden = Invoke-DemoRequest -Method GET -Path "/users" -AccessToken $memberLogin.Body.accessToken
  [void](Assert-Status $forbidden 403 "RBAC prevents member from listing users")

  $inventory = Invoke-DemoRequest -Method GET -Path "/inventory" -AccessToken $memberLogin.Body.accessToken
  $inventoryOk = Assert-Status $inventory 200 "Authenticated member can query inventory"
  $rows = @($inventory.Body)
  if ($inventoryOk -and $rows.Count -gt 0) {
    $row = $rows[0]
    $relatedFields = @("productId", "productName", "locationId", "locationName", "quantity")
    $missingFields = @($relatedFields | Where-Object { -not (Test-Property $row $_) })
    if ($missingFields.Count -eq 0) {
      Write-Pass "Inventory query relates product, location, and quantity"
    }
    else { Write-Fail "Inventory row is missing related fields: $($missingFields -join ', ')" }
  }
  else { Write-Fail "Inventory query returned no row to prove the relationship" }

  $originalRefreshToken = [string]$memberLogin.Body.refreshToken
  $refresh = Invoke-DemoRequest -Method POST -Path "/refresh" -Body @{
    refreshToken = $originalRefreshToken
  }
  $refreshOk = (Assert-Status $refresh 200 "Refresh token rotation") -and (Test-TokenPair $refresh.Body)
  if ($refreshOk -and $refresh.Body.refreshToken -ne $originalRefreshToken) {
    Write-Pass "Refresh rotation returned a different refresh token"
  }
  else {
    Write-Fail "Refresh rotation did not return a different valid token"
    throw "Cannot verify revocation without the rotated token pair."
  }

  $oldRefresh = Invoke-DemoRequest -Method POST -Path "/refresh" -Body @{
    refreshToken = $originalRefreshToken
  }
  [void](Assert-Status $oldRefresh 401 "Rotated refresh token cannot be reused")

  $logout = Invoke-DemoRequest -Method POST -Path "/logout" -AccessToken $refresh.Body.accessToken
  [void](Assert-Status $logout 204 "Authenticated logout")

  $revokedRefresh = Invoke-DemoRequest -Method POST -Path "/refresh" -Body @{
    refreshToken = $refresh.Body.refreshToken
  }
  [void](Assert-Status $revokedRefresh 401 "Logout revokes the active refresh token")
}
catch {
  Write-Fail $_.Exception.Message
}
finally {
  $adminPlain = $null
  $memberPlain = $null
  $AdminPassword = $null
  $MemberPassword = $null
}

Write-Host ""
Write-Host "Result: $($script:Passed) PASS, $($script:Failed) FAIL" -ForegroundColor Cyan
if ($script:Failed -gt 0) { exit 1 }
exit 0
