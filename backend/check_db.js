import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from './src/models/Table.js';
import Order from './src/models/Order.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Conectado.');

    const tables = await Table.find().sort({ number: 1 });
    console.log('--- MESAS EN LA BD ---');
    tables.forEach(t => {
      console.log(`ID: ${t._id}, Número: ${t.number}, Estado: ${t.status}`);
    });

    const activeOrders = await Order.find({ status: 'abierta' }).populate('table');
    console.log('\n--- COMANDAS ABIERTAS ---');
    activeOrders.forEach(o => {
      console.log(`ID: ${o._id}, Mesa ID: ${o.table?._id}, Mesa Número: ${o.table?.number}, Total: ${o.total}, Items Count: ${o.items.length}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
};

run();
