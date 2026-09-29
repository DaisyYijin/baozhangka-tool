# make_test_xlsx.ps1 - generate test.xlsx (real OOXML structure, Deflate compressed)
# NOTE: keep this script pure-ASCII (PowerShell 5.1 reads no-BOM files as ANSI).
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $PSScriptRoot "xlsx_src"
$out = Join-Path $root "examples\test.xlsx"

if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
New-Item -ItemType Directory -Path "$dir\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\xl\worksheets" -Force | Out-Null
New-Item -ItemType Directory -Path "$dir\xl\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $root "examples") -Force | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)

# shared strings: 0=click(CN) 1=input(CN) 2=text with comma+quote 3=rich-text
$shared = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="4">' +
'<si><t>' + [char]0x5355 + [char]0x51FB + '</t></si>' +
'<si><t>' + [char]0x8F93 + [char]0x5165 + '</t></si>' +
'<si><t>' + [char]0x4F60 + [char]0x597D + ',' + [char]0x4E16 + [char]0x754C + '"q"</t></si>' +
'<si><r><t>rich</t></r><r><t>' + [char]0x62FC + [char]0x63A5 + '</t></r></si>' +
'</sst>'
[System.IO.File]::WriteAllText("$dir\xl\sharedStrings.xml", $shared, $utf8)

# worksheet rows: 1=header-ish, 2=click 100,200 50x80, 3=input text2 clear=1, 4=input rich text
$sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
'<sheetData>' +
'<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>200</v></c><c r="C1" t="str"><v>nameX</v></c></row>' +
'<row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2"><v>100</v></c><c r="C2"><v>200</v></c><c r="D2"><v>50</v></c><c r="E2"><v>80</v></c></row>' +
'<row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3"><v>300</v></c><c r="C3"><v>400</v></c><c r="F3" t="s"><v>2</v></c><c r="G3"><v>1</v></c></row>' +
'<row r="4"><c r="A4" t="s"><v>1</v></c><c r="B4"><v>0</v></c><c r="C4"><v>0</v></c><c r="F4" t="s"><v>3</v></c><c r="G4"><v>1</v></c></row>' +
'<row r="5"><c r="A5" t="s"><v>3</v></c></row>' +
'</sheetData></worksheet>'
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
