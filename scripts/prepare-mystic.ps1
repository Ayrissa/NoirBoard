param([Parameter(Mandatory=$true)][string]$SourceDirectory)
$ErrorActionPreference='Stop'
# Reuse the cutout implementation without running the original 13-image batch.
$processor=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'prepare-evidence.ps1'))
$a=$processor.IndexOf('Add-Type -AssemblyName')
$b=$processor.IndexOf('$root = Split-Path')
& ([ScriptBlock]::Create($processor.Substring($a,$b-$a)))
$root=Split-Path $PSScriptRoot -Parent
$output=Join-Path $root 'assets\evidence'
$files=@(Get-ChildItem -LiteralPath $SourceDirectory -File | Sort-Object Name)
if($files.Count -ne 10){throw 'Expected the second collection of ten images.'}
$names=@('grimoire','tarot','palm-print','potion','blood-bag','skull','spirit-board','crystal-ball','amulet','crystal')
for($i=0;$i -lt $files.Count;$i++) {
    [EvidenceCutout]::Make($files[$i].FullName,(Join-Path $output ($names[$i]+'.png')),235,$null,$null,[Drawing.Rectangle]::Empty,($i -eq 2))
    Write-Output ('Prepared '+$names[$i])
}
$sheet=New-Object Drawing.Bitmap 1000,780
$g=[Drawing.Graphics]::FromImage($sheet);$g.Clear([Drawing.Color]::FromArgb(50,33,62))
$font=New-Object Drawing.Font 'Arial',12
for($i=0;$i -lt $names.Count;$i++) {
    $img=[Drawing.Image]::FromFile((Join-Path $output ($names[$i]+'.png')))
    $s=[Math]::Min(220.0/$img.Width,210.0/$img.Height);$x=($i%4)*250;$y=[int][Math]::Floor($i/4)*260
    $g.DrawImage($img,[int]($x+10),[int]($y+10),[int]($img.Width*$s),[int]($img.Height*$s))
    $g.DrawString($names[$i],$font,[Drawing.Brushes]::White,$x+10,$y+230);$img.Dispose()
}
$sheet.Save((Join-Path $root '.browser-check\mystic-contact.png'),[Drawing.Imaging.ImageFormat]::Png)
$font.Dispose();$g.Dispose();$sheet.Dispose()