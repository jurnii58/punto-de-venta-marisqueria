# Marisquería El Tío Perro - Sistema POS & Cocina (PWA)

Este es un sistema de Punto de Venta (POS) y Monitoreo de Cocina de gama premium, diseñado especialmente para **Marisquería El Tío Perro**. La plataforma está completamente optimizada para dispositivos móviles (celulares y tablets), permitiendo su instalación como una aplicación nativa (**PWA**) y su uso en red local sin depender de conexión a internet externa.

---

## 🚀 Características Clave

### 1. Mapa de Sala y Comandas (Meseros)
*   **Mapa Interactivo**: Representación gráfica y circular de las mesas con indicación de sillas (capacidad), estatus (libre/ocupada) y consumo acumulado en dólares en tiempo real.
*   **Toma de Pedidos y Notas**: Envío automatizado a cocina con modificadores específicos (ej. "sin cilantro", "con salsa aparte").
*   **Optimizaciones Móviles**:
    *   **Vibración Háptica (Vibration API)**: Respuesta táctil física en el celular del mesero al presionar cantidades, ocupar/liberar mesas y enviar pedidos.
    *   **Reseteo Automático**: Al liberar una mesa, sus comandas activas se saldan automáticamente en efectivo para registrar los ingresos y dejar la mesa en ceros para el próximo comensal.

### 2. Monitor de Cocina y Barra (Cocineros / Baristas)
*   **Segmentación por Estaciones**: División de comandas en tiempo real para **Barra Fría** (ceviches, cócteles), **Cocina Caliente** (pescados, caldos) y **Bebidas**.
*   **Optimizaciones Móviles**:
    *   **Timbre de Cocina ("Ding-Ding")**: Alertas de sonido sintetizadas nativamente (Web Audio API offline-safe) que suenan cada vez que entra un nuevo platillo a la estación de trabajo.
    *   **Pantalla Siempre Encendida (Wake Lock API)**: Previene que el dispositivo de cocina suspenda o apague la pantalla mientras el monitor está abierto.
    *   **Control de Preparación**: Botones táctiles grandes para marcar platos "En Preparación" y "Entregados" que se sincronizan con la base de datos.

### 3. Terminal de Caja (Cajeros)
*   **Fusión e Historial de Mesa**: Agrupa comandas múltiples de la misma mesa en una sola tarjeta, sumando los montos y consolidando cantidades de platillos duplicados.
*   **Cuentas Divididas**: Calculadora integrada por partes iguales para dividir la cuenta entre comensales y procesar cobros parciales.
*   **Pago en Cascada**: El monto cobrado liquida secuencialmente las comandas de la más antigua a la más reciente y genera el cambio del vuelto automáticamente.
*   **Impresión de Tickets Térmicos**: Generación de tickets de cobro de 80mm en formato ESC/POS compatible con impresoras de red/USB, incluyendo apertura automática de cajón de dinero y corte de papel.
*   **Programa de Lealtad**: Registro de clientes y acumulación automática del 10% de su consumo en puntos de lealtad.

### 4. Panel de Control (Administración)
*   **Métricas del Día**: Reporte gráfico de ingresos del día y top 3 de platillos más vendidos de la semana.
*   **Control de Inventario**: Registro de insumos perecederos (Camarón, Pulpo, Limón) con alertas visuales de bajo stock e ingresos rápidos de merma o stock.
*   **Menú y Recetas (Escandallo)**: Configuración de platillos y asignación de ingredientes exactos a descontar del almacén en cada venta.
*   **Gestión de Personal**: Registro de nuevos meseros, cajeros, cocineros y administradores con encriptación segura.

---

## 🛠️ Arquitectura y Tecnologías

*   **Frontend**: React (v19) + Vite (v8) + Tailwind CSS (v4) + Lucide React Icons.
*   **Backend**: Node.js + Express.js + JSON Web Token (JWT Auth) + Node-Thermal-Printer.
*   **Base de Datos**: MongoDB (Mongoose ODM).
*   **PWA**: Service Worker para resiliencia offline + Web App Manifest + Almacenamiento local IndexedDB.

---

## 💻 Instalación y Configuración Local

### Prerrequisitos
*   Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).
*   Tener una instancia de [MongoDB](https://www.mongodb.com/) activa (localmente o en MongoDB Atlas).

### Paso 1: Clonar e Instalar dependencias
Instala los paquetes en las carpetas correspondientes:

```bash
# Instalar dependencias del Backend
cd backend
npm install

# Instalar dependencias del Frontend
cd ../frontend
npm install
```

### Paso 2: Configurar Variables de Entorno
Crea un archivo `.env` en la carpeta `backend` con lo siguiente:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/marisqueria
JWT_SECRET=tu_clave_secreta_aqui
```

### Paso 3: Ejecutar en Desarrollo
Ejecuta ambos servicios:

```bash
# Iniciar Backend (en la carpeta backend)
npm run dev

# Iniciar Frontend (en la carpeta frontend)
npm run dev
```

El backend se iniciará en `http://localhost:5000` y el frontend se levantará en `http://localhost:5173` y mostrará su dirección IP local en consola para acceso móvil.

---

## 📱 Acceso desde Celulares y Tablets

Debido a que el archivo `vite.config.js` está configurado con `host: '0.0.0.0'`, cualquier dispositivo en la misma red local puede acceder a la aplicación ingresando la IP del servidor en el navegador:
`http://<IP_DEL_SERVIDOR>:5173/`

### Instalación como App Nativa (PWA):
*   **En iOS (Safari)**: Presiona **Compartir** -> **"Agregar a la pantalla de inicio"**. Abre la app desde el nuevo icono del teléfono; la barra de direcciones desaparecerá por completo.
*   **En Android (Chrome)**: Toca los tres puntos verticales -> **"Instalar aplicación"**.

---

## 👥 Credenciales de Demostración por Defecto

Al arrancar el servidor por primera vez, se inyectan estos 5 perfiles de prueba:

*   **Administrador / Gerente**: Usuario `admin` | Contraseña `admin123`
*   **Cajero**: Usuario `cajero` | Contraseña `cajero123`
*   **Mesero**: Usuario `meseroot` | Contraseña `mesero123`
*   **Cocinero**: Usuario `cocina` | Contraseña `cocina123`
