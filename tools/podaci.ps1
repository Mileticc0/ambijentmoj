# Pravi assets/js/radovi-data.js iz tools/radovi.txt i assets/img/manifest.json
$root = Split-Path $PSScriptRoot -Parent
$m = Get-Content (Join-Path $root 'assets\img\manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$redovi = Get-Content (Join-Path $PSScriptRoot 'radovi.txt') -Encoding UTF8 | Where-Object { $_.Trim() }
$out = New-Object System.Collections.Generic.List[string]
foreach ($r in $redovi) {
  $f = $r.Split('|')
  $d = $m.($f[0])
  if (-not $d) { Write-Warning "nema slike: $($f[0])"; continue }
  $alt = $f[3].Replace("'", "\'")
  $out.Add("  ['$($f[0])', '$($f[1])', '$($f[2])', '$alt', $($d[0]), $($d[1])]")
}
$js = "/* Radovi: [fajl, prostorija, vizuelni ton, alt, širina, visina]. Ton je procena po fotografiji, ne šifra dekora. Pravi ga tools/podaci.ps1. */`nwindow.MA_RADOVI = [`n" + ($out -join ",`n") + "`n];`n"
[IO.File]::WriteAllText((Join-Path $root 'assets\js\radovi-data.js'), $js, (New-Object Text.UTF8Encoding($false)))
"radova: $($out.Count)"

# Statična galerija za radovi.html (radi i bez JS-a, dobra za SEO): grupe po prostoriji, svaka sa H2 i sidrom
$grupe = [ordered]@{ 'KUHINJA' = @('kuhinje', 'Kuhinje'); 'PLAKAR' = @('plakari', 'Plakari'); 'SPAVAĆA' = @('spavace', 'Spavaće sobe'); 'DNEVNA' = @('dnevne', 'Dnevne sobe'); 'KUPATILO' = @('kupatila', 'Kupatila'); 'HODNIK' = @('hodnici', 'Hodnici'); 'DEČIJA' = @('decije', 'Dečije sobe') }
$ime = @{ orah = 'Orah'; hrast = 'Hrast'; lak = 'Beli mat'; krem = 'Krem'; kamen = 'Kamen'; antracit = 'Antracit' }
$sb = New-Object Text.StringBuilder
foreach ($g in $grupe.Keys) {
  $id = $grupe[$g][0]; $naslov = $grupe[$g][1]
  [void]$sb.AppendLine("      <section class=""m-grupa"" id=""$id"" data-pr=""$id"" aria-labelledby=""h-$id"">")
  [void]$sb.AppendLine("        <h2 id=""h-$id"">$naslov</h2>")
  [void]$sb.AppendLine("        <ul class=""masonry"">")
  foreach ($r in $redovi) {
    $f = $r.Split('|'); if ($f[1] -ne $g) { continue }
    $d = $m.($f[0]); $alt = [Net.WebUtility]::HtmlEncode($f[3])
    $soba = (Get-Culture).TextInfo.ToTitleCase($f[1].ToLower())
    [void]$sb.AppendLine("          <li class=""m-rad"" data-mat=""$($f[2])""><button class=""m-btn"" type=""button"" data-f=""$($f[0])"" data-w=""$($d[0])"" data-h=""$($d[1])""><span class=""m-foto""><img src=""assets/img/$($f[0])-800.jpg"" srcset=""assets/img/$($f[0])-800.jpg 800w, assets/img/$($f[0])-1600.jpg 1600w"" sizes=""(min-width: 960px) 30vw, (min-width: 600px) 46vw, 92vw"" width=""$($d[0])"" height=""$($d[1])"" loading=""lazy"" decoding=""async"" alt=""$alt""></span><span class=""label"">$soba · $($ime[$f[2]])</span></button></li>")
  }
  [void]$sb.AppendLine("        </ul>")
  [void]$sb.AppendLine("      </section>")
}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'galerija.fragment.html'), $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
"galerija: ok"
