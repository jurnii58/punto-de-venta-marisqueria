import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// El dashboard y reportes de ventas son de acceso confidencial (Admin y Gerente)
router.get('/stats', protect, restrictTo('Admin', 'Gerente'), getDashboardStats);

export default router;
