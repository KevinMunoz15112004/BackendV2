import ReporteUnificado from '../models/Reportes.js'
import SolicitudUnificada from '../models/Solicitudes.js'

export const mapEstadoFromBody = (valor) => {
  if (!valor) return null
  if (valor === 'Resuelta' || valor === 'resuelta') return 'resuelto'
  if (valor === 'Rechazada' || valor === 'rechazada') return 'rechazado'
  const v = String(valor).toLowerCase()
  if (['pendiente','resuelto','rechazado','aprobada'].includes(v)) return v
  return null
}

export const listarReportesPorSubtype = (subtype, populate = [], estado = null) => {
  const filtro = { subtype }
  if (estado) filtro.estado = estado

  const q = ReporteUnificado.find(filtro).sort({ createdAt: -1 }).populate('reporterId', 'nombre apellido fotoPerfil email')
  populate.forEach(p => { q.populate(p) })
  return q
}

export const listarSolicitudesPorSubtype = (subtype, populate = {}, estado = null) => {
  const filtro = { subtype }
  if (estado) filtro.estado = estado

  const q = SolicitudUnificada.find(filtro).sort({ createdAt: -1 })
    .populate({ path: 'solicitante', select: populate.solicitante ?? 'nombre apellido fotoPerfil email' })
  
  if (populate.meta) q.populate(populate.meta)
  return q
}