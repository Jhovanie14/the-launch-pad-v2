# Script to clean .next directory
Write-Host "Stopping any Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Waiting 2 seconds for processes to release files..."
Start-Sleep -Seconds 2

Write-Host "Attempting to remove .next directory..."
if (Test-Path .next) {
    try {
        # Try to remove files individually first
        Get-ChildItem -Path .next -Recurse -Force | Remove-Item -Force -ErrorAction SilentlyContinue
        Remove-Item -Path .next -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed .next directory!" -ForegroundColor Green
    } catch {
        Write-Host "Could not remove .next directory. Please:" -ForegroundColor Yellow
        Write-Host "1. Close VS Code and all terminals" -ForegroundColor Yellow
        Write-Host "2. Restart your computer" -ForegroundColor Yellow
        Write-Host "3. Or manually delete the .next folder in File Explorer" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host ".next directory does not exist." -ForegroundColor Green
}

Write-Host "Cleanup complete!" -ForegroundColor Green

