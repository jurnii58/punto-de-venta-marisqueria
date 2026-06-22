import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'El pago debe estar asociado a una comanda']
  },
  amount: {
    type: Number,
    required: [true, 'El monto del pago es requerido'],
    min: [0.01, 'El monto del pago debe ser mayor a 0']
  },
  method: {
    type: String,
    required: [true, 'El método de pago es requerido'],
    enum: {
      values: ['efectivo', 'tarjeta'],
      message: '{VALUE} no es un método de pago válido (efectivo, tarjeta)'
    }
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario que procesó el pago es requerido']
  }
}, {
  timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
