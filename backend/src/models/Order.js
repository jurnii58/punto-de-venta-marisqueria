import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: [true, 'La comanda debe estar asociada a una mesa']
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'El platillo es requerido']
    },
    quantity: {
      type: Number,
      required: [true, 'La cantidad es requerida'],
      min: [1, 'La cantidad mínima es de 1']
    },
    notes: {
      type: String,
      trim: true
    },
    area: {
      type: String,
      required: [true, 'El área de preparación es requerida'],
      enum: {
        values: ['Barra Fría', 'Cocina Caliente', 'Bebidas'],
        message: '{VALUE} no es un área válida (Barra Fría, Cocina Caliente, Bebidas)'
      }
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pendiente', 'en preparación', 'entregado', 'cancelado'],
        message: '{VALUE} no es un estado de platillo válido (pendiente, en preparación, entregado, cancelado)'
      },
      default: 'pendiente'
    }
  }],
  status: {
    type: String,
    required: true,
    enum: {
      values: ['abierta', 'pagada', 'cancelada'],
      message: '{VALUE} no es un estado de comanda válido (abierta, pagada, cancelada)'
    },
    default: 'abierta'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: {
      values: ['pending', 'partial', 'paid'],
      message: '{VALUE} no es un estado de pago válido (pending, partial, paid)'
    },
    default: 'pending'
  },
  total: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
