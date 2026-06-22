import express from 'express';
import { processPayment, getPaymentsByOrder } from '../controllers/paymentController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Todos los endpoints de cobros requieren que el usuario esté logueado
router.use(protect);

router.post('/', processPayment);
router.get('/order/:orderId', getPaymentsByOrder);

export default router;
