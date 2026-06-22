import express from 'express';
import { login, register } from '../controllers/authController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware condicional para el registro del primer usuario (Bootstrap de administrador)
const checkBootstrapOrAdmin = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      // Si la base de datos no tiene usuarios, permitimos que se registre el primer Admin sin token
      return next();
    }
    // Si ya hay usuarios, aplicamos la protección de rutas: solo Admin o Gerente pueden crear otros usuarios
    return protect(req, res, () => {
      restrictTo('Admin', 'Gerente')(req, res, next);
    });
  } catch (error) {
    res.status(500).json({ message: 'Error de validación al verificar usuarios existentes.', error: error.message });
  }
};

router.post('/register', checkBootstrapOrAdmin, register);
router.post('/login', login);

export default router;
