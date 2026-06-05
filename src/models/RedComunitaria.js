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
  proposito: {
    type: String,
    required: true,
    trim: true
  },
  miembros: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante'
  }],
  administrador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante',
    default: null
  },
  esGlobal: {
    type: Boolean,
    default: false
  },
  esVerificada: {
    type: Boolean,
    default: false
  },
  deshabilitada: {
    type: Boolean,
    default: false
  },
  fotoPerfil: {
    type: String,
    default: null
  },
  estadoAprobacion: {
    type: String,
    enum: ['pendiente', 'aprobada', 'rechazada'],
    default: 'pendiente'
  },
  esOficial: {
    type: Boolean,
    default: false
  },
  cantidadMiembros: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('RedComunitaria', redComunitariaSchema, 'redesComunitarias');
