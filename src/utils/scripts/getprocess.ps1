Start-Sleep -Seconds 2
$foundProcess = get-process -ProcessName pwsh | Select-Object ID,name,starttime | Sort-Object -Property StartTime -Descending;
return $foundProcess