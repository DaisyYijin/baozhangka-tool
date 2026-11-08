# make_test_xlsx_100.ps1 - generate 100-person test xlsx (name/gender/id, M/F alternating)
# NOTE: pure-ASCII body (PS 5.1 reads no-BOM as ANSI); CJK via [char] codes
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = "G:\自动点击器"
$dir  = Join-Path $env:TEMP "xlsx100_src"
# filename = 测试数据100人.xlsx (CJK via [char])
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
$surnames = @(
    0x5F20, 0x674E, 0x738B, 0x8D75, 0x9648,
    0x5468, 0x5434, 0x90D1, 0x5B59, 0x94B1
)   # 张 李 王 赵 陈 周 吴 郑 孙 钱
$givennames = @(
    0x4F1F, 0x82B3, 0x5A1C, 0x654F, 0x9759,
    0x5F3A, 0x78CA, 0x519B, 0x6D0B, 0x52C7
)   # 伟 芳 娜 敏 静 强 磊 军 洋 勇

$hdrName = CS @(0x59D3,0x540D)   # 姓名
$hdrSex  = CS @(0x6027,0x522B)   # 性别
$hdrId   = CS @(0x8BC1,0x4EF6,0x53F7)  # 证件号
$nan     = CS @(0x7537)          # 男
$nv      = CS @(0x5973)          # 女

# shared strings: 0..2 headers, 3=M 4=F, 5..104 = 100 names -> total 105
$sx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="105" uniqueCount="105">'
$sx += '<si><t>' + $hdrName + '</t></si><si><t>' + $hdrSex + '</t></si><si><t>' + $hdrId + '</t></si>'
$sx += '<si><t>' + $nan + '</t></si><si><t>' + $nv + '</t></si>'
for ($i = 0; $i -lt 10; $i++) {
    for ($j = 0; $j -lt 10; $j++) {
        $nm = [string][char]$surnames[$i] + [string][char]$givennames[$j]
        $sx += '<si><t>' + $nm + '</t></si>'
    }
}
$sx += '</sst>'
[System.IO.File]::WriteAllText("$dir\xl\sharedStrings.xml", $sx, $utf8)

# worksheet: header row + 100 data rows; gender alternates; id t="str" 18 digits
$rows = '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>'
for ($i = 0; $i -lt 100; $i++) {
    $r  = $i + 2
    $si = 5 + $i
    $g  = if ($i % 2 -eq 0) { 3 } else { 4 }
    $id = "11010119900101{0:D4}" -f (1000 + $i)
    $rows += '<row r="' + $r + '"><c r="A' + $r + '" t="s"><v>' + $si + '</v></c>' +
             '<c r="B' + $r + '" t="s"><v>' + $g + '</v></c>' +
             '<c r="C' + $r + '" t="str"><v>' + $id + '</v></c></row>'
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
