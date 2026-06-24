# Limpieza del Proyecto - Remover archivos innecesarios

## Archivos a Eliminar:

### 1. Archivos Python (Backend antiguo - NO se usa)
```bash
rm app.py
rm config.py
rm database.py
rm requirements.txt
```

### 2. Carpetas Duplicadas/Antiguas
```bash
rm -r templates/
rm -r static/
```

### 3. Script PowerShell (Para Windows)
Guarda esto en `cleanup.ps1` y ejecuta:

```powershell
# Eliminar archivos Python
Remove-Item -Force app.py -ErrorAction SilentlyContinue
Remove-Item -Force config.py -ErrorAction SilentlyContinue
Remove-Item -Force database.py -ErrorAction SilentlyContinue
Remove-Item -Force requirements.txt -ErrorAction SilentlyContinue

# Eliminar carpetas antiguas
Remove-Item -Recurse -Force templates -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force static -ErrorAction SilentlyContinue

Write-Host "✅ Limpieza completada" -ForegroundColor Green
```

## ¿Por qué eliminar estos archivos?

1. **Backend Python**: Tu backend real es Node.js (backend/src/server.js)
   - Los archivos Python (app.py, config.py, database.py) son código antiguo de Flask
   - Causarían confusión en el deploy

2. **Carpetas templates y static**: 
   - Son copias viejas/duplicadas
   - El frontend real es frontend/ (React + Vite)
   - El backend sirve archivos desde frontend/dist

## Estructura Final (Limpia)

```
tio-perro/
├── backend/              ← Node.js + MongoDB
├── frontend/             ← React + Vite
├── .env.example
├── .gitignore
├── README.md
├── DEPLOY_GUIDE.md
└── vercel.json
```

Mucho más limpio y fácil de mantener.
