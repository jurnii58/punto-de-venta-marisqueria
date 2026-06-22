import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import Customer from '../models/Customer.js';
import { printReceiptTicket } from '../services/printerService.js';

// Procesar un pago para una comanda (total o parcial)
export const processPayment = async (req, res) => {
  try {
    const { orderId, amount, method, customerId } = req.body;
    const userId = req.user._id;

    if (!orderId || !amount || !method) {
      return res.status(400).json({ message: 'Todos los campos son requeridos: orderId, amount, method.' });
    }

    // 1. Obtener la comanda con mesa y menú de platos poblados para la impresión
    const order = await Order.findById(orderId).populate('table').populate('items.menuItem');
    if (!order) {
      return res.status(404).json({ message: 'Comanda no encontrada.' });
    }

    if (order.status === 'pagada' || order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Esta comanda ya ha sido pagada en su totalidad.' });
    }

    // 2. Obtener la suma de pagos previos ya registrados
    const pastPayments = await Payment.find({ order: orderId });
    const totalPaidSoFar = pastPayments.reduce((sum, p) => sum + p.amount, 0);

    const remainingAmount = order.total - totalPaidSoFar;
    if (remainingAmount <= 0) {
      return res.status(400).json({ message: 'La comanda ya está totalmente cubierta.' });
    }

    let actualPaymentAmount = amount;
    let change = 0;

    // Calcular cambio en caso de efectivo superior al total restante
    if (amount > remainingAmount) {
      change = amount - remainingAmount;
      actualPaymentAmount = remainingAmount;
    }

    // 3. Crear el registro de pago
    const newPayment = await Payment.create({
      order: orderId,
      amount: actualPaymentAmount,
      method,
      processedBy: userId
    });

    // Otorgar puntos de lealtad (10%) y contar visita si se indica cliente
    let customer = null;
    if (customerId) {
      try {
        const pointsEarned = Math.round(actualPaymentAmount * 0.10);
        customer = await Customer.findByIdAndUpdate(customerId, {
          $inc: { 
            loyaltyPoints: pointsEarned,
            visitCount: 1 
          }
        }, { new: true });
      } catch (err) {
        console.error('Error al actualizar puntos de cliente:', err.message);
      }
    }

    // 4. Calcular el nuevo total pagado
    const newTotalPaid = totalPaidSoFar + actualPaymentAmount;

    // 5. Determinar y actualizar el estado de pago de la comanda
    if (newTotalPaid >= order.total) {
      order.paymentStatus = 'paid';
      order.status = 'pagada';
      
      // Liberar la mesa asociada automáticamente
      if (order.table) {
        await Table.findByIdAndUpdate(order.table._id || order.table, { status: 'libre' });
      }
    } else {
      order.paymentStatus = 'partial';
    }

    await order.save();

    // 6. Imprimir el ticket de cobro ESC/POS (asíncrono)
    printReceiptTicket(order, newPayment, change, Math.max(0, order.total - newTotalPaid), customer, req.user)
      .catch(err => console.error('Error al imprimir ticket de cobro:', err.message));

    res.status(201).json({
      message: newTotalPaid >= order.total ? 'Comanda totalmente pagada.' : 'Pago parcial registrado con éxito.',
      payment: newPayment,
      change: change > 0 ? Number(change.toFixed(2)) : 0,
      remaining: Number((order.total - newTotalPaid).toFixed(2)),
      order: {
        id: order._id,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar el pago.', error: error.message });
  }
};

// Obtener historial de pagos de una comanda
export const getPaymentsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payments = await Payment.find({ order: orderId }).populate('processedBy', 'name role');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los pagos de la comanda.', error: error.message });
  }
};
