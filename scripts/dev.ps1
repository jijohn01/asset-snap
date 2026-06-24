$root = Split-Path $PSScriptRoot -Parent

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host "Backend  → http://localhost:8000"
Write-Host "Frontend → http://localhost:3000"
Write-Host "API Docs → http://localhost:8000/docs"
