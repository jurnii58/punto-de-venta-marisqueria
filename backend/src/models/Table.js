import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: [true, 'El número de mesa es requerido'],
    unique: true
  },
  capacity: {
    type: Number,
    required: [true, 'La capacidad de la mesa es requerida'],
    min: [1, 'La capacidad de la mesa debe ser al menos 1']
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['libre', 'ocupada'],
      message: '{VALUE} no es un estado de mesa válido (libre, ocupada)'
    },
    default: 'libre'
  }
}, {
  timestamps: true
});

const Table = mongoose.model('Table', tableSchema);
export default Table;
