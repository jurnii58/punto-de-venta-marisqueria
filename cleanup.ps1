# Script para limpiar el proyecto - Ejecutar desde la raíz del proyecto

Write-Host "🧹 Limpiando proyecto Tío Perro..." -ForegroundColor Cyan

# Eliminar archivos Python innecesarios
Write-Host "`n📝 Eliminando archivos Python antiguo..." -ForegroundColor Yellow
Remove-Item -Force app.py -ErrorAction SilentlyContinue
Remove-Item -Force config.py -ErrorAction SilentlyContinue
Remove-Item -Force database.py -ErrorAction SilentlyContinue
Remove-Item -Force requirements.txt -ErrorAction SilentlyContinue

# Eliminar carpetas duplicadas
Write-Host "📁 Eliminando carpetas duplicadas..." -ForegroundColor Yellow
Remove-Item -Recurse -Force templates -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force static -ErrorAction SilentlyContinue

Write-Host "`n✅ Limpieza completada!" -ForegroundColor Green
Write-Host "`n📦 Tu proyecto está listo para Vercel" -ForegroundColor Green
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Lee DEPLOY_GUIDE.md para instrucciones de deploy"
Write-Host "2. git init && git add . && git commit -m 'Initial commit'"
Write-Host "3. Crea repo en GitHub y sube:"
Write-Host "   git remote add origin https://github.com/usuario/tio-perro.git"
Write-Host "   git push -u origin main"
Write-Host "4. Deploy en Vercel desde https://vercel.com"
Write-Host ""
