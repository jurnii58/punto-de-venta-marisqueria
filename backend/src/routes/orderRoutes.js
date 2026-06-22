import express from 'express';
import { createOrder, getActiveOrders, deleteOrder, updateItemStatus } from '../controllers/orderController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Todas las rutas de comanda requieren autenticación previa
router.use(protect);

router.post('/', createOrder);
router.get('/', getActiveOrders);
router.patch('/:orderId/items/:itemId/status', updateItemStatus);

// Cancelaciones restringidas solo para Admin o Gerente
router.delete('/:id', restrictTo('Admin', 'Gerente'), deleteOrder);

export default router;
