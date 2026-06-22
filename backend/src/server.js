import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Table from './models/Table.js';
import Ingredient from './models/Ingredient.js';
import MenuItem from './models/MenuItem.js';
import User from './models/User.js';
import Order from './models/Order.js';
import Payment from './models/Payment.js';
import { protect, restrictTo } from './middlewares/auth.js';

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Función para inicializar mesas, insumos y platillos si la base de datos está vacía
const seedDatabase = async () => {
  try {
    // 1. Sembrar Mesas
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      const defaultTables = [
        { number: 1, capacity: 4, status: 'libre' },
        { number: 2, capacity: 2, status: 'libre' },
        { number: 3, capacity: 6, status: 'ocupada' },
        { number: 4, capacity: 4, status: 'libre' },
        { number: 5, capacity: 8, status: 'ocupada' },
        { number: 6, capacity: 4, status: 'libre' }
      ];
      await Table.insertMany(defaultTables);
      console.log('Base de Datos: 6 mesas iniciales insertadas.');
    }

    // 2. Sembrar Insumos e Menú
    const ingCount = await Ingredient.countDocuments();
    if (ingCount === 0) {
      const defaultIngredients = [
        { name: 'Camarón', stock: 50, unit: 'kg', minStock: 5 },
        { name: 'Pulpo', stock: 30, unit: 'kg', minStock: 3 },
        { name: 'Limón', stock: 25, unit: 'kg', minStock: 2 },
        { name: 'Cerveza', stock: 120, unit: 'pieza', minStock: 10 }
      ];
      const createdIngs = await Ingredient.insertMany(defaultIngredients);
      console.log('Base de Datos: Insumos iniciales insertados.');

      const camaron = createdIngs.find(i => i.name === 'Camarón')._id;
      const pulpo = createdIngs.find(i => i.name === 'Pulpo')._id;
      const limon = createdIngs.find(i => i.name === 'Limón')._id;
      const cerveza = createdIngs.find(i => i.name === 'Cerveza')._id;

      const defaultMenuItems = [
        {
          name: 'Ceviche de Camarón',
          description: 'Ceviche fresco marinado con limón, cebolla y cilantro',
          price: 180,
          category: 'Entradas',
          ingredients: [
            { ingredient: camaron, quantity: 0.2 },
            { ingredient: limon, quantity: 0.05 }
          ]
        },
        {
          name: 'Pulpo a las Brasas',
          description: 'Pulpo tierno asado al carbón con aderezo de ajo',
          price: 280,
          category: 'Especialidades',
          ingredients: [
            { ingredient: pulpo, quantity: 0.25 },
            { ingredient: limon, quantity: 0.02 }
          ]
        },
        {
          name: 'Michelada de la Casa',
          description: 'Cerveza helada preparada con clamato y brocheta de camarón',
          price: 95,
          category: 'Bebidas',
          ingredients: [
            { ingredient: cerveza, quantity: 1 },
            { ingredient: camaron, quantity: 0.05 },
            { ingredient: limon, quantity: 0.03 }
          ]
        },
        {
          name: 'Tacos de Pescado Rebosado',
          description: '3 piezas de tacos estilo Ensenada con aderezo chipotle',
          price: 130,
          category: 'Especialidades',
          ingredients: [
            { ingredient: limon, quantity: 0.02 }
          ]
        }
      ];
      await MenuItem.insertMany(defaultMenuItems);
      console.log('Base de Datos: Menú de platillos y recetas insertado.');
    }

    // 3. Sembrar Usuarios por defecto si no hay ninguno
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const defaultUsers = [
        { name: 'Administrador POS', username: 'admin', password: 'admin123', role: 'Admin' },
        { name: 'Gerente General', username: 'gerente', password: 'gerente123', role: 'Gerente' },
        { name: 'Cajero Principal', username: 'cajero', password: 'cajero123', role: 'Cajero' },
        { name: 'Mesero de Turno', username: 'mesero', password: 'mesero123', role: 'Mesero' },
        { name: 'Cocinero de Turno', username: 'cocina', password: 'cocina123', role: 'Cocina' }
      ];
      await User.create(defaultUsers);
      console.log('Base de Datos: 5 usuarios de demostración creados.');
    }
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error.message);
  }
};
seedDatabase();

// Rutas de la API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Servidor POS Marisquería activo',
    database: 'MongoDB conectado'
  });
});

// Importar rutas de módulos de negocio
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import customerRoutes from './routes/customerRoutes.js';

// Montar rutas en la aplicación Express
app.use('/api/auth', authRoutes);

