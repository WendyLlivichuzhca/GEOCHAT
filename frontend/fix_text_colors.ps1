$files = Get-ChildItem -Recurse -Include *.jsx, *.css -Path 'src'

foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    
    # Replace the dark purple text color with the landing page's slate-900 color
    $c = $c.Replace('#1e1b4b', '#0f172a')
    $c = $c.Replace('#1E1B4B', '#0f172a')
    
    # Also replace any other leftover purple variables or selections
    $c = $c.Replace('color: #1e1b4b', 'color: #0f172a')
    
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Updated text color in: $($f.Name)"
    }
}
Write-Host "Done"
