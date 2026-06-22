import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del cliente es requerido'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'El teléfono del cliente es requerido'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Los puntos no pueden ser negativos']
  },
  visitCount: {
    type: Number,
    default: 0,
    min: [0, 'El número de visitas no puede ser negativo']
  }
}, {
  timestamps: true
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
