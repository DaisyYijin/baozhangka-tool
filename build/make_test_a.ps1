# mkA.ps1 - generate test sheet A (5 cols x 10 rows) as xlsx
# Pure ASCII source; CJK via [char] codepoints (PS 5.1 no-BOM safety)
$ErrorActionPreference = "Stop"
$root = "G:\自动点击器"
$dir  = Join-Path $env:TEMP "xlsx_a_src"
# filename: 测试表A.xlsx
$cnName = [string][char]0x6D4B + [string][char]0x8BD5 + [string][char]0x8868 + "A"
$out  = Join-Path $root ("examples\" + $cnName + ".xlsx")
if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
New-Item -ItemType Directory -Path "$dir\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\xl\worksheets" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\xl\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root "examples") -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
function CS([int[]]$codes) { ($codes | ForEach-Object { [string][char]$_ }) -join '' }

# sharedStrings: 0..2 headers, 3=M 4=F, 5..14 = 10 names
$hName = CS @(0x59D3,0x540D)         # 姓名
$hSex  = CS @(0x6027,0x522B)         # 性别
$hBld  = CS @(0x8840,0x578B)         # 血型
$hAge  = CS @(0x5E74,0x9F84)         # 年龄
$hBd   = CS @(0x51FA,0x751F,0x65E5,0x671F)  # 出生日期
$nan   = CS @(0x7537)
$nv    = CS @(0x5973)
$names = @(
    (CS @(0x5F20,0x4E09)), (CS @(0x674E,0x56DB)), (CS @(0x738B,0x4E94)), (CS @(0x8D75,0x516D)),
    (CS @(0x9648,0x4E03)), (CS @(0x5468,0x516B)), (CS @(0x5434,0x4E5D)), (CS @(0x90D1,0x5341)),
    (CS @(0x5B59,0x4E00)), (CS @(0x94B1,0x4E8C))
)
$sx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="17" uniqueCount="17">'
$sx += '<si><t>' + $hName + '</t></si><si><t>' + $hSex + '</t></si><si><t>' + $hBld + '</t></si>'
$sx += '<si><t>' + $hAge + '</t></si><si><t>' + $hBd + '</t></si>'
$sx += '<si><t>' + $nan + '</t></si><si><t>' + $nv + '</t></si>'
foreach ($nm in $names) { $sx += '<si><t>' + $nm + '</t></si>' }
$sx += '</sst>'
[System.IO.File]::WriteAllText("$dir\xl\sharedStrings.xml", $sx, $utf8)

# worksheet: header + 10 rows; cols: 姓名(s) 性别(s) 血型(inlineStr) 年龄(num v) 出生日期(inlineStr)
$rows = '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>'
$blood = @('A','B','O','AB')
for ($i = 0; $i -lt 10; $i++) {
    $r   = $i + 2
    $si  = 7 + $i
    $g   = if ($i % 2 -eq 0) { 5 } else { 6 }       # 0,2,..=M; 1,3,..=F
    $bl  = $blood[$i % 4]
    $age = 25 + $i
    $bd  = "{0:D4}-{1:D2}-{2:D2}" -f (1980 + ($i * 2)), (($i % 12) + 1), (($i % 28) + 1)
    $rows += "<row r=`"$r`"><c r=`"A$r`" t=`"s`"><v>$si</v></c><c r=`"B$r`" t=`"s`"><v>$g</v></c><c r=`"C$r`" t=`"inlineStr`"><is><t>$bl</t></is></c><c r=`"D$r`"><v>$age</v></c><c r=`"E$r`" t=`"inlineStr`"><is><t>$bd</t></is></c></row>"
}
$wx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
$rows + '</sheetData></worksheet>'
[System.IO.File]::WriteAllText("$dir\xl\worksheets\sheet1.xml", $wx, $utf8)

# minimal OOXML scaffolding (same structure as verified generator)
[System.IO.File]::WriteAllText("$dir\[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>', $utf8)
[System.IO.File]::WriteAllText("$dir\_rels\.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', $utf8)
[System.IO.File]::WriteAllText("$dir\xl\workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>', $utf8)
[System.IO.File]::WriteAllText("$dir\xl\_rels\workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>', $utf8)

if (Test-Path $out) { Remove-Item $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($dir, $out)
Remove-Item $dir -Recurse -Force
Write-Output ("OK: " + $out + "  " + (Get-Item $out).Length + " bytes")
