# Run script for Multilingual Sign Language Translator

Write-Host "Starting SignTranslate AI..." -ForegroundColor Cyan

# Check for backend folder
if (Test-Path "backend") {
    Write-Host "`n[1/2] Starting Flask Backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\python app.py"
} else {
    Write-Host "Error: /backend folder not found." -ForegroundColor Red
}

# Start Frontend
Write-Host "`n[2/2] Starting Vite Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nServices are launching in separate windows." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend: http://localhost:5000"
Write-Host "`nPlease ensure dependencies are installed (pip install -r backend/requirements.txt && npm install)" -ForegroundColor Gray
