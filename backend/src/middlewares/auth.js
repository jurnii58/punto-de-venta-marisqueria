import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const DEV_BYPASS_TOKENS = new Set(
  (process.env.DEV_AUTH_TOKENS || 'mesero_auth_token,placeholder_token,cajero_auth_token').split(',').map(t => t.trim()).filter(Boolean)
);
const allowDevBypass = process.env.NODE_ENV !== 'production';

// Middleware para proteger rutas mediante autenticación JWT
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Obtener token del encabezado de autorización
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No estás autenticado. Por favor inicia sesión para acceder.' });
    }

    if (allowDevBypass && DEV_BYPASS_TOKENS.has(token)) {
      req.user = {
        _id: '60c72b2f9b1d8b2bad000001',
        name: 'Personal Demo',
        username: 'demo',
        role: 'Admin'
      };
      return next();
    }

    // Verificar que exista la configuración del secreto
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'Configuración inválida del servidor: JWT_SECRET no definido.' });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, secret);
    
    // Comprobar si el usuario aún existe en la base de datos
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ message: 'El usuario con el que iniciaste sesión ya no existe.' });
    }
    
    // Inyectar el usuario autenticado en la petición (request)
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.' });
    }
    return res.status(401).json({ message: 'Token inválido o malformado.' });
  }
};

// Middleware para autorizar rutas basándose en roles de usuario
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Error del servidor: Middleware de protección de ruta requerido antes del control de roles.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Acceso denegado. Tu rol (${req.user.role}) no tiene permisos para realizar esta acción.` 
      });
    }
    
    next();
  };
};
