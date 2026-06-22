import Payment from '../models/Payment.js';
import Order from '../models/Order.js';

// Obtener estadísticas clave para el Dashboard administrativo
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Configurar límites de tiempo para "Hoy" (Zona Horaria Local)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Sumar todos los pagos procesados el día de hoy (monto real cobrado)
    const todaySalesData = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          transactionsCount: { $sum: 1 }
        }
      }
    ]);

    const todaySales = todaySalesData.length > 0 ? todaySalesData[0].totalRevenue : 0;
    const transactions = todaySalesData.length > 0 ? todaySalesData[0].transactionsCount : 0;

    // 2. Configurar límites de tiempo para "Últimos 7 días" (Top Platillos Semanal)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const topDishes = await Order.aggregate([
      // Filtrar comandas de la última semana y no canceladas
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          status: { $ne: 'cancelada' }
        }
      },
      // Descomponer el arreglo de items para procesarlos individualmente
      { $unwind: '$items' },
      // Agrupar por platillo sumando las cantidades pedidas
      {
        $group: {
          _id: '$items.menuItem',
          quantitySold: { $sum: '$items.quantity' }
        }
      },
      // Ordenar de mayor a menor ventas
      { $sort: { quantitySold: -1 } },
      // Limitar a los 3 más vendidos
      { $limit: 3 },
      // Cruzar información con la colección de MenuItems para obtener detalles (Lookup)
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'details'
        }
      },
      // Descomponer los detalles cruzados
      { $unwind: '$details' },
      // Proyectar solo la información relevante
      {
        $project: {
          _id: 1,
          quantitySold: 1,
          name: '$details.name',
          price: '$details.price',
          category: '$details.category'
        }
      }
    ]);

    res.json({
      today: {
        totalSales: Number(todaySales.toFixed(2)),
        transactionsCount: transactions
      },
      weeklyTopDishes: topDishes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular las métricas del dashboard.', error: error.message });
  }
};
