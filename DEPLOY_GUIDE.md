# 📋 Guía de Deploy a Vercel - Tío Perro

## Paso 1: Preparar el Repositorio

```bash
cd "c:\Users\Jurni\Downloads\tio perro"

# Inicializar git
git init
git add .
git commit -m "Initial commit - Tío Perro POS"
```

## Paso 2: Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `tio-perro`
3. Descripción: "POS Sistema para Restaurante Tío Perro"
4. Selecciona Public o Private
5. NO inicialices con README (ya lo tienes)
6. Crea el repositorio

## Paso 3: Push a GitHub

```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tio-perro.git
git push -u origin main
```

## Paso 4: Deploy en Vercel

### Opción A: Via Web (Recomendado)

1. Ve a https://vercel.com
2. Sign up / Login con tu cuenta GitHub
3. Haz clic en "New Project"
4. Selecciona tu repositorio `tio-perro`
5. Vercel auto-detectará la estructura
6. En "Build & Development Settings":
   - Root Directory: `./`
   - Build Command: (dejar vacío)
   - Framework: `Other`

### Opción B: Via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Paso 5: Configurar Variables de Entorno

En el Dashboard de Vercel → Tu Proyecto → Settings → Environment Variables

Agrega:
```
DATABASE_URL = mongodb+srv://usuario:contraseña@cluster.mongodb.net/tio-perro
JWT_SECRET = (genera una clave segura - ej: openssl rand -hex 32)
```

## Paso 6: Configurar MongoDB Atlas

1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea una cuenta gratuita
3. Crea un Cluster (gratuito)
4. En "Network Access", agrega IP: 0.0.0.0/0 (acceso global)
5. Crea un usuario de base de datos
6. Copia la connection string
7. Pega en `DATABASE_URL` en Vercel

## URLs Resultantes

- **Frontend**: https://tio-perro.vercel.app (automática)
- **Backend**: https://tio-perro.vercel.app/api (desde el frontend)

## Variables de Entorno - Summary

### Backend (.env en Vercel)
```env
DATABASE_URL=mongodb+srv://usuario:pass@cluster0.xxxxx.mongodb.net/tio-perro
JWT_SECRET=tu-secret-key-segura
NODE_ENV=production
```

### Frontend (.env.local después de git clone)
```env
VITE_API_URL=https://tio-perro.vercel.app
```

## 🔧 Troubleshooting

### Error: "Cannot find module"
```bash
cd backend
npm install
cd ../frontend
npm install
```

### Build falla
- Verifica que `vercel.json` esté en la raíz
- Revisa los logs en Vercel Dashboard

### Socket.io no funciona
- Asegúrate que `VITE_API_URL` esté configurado
- Verifica CORS en backend/src/server.js

## 📝 Notas

- El frontend se sirve desde `/`
- Las rutas API van a `/api/*`
- WebSocket en `/socket.io`
- Todo se ejecuta en el mismo dominio

## 🚀 Updates Futuros

Después de hacer cambios locales:
```bash
git add .
git commit -m "Descripción del cambio"
git push
# Vercel automáticamente redeploy
```

---

¿Necesitas ayuda adicional? Revisa los logs en el Dashboard de Vercel.
