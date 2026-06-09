import { Schema, model } from 'mongoose'

const solicitudesSchema = new Schema({
  subtype: { type: String, required: true, enum: ['verificacion', 'oficializacion', 'rehabilitar_red', 'habilitar_usuario', 'revocar_admin_red', 'postular_admin_red' ] },
  solicitante: { type: Schema.Types.ObjectId, ref: 'Estudiante', required: true },
  descripcion: { type: String, trim: true, default: '' },
  estado: { type: String, enum: ['pendiente', 'aprobada', 'rechazada'], default: 'pendiente' },
  respuesta: { type: String, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'SuperAdmin', default: null },
  meta: {
    redId: { type: Schema.Types.ObjectId, ref: 'RedComunitaria', default: null },
    solicitarVerificada: { type: Boolean, default: false },
    solicitarOficial: { type: Boolean, default: false },

    // Campos para verificación
    nombreRed: { type: String, default: null },
    fechaCreacionRed: { type: Date, default: null },
    cantidadMiembros: { type: Number, default: null },

    // Campos exclusivos de oficialización
    dependencia: { type: String, enum: ['Rectorado', 'Vicerrectorado', 'Facultad', 'Carrera', 'Departamento', 'Bienestar Universitario', 'Otro'], default: null },
    dependenciaPersonalizada: { type: String, default: null },
    cargo: { type: String, enum: ['Director', 'Coordinador', 'Docente responsable', 'Administrativo', 'Representante autorizado', 'Otro'], default: null },
    cargoPersonalizado: { type: String, default: null },  
    correoInstitucional: { type: String, default: null },
    justificacion: { type: String, default: null }
  }
}, { timestamps: true })

solicitudesSchema.index({ subtype: 1, estado: 1 })
solicitudesSchema.index({ solicitante: 1 })
solicitudesSchema.index({ 'meta.redId': 1 })

export default model('SolicitudUnificada', solicitudesSchema, 'solicitudes')
