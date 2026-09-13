$content = Get-Content -Path "C:\Users\praty_mvqal6v\.gemini\antigravity\brain\03d7c937-35d9-421f-89d4-8cb1436f961a\.system_generated\steps\26\content.md" -Raw
$matches = [regex]::Matches($content, '(?i)(?:code|html)\\?":\\?"(.*?)\\?"')
foreach ($m in $matches) {
    Write-Output $m.Groups[1].Value
}
