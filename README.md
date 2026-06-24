# Tío Perro - POS Sistema de Restaurante

Sistema de Punto de Venta (POS) para Restaurante de Mariscos Tío Perro, con Dashboard administrativo, Terminal de Cajero, Monitor de Cocina y Gestión de Órdenes.

## 📋 Estructura del Proyecto

```
tio-perro/
├── backend/              # API Node.js (Express + MongoDB)
│   ├── src/
│   │   ├── server.js    # Servidor principal
│   │   ├── socket.js    # WebSocket config
│   │   ├── config/      # Configuración DB
│   │   ├── controllers/ # Lógica de negocio
│   │   ├── models/      # Modelos MongoDB
│   │   ├── routes/      # Rutas API
│   │   ├── middlewares/ # Auth, etc
│   │   └── services/    # Servicios (impresoras, etc)
│   ├── package.json
│   └── vercel.json
├── frontend/            # App React (Vite)
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── vercel.json         # Configuración Vercel
└── README.md
```

## 🚀 Instalación Local

### Requisitos Previos
- Node.js 18+
- MongoDB
- npm o yarn

### Backend Setup

```bash
cd backend
npm install

# Crear archivo .env
cat > .env << EOF
DATABASE_URL=mongodb://localhost:27017/tio-perro
JWT_SECRET=tu-secret-key-aqui
NODE_ENV=development
PORT=5000
EOF

npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Crear archivo .env (si es necesario)
cat > .env << EOF
VITE_API_URL=http://localhost:5000
EOF

npm run dev
```

## 🌐 Variables de Entorno Requeridas

### Backend (.env)
```env
DATABASE_URL=mongodb+srv://usuario:contraseña@cluster.mongodb.net/tio-perro
JWT_SECRET=tu-secret-key-segura-aqui
NODE_ENV=production
PORT=5000
```

### Frontend (.env)
```env
VITE_API_URL=https://tu-backend-vercel.vercel.app
```

## 📦 Deploy a Vercel

### 1. Push a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tuusuario/tio-perro.git
git push -u origin main
```

### 2. Deploy en Vercel
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 3. Configurar Variables de Entorno en Vercel
En tu proyecto Vercel → Settings → Environment Variables:
- `DATABASE_URL`: tu URL de MongoDB Atlas
- `JWT_SECRET`: tu secret key

## 🛠 Scripts Disponibles

### Backend
```bash
npm run start   # Producción
npm run dev     # Desarrollo con nodemon
```

### Frontend
```bash
npm run dev     # Desarrollo
npm run build   # Build para producción
npm run preview # Preview del build
npm run lint    # Verificar código
```

## 📚 Funcionalidades

- ✅ Autenticación JWT
- ✅ Dashboard administrativo
- ✅ Terminal de cajero
- ✅ Monitor de cocina en tiempo real (WebSocket)
- ✅ Gestión de órdenes
- ✅ Gestión de pagos
- ✅ Integración con impresoras térmicas
- ✅ Gestión de ingredientes y menú

## 🔐 Seguridad

- Contraseñas hasheadas con bcryptjs
- Rate limiting en endpoints
- Helmet para seguridad HTTP
- CORS configurado
- Validación de tokens JWT

## 📞 Soporte

Para reportar bugs o sugerencias, abre un issue en el repositorio.

---

Hecho con ❤️ para Tío Perro
