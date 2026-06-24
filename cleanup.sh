#!/bin/bash
# Script para limpiar el proyecto - Ejecutar desde la raíz del proyecto

echo "🧹 Limpiando proyecto Tío Perro..."

# Eliminar archivos Python innecesarios
echo ""
echo "📝 Eliminando archivos Python antiguo..."
rm -f app.py
rm -f config.py
rm -f database.py
rm -f requirements.txt

# Eliminar carpetas duplicadas
echo "📁 Eliminando carpetas duplicadas..."
rm -rf templates
rm -rf static

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "📦 Tu proyecto está listo para Vercel"
echo ""
echo "Próximos pasos:"
echo "1. Lee DEPLOY_GUIDE.md para instrucciones de deploy"
echo "2. git init && git add . && git commit -m 'Initial commit'"
echo "3. Crea repo en GitHub y sube:"
echo "   git remote add origin https://github.com/usuario/tio-perro.git"
echo "   git push -u origin main"
echo "4. Deploy en Vercel desde https://vercel.com"
