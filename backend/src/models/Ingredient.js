import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del insumo es requerido'],
    unique: true,
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'El stock actual es requerido'],
    min: [0, 'El stock no puede ser menor a 0'],
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'La unidad de medida es requerida'],
    enum: {
      values: ['kg', 'g', 'l', 'ml', 'pieza', 'manojo'],
      message: '{VALUE} no es una unidad de medida válida (kg, g, l, ml, pieza, manojo)'
    }
  },
  minStock: {
    type: Number,
    default: 0,
    min: [0, 'El stock mínimo no puede ser menor a 0']
  }
}, {
  timestamps: true
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export default Ingredient;
