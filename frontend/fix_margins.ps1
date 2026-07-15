$files = Get-ChildItem 'src\components\*.jsx' | Where-Object {
    $_.Name -notin @('Sidebar.jsx','LandingPage.jsx','PublicLayout.jsx','Login.jsx','WhalinkPublic.jsx','CampanaRedirect.jsx','ChatbotWidget.jsx')
}

# Include Dashboard.jsx explicitly in the array if it is not caught
foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    $c = $c.Replace('ml-56', 'ml-64')
    $c = $c.Replace('pl-56', 'pl-64')
    # Just in case some files still have old offsets
    $c = $c.Replace('ml-28 lg:ml-32', 'ml-64')
    $c = $c.Replace('ml-28 lg:ml-36', 'ml-64')
    $c = $c.Replace('lg:ml-32', 'ml-64')
    $c = $c.Replace('ml-32', 'ml-64')
    $c = $c.Replace('ml-28', 'ml-64')
    $c = $c.Replace('pl-32', 'pl-64')
    $c = $c.Replace('pl-36', 'pl-64')
    
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($f.Name)"
    }
}
Write-Host "Done"
