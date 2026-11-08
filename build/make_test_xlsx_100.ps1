﻿# make_test_xlsx_100.ps1 - generate 100-person test xlsx
# Columns: name / gender / id-card / person-category / phone  (M/F alternating)
# NOTE: body must stay pure-ASCII for PS5.1 (no-BOM); CJK via [char]; run the BOM-prefixed copy
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = "G:\自动点击器"
$dir  = Join-Path $env:TEMP "xlsx100_src"
# filename = 测试数据100人.xlsx
$cnName = [string][char]0x6D4B + [string][char]0x8BD5 + [string][char]0x6570 + [string][char]0x636E + "100" + [string][char]0x4EBA
$out  = Join-Path $root ("examples\" + $cnName + ".xlsx")

if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
New-Item -ItemType Directory -Path "$dir\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\xl\worksheets" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\xl\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root "examples") -Force | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)
function CS([int[]]$codes) { ($codes | ForEach-Object { [string][char]$_ }) -join '' }

# 10 surnames x 10 given names = 100 unique names
$surnames = @(0x5F20,0x674E,0x738B,0x8D75,0x9648,0x5468,0x5434,0x90D1,0x5B59,0x94B1)   # 张李王赵陈周吴郑孙钱
$given    = @(0x4F1F,0x82B3,0x5A1C,0x654F,0x9759,0x5F3A,0x78CA,0x519B,0x6D0B,0x52C7)   # 伟芳娜敏静强磊军洋勇

$h0 = CS @(0x59D3,0x540D)             # 姓名
$h1 = CS @(0x6027,0x522B)             # 性别
$h2 = CS @(0x8BC1,0x4EF6,0x53F7)      # 证件号
$h3 = CS @(0x4EBA,0x5458,0x7C7B,0x522B)   # 人员类别
$h4 = CS @(0x8054,0x7CFB,0x7535,0x8BDD)   # 联系电话
$nan = CS @(0x7537)                   # 男
$nv  = CS @(0x5973)                   # 女
# categories: 在职/退休/居民/学生
$cats = @(
    (CS @(0x5728,0x804C)),
    (CS @(0x9000,0x4F11)),
    (CS @(0x5C45,0x6C11)),
    (CS @(0x5B66,0x751F))
)

# shared strings: 0-4 headers, 5=M 6=F, 7..106 = 100 names, 107..110 = 4 categories
$tot = 111
$sx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
"<sst xmlns=`"http://schemas.openxmlformats.org/spreadsheetml/2006/main`" count=`"$tot`" uniqueCount=`"$tot`">"
$sx += '<si><t>' + $h0 + '</t></si><si><t>' + $h1 + '</t></si><si><t>' + $h2 + '</t></si>'
$sx += '<si><t>' + $h3 + '</t></si><si><t>' + $h4 + '</t></si>'
$sx += '<si><t>' + $nan + '</t></si><si><t>' + $nv + '</t></si>'
for ($i = 0; $i -lt 10; $i++) {
    for ($j = 0; $j -lt 10; $j++) {
        $nm = [string][char]$surnames[$i] + [string][char]$given[$j]
        $sx += '<si><t>' + $nm + '</t></si>'
    }
}
foreach ($c in $cats) { $sx += '<si><t>' + $c + '</t></si>' }
$sx += '</sst>'
[System.IO.File]::WriteAllText("$dir\xl\sharedStrings.xml", $sx, $utf8)

# worksheet: header + 100 rows x 5 cols
#  A=name(s)  B=gender(s)  C=id(t=str)  D=category(s)  E=phone(t=str)
$rows = '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c>' +
        '<c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>'
for ($i = 0; $i -lt 100; $i++) {
    $r  = $i + 2
    $si = 7 + $i
    $g  = if ($i % 2 -eq 0) { 5 } else { 6 }
    $cat = 107 + ($i % 4)
    $id    = "11010119900101{0:D4}" -f (1000 + $i)
    $phone = "138{0:D8}" -f $i
    $rows += '<row r="' + $r + '">' +
             '<c r="A' + $r + '" t="s"><v>' + $si + '</v></c>' +
             '<c r="B' + $r + '" t="s"><v>' + $g + '</v></c>' +
             '<c r="C' + $r + '" t="str"><v>' + $id + '</v></c>' +
             '<c r="D' + $r + '" t="s"><v>' + $cat + '</v></c>' +
             '<c r="E' + $r + '" t="str"><v>' + $phone + '</v></c></row>'
}
$sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
$rows + '</sheetData></worksheet>'
[System.IO.File]::WriteAllText("$dir\xl\worksheets\sheet1.xml", $sheet, $utf8)

$workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
'<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
[System.IO.File]::WriteAllText("$dir\xl\workbook.xml", $workbook, $utf8)

$wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
'</Relationships>'
[System.IO.File]::WriteAllText("$dir\xl\_rels\workbook.xml.rels", $wbRels, $utf8)

$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
'</Relationships>'
[System.IO.File]::WriteAllText("$dir\_rels\.rels", $rootRels, $utf8)

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
'<Default Extension="xml" ContentType="application/xml"/>' +
'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
'<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
'</Types>'
[System.IO.File]::WriteAllText("$dir\[Content_Types].xml", $contentTypes, $utf8)

if (Test-Path $out) { Remove-Item $out -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($dir, $out, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Output ("OK: " + $out + "  " + (Get-Item $out).Length + " bytes")
