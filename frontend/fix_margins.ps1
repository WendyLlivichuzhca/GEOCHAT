$files = Get-ChildItem 'src\components\*.jsx' | Where-Object {
    $_.Name -notin @('Sidebar.jsx','LandingPage.jsx','PublicLayout.jsx','Login.jsx','WhalinkPublic.jsx','CampanaRedirect.jsx','ChatbotWidget.jsx')
}

foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    $c = $c.Replace('ml-64', 'ml-72')
    $c = $c.Replace('pl-64', 'pl-72')
    
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($f.Name)"
    }
}
Write-Host "Done"
