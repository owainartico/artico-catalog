$response = Invoke-WebRequest -Uri 'https://name-a-bright-star.onrender.com/register.html' -UseBasicParsing
if ($response.Content -match 'v2\.1 Enhanced') {
    Write-Host "✅ VERSION DEPLOYED: v2.1 Enhanced marker found!"
    Write-Host ""
    Write-Host "Changes are LIVE. Features included:"
    Write-Host "- Milky Way band (3 overlapping layers, 0.18 opacity)"
    Write-Host "- Brighter constellation lines (0.75 opacity)"
    Write-Host "- Larger stars (1.2-6px range)"
    Write-Host "- Enhanced labels"
} else {
    Write-Host "❌ OLD VERSION: v2.1 marker NOT found"
    Write-Host "Render may still be deploying. Wait 2-3 more minutes."
}

# Also check for Milky Way code
if ($response.Content -match 'createMilkyWayBand') {
    Write-Host ""
    Write-Host "✅ Milky Way code confirmed in deployed HTML"
} else {
    Write-Host ""
    Write-Host "❌ Milky Way code NOT found - old version still cached"
}
