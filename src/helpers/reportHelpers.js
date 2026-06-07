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

export const populateReporte = (id, subtype) => {
  const excludeMap = {
    publicacion: '-meta.reportadoUsuarioId -meta.articuloId -__v',
    articulo: '-meta.reportadoUsuarioId -meta.publicacionId -__v',
    usuario: '-meta.articuloId -__v',
    red: '-meta.publicacionId -meta.articuloId -meta.reportadoUsuarioId -__v',
    app: '-meta.publicacionId -meta.articuloId -meta.reportadoUsuarioId -meta.redId -__v'
  }

  return ReporteUnificado.findById(id)
    .select(excludeMap[subtype] || '-__v')
    .populate('meta.publicacionId', 'titulo contenido tipoContenido categoria mediaUrls')
    .populate('meta.articuloId', 'titulo descripcion tipoContenido mediaUrls')
    .populate('meta.reportadoUsuarioId', 'nombre apellido fotoPerfil email')
    .populate('meta.redId', 'nombre fotoPerfil esVerificada deshabilitada')
    .populate('reporterId', 'nombre apellido fotoPerfil email')
}

export const populateSolicitud = (id, subtype) => {
  const excludeMap = {
    verificacion: '-meta.solicitarOficial -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.justificacion -__v',
    oficializacion: '-meta.solicitarVerificada -__v',
    rehabilitar_red: '-meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
    habilitar_usuario: '-meta.redId -meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
    revocar_admin_red: '-meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
    postular_admin_red: '-meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
  }

  return SolicitudUnificada.findById(id)
    .select(excludeMap[subtype] || '-__v')
    .populate('meta.redId', 'nombre deshabilitada esVerificada esOficial')
    .populate('solicitante', 'nombre apellido fotoPerfil email')
}

export const reportePopulateMap = {
  usuario: [{ path: 'meta.reportadoUsuarioId', select: 'nombre apellido fotoPerfil email' }],
  red: [{ path: 'meta.redId', select: 'nombre fotoPerfil esVerificada' }],
  app: [],
  publicacion: [{ path: 'meta.publicacionId', select: 'titulo contenido tipoContenido mediaUrls' }]
}

export const reporteSelectMap = {
  usuario: '-meta.articuloId -meta.publicacionId -__v',
  red: '-meta.articuloId -meta.publicacionId -meta.reportadoUsuarioId -__v',
  app: '-meta.articuloId -meta.publicacionId -meta.reportadoUsuarioId -meta.redId -__v',
  publicacion: '-meta.articuloId -meta.reportadoUsuarioId -__v'
}

export const solicitudPopulateMap = {
  verificacion: { meta: { path: 'meta.redId', select: 'nombre' } },
  oficializacion: { meta: { path: 'meta.redId', select: 'nombre esOficial' } },
  rehabilitar_red: { meta: { path: 'meta.redId', select: 'nombre deshabilitada' } },
  habilitar_usuario: { solicitante: 'nombre apellido fotoPerfil email suspendido' },
  postular_admin_red: { meta: { path: 'meta.redId', select: 'nombre deshabilitada fotoPerfil cantidadMiembros' }, solicitante: 'nombre apellido fotoPerfil email username' },
  revocar_admin_red: { meta: { path: 'meta.redId', select: 'nombre deshabilitada fotoPerfil cantidadMiembros' }, solicitante: 'nombre apellido fotoPerfil email username' }
}

export const solicitudSelectMap = {
  verificacion: '-meta.solicitarOficial -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.justificacion -__v',
  oficializacion: '-meta.solicitarVerificada -__v',
  rehabilitar_red: '-meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
  habilitar_usuario: '-meta.redId -meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
  revocar_admin_red: '-meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
  postular_admin_red: '-meta.solicitarVerificada -meta.solicitarOficial -meta.nombreRed -meta.fechaCreacionRed -meta.cantidadMiembros -meta.dependencia -meta.dependenciaPersonalizada -meta.cargo -meta.cargoPersonalizado -meta.correoInstitucional -meta.justificacion -__v',
}

export const listarReportesGlobal = (filtro, populate = []) => {
  const q = ReporteUnificado.find(filtro)
    .sort({ createdAt: -1 })
    .populate('reporterId', 'nombre apellido fotoPerfil email')

  populate.forEach(p => q.populate(p))

  return q
}