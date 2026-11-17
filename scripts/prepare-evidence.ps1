param([Parameter(Mandatory=$true)][string]$SourceDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
public static class EvidenceCutout {
    public static void Make(string input, string output, int threshold, int[] polygon, int[] seeds, Rectangle crop, bool ink) {
        using (var original = new Bitmap(input))
        using (var source = crop.Width > 0 ? original.Clone(crop, PixelFormat.Format32bppArgb) : new Bitmap(original)) {
            int w = source.Width, h = source.Height;
            var removed = new bool[w*h];
            var colors = new Color[w*h];
            for(int y=0;y<h;y++) for(int x=0;x<w;x++) colors[y*w+x]=source.GetPixel(x,y);
            if (polygon != null && polygon.Length > 0) {
                using(var mask = new Bitmap(w,h)) using(var g = Graphics.FromImage(mask)) {
                    g.Clear(Color.Black);
                    var points = new Point[polygon.Length/2];
                    for(int i=0;i<points.Length;i++) points[i]=new Point(polygon[2*i],polygon[2*i+1]);
                    g.FillPolygon(Brushes.White,points);
                    for(int y=0;y<h;y++) for(int x=0;x<w;x++) removed[y*w+x]=mask.GetPixel(x,y).R==0;
                }
            } else if (!ink) {
                var queue = new Queue<int>();
                Action<int> add = p => {
                    if(p<0 || p>=w*h || removed[p]) return;
                    Color c=colors[p];
                    if(Math.Min(c.R,Math.Min(c.G,c.B))<threshold || Math.Max(c.R,Math.Max(c.G,c.B))-Math.Min(c.R,Math.Min(c.G,c.B))>22) return;
                    removed[p]=true; queue.Enqueue(p);
                };
                for(int x=0;x<w;x++){add(x);add((h-1)*w+x);}
                for(int y=0;y<h;y++){add(y*w);add(y*w+w-1);}
                if(seeds!=null) for(int i=0;i<seeds.Length;i+=2) add(seeds[i+1]*w+seeds[i]);
                while(queue.Count>0){int p=queue.Dequeue(),x=p%w,y=p/w;if(x>0)add(p-1);if(x<w-1)add(p+1);if(y>0)add(p-w);if(y<h-1)add(p+w);}
            }
            using(var result=new Bitmap(w,h,PixelFormat.Format32bppArgb)) {
                int left=w,top=h,right=0,bottom=0;
                for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
                    int p=y*w+x; Color c=colors[p]; int a=removed[p]?0:255;
                    if(ink) {a=Math.Max(0,Math.Min(255,(255-(c.R+c.G+c.B)/3)*255/220));c=Color.FromArgb(34,30,28);}
                    else if(a>0 && polygon==null) {
                        bool edge=(x>0&&removed[p-1])||(x<w-1&&removed[p+1])||(y>0&&removed[p-w])||(y<h-1&&removed[p+w]);
                        if(edge && c.R>180 && c.G>180 && c.B>180) {
                            a=Math.Max(30,255-(Math.Min(c.R,Math.Min(c.G,c.B))-180)*2);
                            c=Color.FromArgb(Math.Max(0,255-(255-c.R)*255/a),Math.Max(0,255-(255-c.G)*255/a),Math.Max(0,255-(255-c.B)*255/a));
                        }
                    }
                    result.SetPixel(x,y,Color.FromArgb(a,c));
                    if(a>15){left=Math.Min(left,x);right=Math.Max(right,x);top=Math.Min(top,y);bottom=Math.Max(bottom,y);}
                }
                if(left>right) throw new Exception("Empty cutout: "+input);
                left=Math.Max(0,left-8);top=Math.Max(0,top-8);right=Math.Min(w-1,right+8);bottom=Math.Min(h-1,bottom+8);
                using(var trimmed=result.Clone(new Rectangle(left,top,right-left+1,bottom-top+1),PixelFormat.Format32bppArgb)) trimmed.Save(output,ImageFormat.Png);
            }
        }
    }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$output = Join-Path $root 'assets\evidence'
[IO.Directory]::CreateDirectory($output) | Out-Null
$files = @(Get-ChildItem -LiteralPath $SourceDirectory -File | Sort-Object Name)
if ($files.Count -ne 13) { throw 'Expected the original set of 13 images. Review mapping before processing another collection.' }
# Original file order is recorded in assets/evidence/SOURCES.md.
$mapping = @(
    @{i=0;name='keys';threshold=225;seeds=@(291,217,264,235)},
    @{i=2;name='pocket-contents';threshold=242},
    @{i=3;name='pistol-dark';threshold=240;seeds=@(316,198)},
    @{i=4;name='banknotes';threshold=242},
    @{i=5;name='pistol-silver';threshold=245;seeds=@(370,440)},
    @{i=6;name='evidence-bag';threshold=247;polygon=@(67,64,489,56,492,104,500,377,67,375,75,147,70,83)},
    @{i=7;name='knife-tactical';threshold=240},
    @{i=8;name='cartridges';threshold=242},
    @{i=9;name='plant-sample';threshold=245;polygon=@(331,255,476,310,416,478,276,429)},
    @{i=10;name='phone';threshold=222},
    @{i=11;name='medicine';threshold=230;polygon=@(277,201,376,222,371,239,415,250,431,291,455,303,454,357,436,365,419,356,362,619,335,639,207,605,194,582,251,318,236,305,232,292,250,281,249,248,269,248)},
    @{i=12;name='knife-folding';threshold=224}
)
foreach($entry in $mapping) {
    [EvidenceCutout]::Make($files[$entry.i].FullName, (Join-Path $output ($entry.name+'.png')), $entry.threshold, $entry.polygon, $entry.seeds, [Drawing.Rectangle]::Empty, $false)
    Write-Output ('Prepared '+$entry.name)
}
# The sheet repeats two source patterns; preserve only the first two, not twenty duplicate files.
for($i=0;$i -lt 2;$i++) {
    [EvidenceCutout]::Make($files[1].FullName, (Join-Path $output ('fingerprint-'+($i+1)+'.png')), 240, $null, $null, (New-Object Drawing.Rectangle ($i*75),0,75,94), $true)
}
$images = @(Get-ChildItem -LiteralPath $output -Filter '*.png' | Sort-Object Name)
$sheet = New-Object Drawing.Bitmap 1000, ([int][Math]::Ceiling($images.Count/4.0)*260)
$graphics = [Drawing.Graphics]::FromImage($sheet)
$graphics.Clear([Drawing.Color]::FromArgb(54,40,60))
$font = New-Object Drawing.Font 'Arial',12
for($i=0;$i -lt $images.Count;$i++) {
    $image=[Drawing.Image]::FromFile($images[$i].FullName)
    $scale=[Math]::Min(220.0/$image.Width,210.0/$image.Height)
    $x=($i%4)*250; $y=[int][Math]::Floor($i/4)*260
    $graphics.DrawImage($image,[int]($x+15),[int]($y+10),[int]($image.Width*$scale),[int]($image.Height*$scale))
    $graphics.DrawString($images[$i].BaseName,$font,[Drawing.Brushes]::White,$x+10,$y+230)
    $image.Dispose()
}
$sheet.Save((Join-Path $root '.browser-check\cutout-contact.png'),[Drawing.Imaging.ImageFormat]::Png)
$font.Dispose();$graphics.Dispose();$sheet.Dispose()