import express from 'express';
import { getCustomers, createCustomer } from '../controllers/customerController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Rutas protegidas para clientes
router.use(protect);

router.get('/', getCustomers);
router.post('/', createCustomer);

export default router;
