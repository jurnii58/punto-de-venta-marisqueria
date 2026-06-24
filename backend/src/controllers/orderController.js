import Order from '../models/Order.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import Ingredient from '../models/Ingredient.js';
import Payment from '../models/Payment.js';
import { printKitchenTicket } from '../services/printerService.js';
import { getIo } from '../socket.js';

// Crear una comanda (Order)
export const createOrder = async (req, res) => {
  try {
    const { tableNumber, items } = req.body;

    // 1. Buscar la mesa por número
    const table = await Table.findOne({ number: tableNumber });
    if (!table) {
      return res.status(404).json({ message: `La mesa número ${tableNumber} no existe.` });
    }

    // 1. Buscar si ya existe una comanda abierta para esta mesa
    let order = await Order.findOne({ table: table._id, status: 'abierta' });
    let isNewOrder = false;

    if (!order) {
      isNewOrder = true;
      order = new Order({
        table: table._id,
        items: [],
        total: 0,
        status: 'abierta',
        paymentStatus: 'pending'
      });
    }

    let incrementalTotal = 0;
    const newlyProcessedItems = [];

    // 2. Procesar platillos e ingredientes
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem).populate('ingredients.ingredient');
      if (!menuItem) {
        return res.status(404).json({ message: `El platillo con ID ${item.menuItem} no existe.` });
      }

      // Enrutar automáticamente según la categoría
      let area = 'Cocina Caliente';
      if (['Cocteles', 'Entradas'].includes(menuItem.category)) {
        area = 'Barra Fría';
      } else if (menuItem.category === 'Bebidas') {
        area = 'Bebidas';
      }

      const orderItem = {
        menuItem: menuItem._id,
        quantity: item.quantity,
        notes: item.notes || '',
        area,
        status: 'pendiente'
      };

      order.items.push(orderItem);
      
      // Estructura temporal populada para el servicio de impresión
      newlyProcessedItems.push({
        ...orderItem,
        menuItem
      });

      // Sumar al precio incremental
      incrementalTotal += menuItem.price * item.quantity;

      // 3. Control de inventario: Descontar insumos
      for (const recipeItem of menuItem.ingredients) {
        const requiredQty = recipeItem.quantity * item.quantity;
        const ingredient = recipeItem.ingredient;

        await Ingredient.findByIdAndUpdate(
          ingredient._id,
          { $inc: { stock: -requiredQty } }
        );
      }
    }

    order.total += incrementalTotal;

    // Si la comanda ya estaba marcada como pagada pero se añaden nuevos consumos, se vuelve a abrir
    if (!isNewOrder && order.paymentStatus === 'paid') {
      order.paymentStatus = 'partial';
      order.status = 'abierta';
    }

    // Guardar los cambios
    await order.save();

    // 5. Marcar mesa como ocupada
    table.status = 'ocupada';
    await table.save();

    // Recuperar comanda populada para la respuesta
    const populatedOrder = await Order.findById(order._id)
      .populate('table')
      .populate('items.menuItem');

    // 6. Enviar ticket a imprimir conteniendo ÚNICAMENTE los platillos nuevos
    const ticketOrder = {
      _id: order._id,
      table: populatedOrder.table,
      createdAt: new Date(),
      items: newlyProcessedItems
    };

    printKitchenTicket(ticketOrder).catch((err) => {
      console.error('Error del servicio de impresión:', err.message);
    });

    // Emitir actualización en tiempo real a clientes conectados
    try {
      const io = getIo();
      if (io) {
        const orders = await Order.find({ status: 'abierta' })
          .populate('table')
          .populate('items.menuItem');
        io.emit('orders', orders.map(order => order.toObject()));
      }
    } catch (err) {
      console.warn('No se pudo emitir evento socket de nueva comanda:', err.message);
    }

    res.status(201).json({
      message: isNewOrder ? 'Comanda creada con éxito y enviada a cocina.' : 'Consumo añadido a la comanda de la mesa.',
      order: populatedOrder
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar la comanda.', error: error.message });
  }
};

// Obtener todas las comandas abiertas
export const getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'abierta' })
      .populate('table')
      .populate('items.menuItem');
    
    // Calcular para cada comanda el total abonado y el restante
    const ordersWithPayments = await Promise.all(orders.map(async (order) => {
      const payments = await Payment.find({ order: order._id });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Number((order.total - totalPaid).toFixed(2));
      return {
        ...order.toObject(),
        totalPaid,
        remaining
      };
    }));

    res.json(ordersWithPayments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener comandas activas.', error: error.message });
  }
};

// Cancelar/Eliminar una comanda (Restringido a Admin y Gerente)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('table');
    if (!order) {
      return res.status(404).json({ message: 'Comanda no encontrada.' });
    }

    // Liberar la mesa asociada
    if (order.table) {
      const table = await Table.findById(order.table._id);
      if (table) {
        table.status = 'libre';
        await table.save();
      }
    }

    // Eliminar comanda
    await Order.findByIdAndDelete(id);

    res.json({ message: 'Comanda cancelada y mesa liberada con éxito.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar la comanda.', error: error.message });
  }
};

// Actualizar el estado de preparación de un platillo dentro de una comanda
export const updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    if (!['pendiente', 'en preparación', 'entregado', 'cancelado'].includes(status)) {
      return res.status(400).json({ message: 'Estado de platillo inválido.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Comanda no encontrada.' });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'El platillo no existe en esta comanda.' });
    }

    item.status = status;
    await order.save();

    const populated = await Order.findById(orderId)
      .populate('table')
      .populate('items.menuItem');
    res.json(populated);

    // Emitir actualización en tiempo real tras cambiar estado de un platillo
    try {
      const io = getIo();
      if (io) {
        const orders = await Order.find({ status: 'abierta' })
          .populate('table')
          .populate('items.menuItem');
        io.emit('orders', orders.map(order => order.toObject()));
      }
    } catch (err) {
      console.warn('No se pudo emitir evento socket de actualización de platillo:', err.message);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado del platillo.', error: error.message });
  }
};
