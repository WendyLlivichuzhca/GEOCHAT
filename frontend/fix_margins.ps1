$files = Get-ChildItem 'src\components\*.jsx' | Where-Object {
    $_.Name -notin @('Sidebar.jsx','LandingPage.jsx','PublicLayout.jsx','Login.jsx','WhalinkPublic.jsx','CampanaRedirect.jsx','ChatbotWidget.jsx')
}

foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    $c = $c.Replace('ml-28 lg:ml-32', 'ml-56')
    $c = $c.Replace('ml-28 lg:ml-36', 'ml-56')
    $c = $c.Replace('lg:ml-32', 'ml-56')
    $c = $c.Replace('ml-32', 'ml-56')
    $c = $c.Replace('ml-28', 'ml-56')
    $c = $c.Replace('pl-32', 'pl-56')
    $c = $c.Replace('pl-36', 'pl-56')
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($f.Name)"
    }
}
Write-Host "Done"
