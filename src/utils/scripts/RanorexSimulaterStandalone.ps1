param([String] $timeout, [String] $testlocation ,[String[]] $testArray)
##RanorexSimulaterStandalone.ps1 -timeout 5 -testlocation .\logs\ -testArray TC12345,TC67890
##$testArray ='TC1234', 'TC2345';
##$testlocation = ".\logs\";
##$timeout = 5;

Start-Sleep -Seconds 10
foreach($test in $testArray) 
{
    $newDate = Get-Date -Format "yyyyMMHHmmssffff";
    $newTestFolderLocation = $testlocation + $test +'_'+ $newDate;
    New-Item -Path $newTestFolderLocation -ItemType "directory";
    Start-Sleep -Seconds $timeout
    $newTestFileLocation = $newTestFolderLocation + "\" + $test + ".txt";
    $stringValue = $test + ' has delay for ' + $timeout + ' seconds';
    Set-Content $newTestFileLocation -Value $stringValue;
}
$foundPID = get-Process -id $PID;
return $foundPID;