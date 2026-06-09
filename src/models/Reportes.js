import { Schema, model } from 'mongoose'

const reportesSchema = new Schema({
  subtype: { type: String, required: true, enum: ['publicacion', 'articulo', 'usuario', 'red', 'app'] },
  tipo: { type: String, default: 'otro' },
  descripcion: { type: String, trim: true, default: '' },
  reporterId: { type: Schema.Types.ObjectId, ref: 'Estudiante', default: null },
  estado: { type: String, enum: ['pendiente', 'resuelto', 'rechazado'], default: 'pendiente' },
  respuesta: { type: String, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, refPath: 'resolvedByModel', default: null }, 
  resolvedByModel: { type: String, enum: ['SuperAdmin', 'Estudiante'], default: null },  
  meta: {
    publicacionId: { type: Schema.Types.ObjectId, ref: 'Publicacion', default: null },
    articuloId: { type: Schema.Types.ObjectId, ref: 'Articulo', default: null },
    reportadoUsuarioId: { type: Schema.Types.ObjectId, ref: 'Estudiante', default: null },
    redId: { type: Schema.Types.ObjectId, ref: 'RedComunitaria', default: null }
  }
}, { timestamps: true })

reportesSchema.index({ subtype: 1, estado: 1 })
reportesSchema.index({ reporterId: 1 })
reportesSchema.index({ 'meta.redId': 1 })

export default model('ReporteUnificado', reportesSchema, 'reportes')
