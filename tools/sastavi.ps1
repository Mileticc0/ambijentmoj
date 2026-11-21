# Kopira ISTI header, futer, donju traku i dugme za poziv iz index.html u svaku stranicu iz tools/strane/.
# Rezultat su obični statični HTML fajlovi u korenu sajta (sajt nema build korak; ovo je samo alat za kopiranje).
# powershell -ExecutionPolicy Bypass -File tools\sastavi.ps1
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object Text.UTF8Encoding($false)
$idx = [IO.File]::ReadAllText((Join-Path $root 'index.html'), [Text.Encoding]::UTF8)
function Cut($s, $a, $b) { $i = $s.IndexOf($a); $j = $s.IndexOf($b, $i) + $b.Length; return $s.Substring($i, $j - $i) }
$header = (Cut $idx '<header class="hdr' '</header>') -replace '<header class="hdr[^"]*" data-ton="[^"]*">', '<header class="hdr{{TAMNO}}" data-ton="{{TON}}">'
$footer = Cut $idx '<footer' '</footer>'
$tabbar = (Cut $idx '<nav class="tabbar' '</nav>').Replace(' aria-current="page"', '')
$fab = Cut $idx '<a class="fab"' '</a>'
$glava = @'
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/logo/favicon-32.png">
<link rel="apple-touch-icon" href="assets/img/logo/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400&family=Schibsted+Grotesk:wght@500;600&display=swap">
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
'@
foreach ($f in Get-ChildItem (Join-Path $PSScriptRoot 'strane') -Filter *.html) {
  $src = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
  if ($src -notmatch '<!-- meni: ([^ ]*) \| ton: (\w+) -->') { Write-Warning "$($f.Name): nema oznake"; continue }
  $meni = $Matches[1]; $ton = $Matches[2]
  $h = $header.Replace('{{TON}}', $ton).Replace('{{TAMNO}}', $(if ($ton -in 'orah', 'antracit') { ' tamno' } else { '' }))
  $t = $tabbar
  if ($meni -and $meni -ne '-') {
    $h = $h.Replace("<a href=""$meni"">", "<a href=""$meni"" aria-current=""page"">")
    $t = $t.Replace("<a class=""tab"" href=""$meni"">", "<a class=""tab"" href=""$meni"" aria-current=""page"">")
  }
  $out = $src -replace '<!-- meni: [^>]*-->\r?\n', ''
  if ($out.Contains('{{GALERIJA}}')) { $out = $out.Replace('{{GALERIJA}}', [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'galerija.fragment.html'), [Text.Encoding]::UTF8).TrimEnd()) }
  $out = $out.Replace('{{GLAVA}}', $glava.TrimEnd()).Replace('{{HEADER}}', $h).Replace('{{FOOTER}}', $footer).Replace('{{TABBAR}}', $t).Replace('{{FAB}}', $fab)
  [IO.File]::WriteAllText((Join-Path $root $f.Name), $out, $utf8)
  $f.Name
}