// Obtener todos los usuarios de personal (Solo Admin/Gerente)
app.get('/api/auth/users', protect, restrictTo('Admin', 'Gerente'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ role: 1, name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el personal', error: error.message });
  }
});
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);

// Obtener todas las mesas
app.get('/api/tables', async (req, res) => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las mesas', error: error.message });
  }
});

// Crear una nueva mesa (Solo Admin/Gerente)
app.post('/api/tables', protect, restrictTo('Admin', 'Gerente'), async (req, res) => {
  try {
    const { number, capacity } = req.body;
    if (number === undefined || capacity === undefined) {
      return res.status(400).json({ message: 'El número de mesa y la capacidad son requeridos.' });
    }

    const existingTable = await Table.findOne({ number: Number(number) });
    if (existingTable) {
      return res.status(400).json({ message: `La mesa número ${number} ya existe.` });
    }

    const newTable = await Table.create({
      number: Number(number),
      capacity: Number(capacity),
      status: 'libre'
    });

    res.status(201).json(newTable);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la mesa.', error: error.message });
  }
});

// Actualizar el estado de una mesa por número (Protegida)
app.patch('/api/tables/:number/status', protect, async (req, res) => {
  try {
    const { number } = req.params;
    const { status } = req.body;

    if (!['libre', 'ocupada'].includes(status)) {
      return res.status(400).json({ message: 'Estado de mesa inválido (debe ser libre o ocupada)' });
    }

    const table = await Table.findOneAndUpdate(
      { number: Number(number) },
      { status },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({ message: `Mesa ${number} no encontrada` });
    }

    // Si la mesa se está liberando, cerramos las comandas abiertas de la mesa y registramos el cobro
    if (status === 'libre') {
      const openOrders = await Order.find({ table: table._id, status: 'abierta' });
      for (const order of openOrders) {
        // Obtener la suma de pagos previos ya registrados
        const pastPayments = await Payment.find({ order: order._id });
        const totalPaidSoFar = pastPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = Number((order.total - totalPaidSoFar).toFixed(2));

        if (remainingAmount > 0) {
          // Registrar el pago automático por el saldo restante
          await Payment.create({
            order: order._id,
            amount: remainingAmount,
            method: 'efectivo', // Método por defecto al liberar manualmente
            processedBy: req.user ? req.user._id : '60c72b2f9b1d8b2bad000001' // Fallback si no está el req.user
          });
        }

        // Marcar la comanda como pagada en su totalidad
        order.status = 'pagada';
        order.paymentStatus = 'paid';
        await order.save();
      }
    }

    res.json(table);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado de la mesa', error: error.message });
  }
});

// Obtener todo el menú (platillos y recetas)
app.get('/api/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find().populate('ingredients.ingredient');
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el menú', error: error.message });
  }
});

// Crear un nuevo platillo en el menú (Solo Admin/Gerente)
app.post('/api/menu', protect, restrictTo('Admin', 'Gerente'), async (req, res) => {
  try {
    const { name, description, price, category, ingredients } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: 'Nombre, precio y categoría son obligatorios.' });
    }
    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      category,
      ingredients: ingredients || []
    });
    const populated = await MenuItem.findById(menuItem._id).populate('ingredients.ingredient');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear platillo en el menú', error: error.message });
  }
});

// Obtener inventario de insumos
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los insumos', error: error.message });
  }
});

// Crear un nuevo ingrediente/insumo (Solo Admin/Gerente)
app.post('/api/ingredients', protect, restrictTo('Admin', 'Gerente'), async (req, res) => {
  try {
    const { name, stock, unit, minStock } = req.body;
    if (!name || stock === undefined || !unit) {
      return res.status(400).json({ message: 'Nombre, stock inicial y unidad son obligatorios.' });
    }
    const ingredient = await Ingredient.create({ name, stock, unit, minStock: minStock || 0 });
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el insumo', error: error.message });
  }
});

// Ajustar stock de un insumo (Solo Admin/Gerente)
app.patch('/api/ingredients/:id/stock', protect, restrictTo('Admin', 'Gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ message: 'La cantidad a ajustar es requerida.' });
    }
    const ingredient = await Ingredient.findByIdAndUpdate(
      id,
      { $inc: { stock: quantity } },
      { new: true }
    );
    if (!ingredient) {
      return res.status(404).json({ message: 'Insumo no encontrado.' });
    }
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ message: 'Error al ajustar el stock', error: error.message });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor de desarrollo escuchando en el puerto ${PORT}`);
});
