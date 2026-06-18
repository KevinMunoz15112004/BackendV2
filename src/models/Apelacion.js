import mongoose from 'mongoose'

const apelacionSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['usuario', 'red'],
    default: 'usuario'
  },
  estudianteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante',
    required: true
  },
  redId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedComunitaria',
    default: null
  },
  nombre: {
    type: String,
    required: function() { return this.tipo === 'usuario' },
    trim: true
  },
  correo: {
    type: String,
    required: function() { return this.tipo === 'usuario' },
    trim: true
  },
  motivo: {
    type: String,
    required: true,
    maxlength: 1000
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aprobada', 'rechazada'],
    default: 'pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaResolucion: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  notaResolucion: {
    type: String
  }
})

const Apelacion = mongoose.model('Apelacion', apelacionSchema, 'apelaciones')
export default Apelacion
