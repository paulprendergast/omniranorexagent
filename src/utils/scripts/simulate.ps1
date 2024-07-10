param([String] $timeout, [String] $testlocation ,[String[]] $testArray)
##RanorexSimulaterStandalone.ps1 -timeout 5 -testlocation .\logs\ -testArray TC12345,TC67890
##$testArray ='TC1234', 'TC2345';
##$testlocation = ".\logs\";
##$timeout = 5;

Start-Sleep -Seconds 10
foreach($test in $testArray) 
{
    $newDate = Get-Date -Format "HH-mm";
    $newTestFolderLocation = $testlocation + $test +'-'+ $newDate;
    New-Item -Path $newTestFolderLocation -ItemType "directory";
    Start-Sleep -Seconds $timeout
    $newTestFileLocation = $newTestFolderLocation + "\" + $test + ".txt";
    $stringValue = $test + ' has delay for ' + $timeout + ' seconds';
    Set-Content $newTestFileLocation -Value $stringValue;
    $random = Get-Random -Maximum 2;
    $result = "";
    if($random -eq 0){
        $result = "Pass";
    } else {
        $result = "Fail";
    }
    $newTestFolderResult = $test +'-'+ $newDate + '-' + $result;
    Rename-Item -Path $newTestFolderLocation -NewName $newTestFolderResult;
    Start-Sleep -Seconds 30
}
$foundPID = get-Process -id $PID;
return $foundPID;