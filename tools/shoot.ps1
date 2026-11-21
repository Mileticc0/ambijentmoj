# Screenshotovi preko headless Chrome/Edge (CDP), bez Node-a.
# powershell -ExecutionPolicy Bypass -File tools\shoot.ps1 -Url http://localhost:8080/index.html -Name index -Out screenshots
param(
  [string]$Url = 'http://localhost:8080/index.html',
  [string]$Name = 'index',
  [string]$Out = 'screenshots',
  [string]$Sizes = '1440x900,390x844,320x568',
  [string]$Suffix = '',
  [string]$Extra = ''   # JS izvršen posle učitavanja (npr. klik na uzorak)
)
$ErrorActionPreference = 'Stop'
$browser = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$port = 9333
$profile = Join-Path $env:TEMP "ma-shoot-profile"
$proc = Start-Process $browser -ArgumentList "--headless=new", "--remote-debugging-port=$port", "--user-data-dir=`"$profile`"", "--hide-scrollbars", "--no-first-run", "--disable-extensions", "about:blank" -PassThru
try {
  $tabs = $null
  for ($i = 0; $i -lt 50 -and -not $tabs; $i++) { Start-Sleep -Milliseconds 200; try { $tabs = Invoke-RestMethod "http://127.0.0.1:$port/json" } catch {} }
  $wsUrl = ($tabs | Where-Object { $_.type -eq 'page' } | Select-Object -First 1).webSocketDebuggerUrl
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(30)
  $ws.ConnectAsync([Uri]$wsUrl, [Threading.CancellationToken]::None).Wait()
  $script:id = 0
  $script:events = New-Object System.Collections.ArrayList
  function Recv() {
    $buf = New-Object byte[] 1048576; $ms = New-Object IO.MemoryStream
    do { $seg = New-Object ArraySegment[byte] -ArgumentList (, $buf); $r = $ws.ReceiveAsync($seg, [Threading.CancellationToken]::None).Result; $ms.Write($buf, 0, $r.Count) } while (-not $r.EndOfMessage)
    return [Text.Encoding]::UTF8.GetString($ms.ToArray())
  }
  function Cdp($method, $params = @{}) {
    $script:id++
    $msg = @{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $ws.SendAsync((New-Object ArraySegment[byte] -ArgumentList (, $bytes)), 'Text', $true, [Threading.CancellationToken]::None).Wait()
    while ($true) {
      $txt = Recv
      if ($txt -match ('^\{"id":' + $script:id + ',')) {
        $o = $txt | ConvertFrom-Json
        if ($o.error) { throw "$method : $($o.error.message)" }
        return $o.result
      }
      if ($txt -match '"method":"(Runtime.exceptionThrown|Log.entryAdded|Runtime.consoleAPICalled)"') { [void]$script:events.Add($txt) }
    }
  }
  function Eval($js) { return (Cdp 'Runtime.evaluate' @{ expression = $js; awaitPromise = $true; returnByValue = $true }).result.value }
  function Save($b64, $file) { [IO.File]::WriteAllBytes($file, [Convert]::FromBase64String($b64)); Write-Host "  $file" }

  Cdp 'Runtime.enable' | Out-Null; Cdp 'Log.enable' | Out-Null; Cdp 'Page.enable' | Out-Null
  New-Item -ItemType Directory -Force $Out | Out-Null
  foreach ($s in $Sizes.Split(',')) {
    $w, $h = $s.Split('x') | ForEach-Object { [int]$_ }
    $mobile = $w -lt 960
    Cdp 'Emulation.setDeviceMetricsOverride' @{ width = $w; height = $h; deviceScaleFactor = 1; mobile = $mobile } | Out-Null
    Cdp 'Emulation.setTouchEmulationEnabled' @{ enabled = $mobile; maxTouchPoints = 5 } | Out-Null
    Cdp 'Page.navigate' @{ url = $Url } | Out-Null
    Start-Sleep -Milliseconds 2500
    if ($Extra) { Eval $Extra | Out-Null; Start-Sleep -Milliseconds 800 }
    $first = (Cdp 'Page.captureScreenshot' @{ format = 'png' }).data
    Save $first (Join-Path $Out "$Name-$w$Suffix.png")
    # skrol kroz stranicu da se pokrenu reveal-i, pa nazad gore
    Eval "(async()=>{const H=document.documentElement.scrollHeight;for(let y=0;y<H;y+=innerHeight/2){scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}scrollTo(0,H);await new Promise(r=>setTimeout(r,300));return 1})()" | Out-Null
    # stanja sticky sekcija (viewport)
    $stanja = Eval "(()=>{const o=[];const k=document.querySelector('.krevet');if(k){const t=k.getBoundingClientRect().top+scrollY;const d=k.offsetHeight-innerHeight;o.push(['krevet-1',t+d*0.05],['krevet-3',t+d*0.9])}const u=document.querySelector('.uzorci');if(u)o.push(['uzorci',u.getBoundingClientRect().top+scrollY]);const s=document.querySelector('.tura');if(s){const t=s.getBoundingClientRect().top+scrollY;const d=Math.max(0,s.offsetHeight-innerHeight);o.push(['tura',t+d*0.45])}return JSON.stringify(o)})()"
    foreach ($st in ($stanja | ConvertFrom-Json)) {
      Eval "(async()=>{scrollTo(0,$([int]$st[1]));await new Promise(r=>setTimeout(r,700));return 1})()" | Out-Null
      Save (Cdp 'Page.captureScreenshot' @{ format = 'png' }).data (Join-Path $Out "$Name-$w$Suffix-$($st[0]).png")
    }
    Eval "(async()=>{scrollTo(0,0);await new Promise(r=>setTimeout(r,500));return 1})()" | Out-Null
    $info = Eval "JSON.stringify({sw:document.documentElement.scrollWidth,iw:innerWidth,H:document.documentElement.scrollHeight,wide:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left<-1)&&!e.closest('.uz-row,.tura-track,.ton-sloj')}).slice(0,8).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))})"
    Write-Host "  $w : $info"
    $H = ($info | ConvertFrom-Json).H
    $full = (Cdp 'Page.captureScreenshot' @{ format = 'jpeg'; quality = 70; captureBeyondViewport = $true; clip = @{ x = 0; y = 0; width = $w; height = $H; scale = 1 } }).data
    Save $full (Join-Path $Out "$Name-$w$Suffix-cela.jpg")
  }
  if ($script:events.Count) { Write-Host "KONZOLA:"; $script:events | ForEach-Object { Write-Host "  $_" } } else { Write-Host "Konzola: bez grešaka" }
} finally {
  try { Stop-Process -Id $proc.Id -Force } catch {}
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe' or Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*ma-shoot-profile*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
