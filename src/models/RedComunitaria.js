import mongoose from 'mongoose';

const redComunitariaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  miembros: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante'
  }],
  cantidadMiembros: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('RedComunitaria', redComunitariaSchema, 'redesComunitarias');
