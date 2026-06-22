import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del platillo es requerido'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser menor a 0']
  },
  category: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: {
      values: ['Entradas', 'Cocteles', 'Especialidades', 'Bebidas', 'Postres'],
      message: '{VALUE} no es una categoría válida (Entradas, Cocteles, Especialidades, Bebidas, Postres)'
    }
  },
  ingredients: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'La referencia al insumo es requerida']
    },
    quantity: {
      type: Number,
      required: [true, 'La cantidad del insumo para la receta estándar es requerida'],
      min: [0, 'La cantidad no puede ser menor a 0']
    }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
