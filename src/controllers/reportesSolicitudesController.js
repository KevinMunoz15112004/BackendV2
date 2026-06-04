import ReporteUnificado from '../models/Reportes.js'
import SolicitudUnificada from '../models/Solicitudes.js'
import RedComunitaria from '../models/RedComunitaria.js'
import Publicacion from '../models/Publicaciones.js'
import Estudiante from '../models/Estudiantes.js'
import AdminRed from '../models/adminRedes.js'
import Comentario from '../models/Comentarios.js'
import { crearNotificacion } from '../helpers/notificaciones.js'
import { triggerUserChannel } from '../config/pusher.js'
import { mapEstadoFromBody, listarReportesPorSubtype, listarSolicitudesPorSubtype } from '../helpers/reportHelpers.js'

// Create report: publication
const crearReportePublicacion = async (req, res) => {
  try {
    const { tipo, descripcion, publicacionId, archivos = [] } = req.body
    const publicacion = await Publicacion.findById(publicacionId)
    if (!publicacion) return res.status(404).json({ msg: 'Publicación no encontrada' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'publicacion',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD ? req.estudianteBDD._id : (req.user?._id || null),
      archivos,
      meta: { publicacionId: publicacion._id, redId: publicacion.comunidadId || null }
    })

    const pop = await ReporteUnificado.findById(nuevo._id).populate('meta.publicacionId').populate('meta.redId', 'nombre')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Create report: red
const crearReporteRed = async (req, res) => {
  try {
    const { tipo, descripcion, redId, archivos = [] } = req.body
    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red comunitaria no encontrada' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'red',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.user?._id || null,
      archivos,
      meta: { redId }
    })

    const pop = await ReporteUnificado.findById(nuevo._id).populate('meta.redId', 'nombre').populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Create report: app
const crearReporteApp = async (req, res) => {
  try {
    const { tipo, descripcion, archivos = [] } = req.body
    const nuevo = await ReporteUnificado.create({
      subtype: 'app',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD ? req.estudianteBDD._id : (req.user?._id || null),
      archivos
    })
    const pop = await ReporteUnificado.findById(nuevo._id).populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Create report: usuario
const crearReporteUsuario = async (req, res) => {
  try {
    const { tipo, descripcion, reportadoUsuarioId, publicacionId, redId, archivos = [] } = req.body
    
    const usuario = await Estudiante.findById(reportadoUsuarioId)
    if (!usuario) return res.status(404).json({ msg: 'Usuario reportado no encontrado' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'usuario',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD ? req.estudianteBDD._id : (req.user?._id || null),
      archivos,
      meta: { 
        reportadoUsuarioId,
        publicacionId: publicacionId || null,
        redId: redId || null
      }
    })

    const pop = await ReporteUnificado.findById(nuevo._id)
      .populate('meta.reportadoUsuarioId', 'nombre apellido fotoPerfil email')
      .populate('meta.publicacionId', 'titulo contenido tipoContenido categoria')
      .populate('meta.redId', 'nombre fotoPerfil esVerificada')
      .populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarReportes = async (req, res) => {
  const { subtype } = req.params
  const { estado } = req.query

  const populateMap = {
    usuario: [{ path: 'meta.reportadoUsuarioId', select: 'nombre apellido fotoPerfil email' }],
    red: ['meta.redId'],
    app: [],
    publicacion: [{ path: 'meta.publicacionId', select: 'contenido' }]
  }

  try {
    const q = listarReportesPorSubtype(subtype, populateMap[subtype], estado)
    const reportes = await q.exec()
    return res.status(200).json({ reportes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Resolve report: usuario
const resolverReporteUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, respuesta } = req.body
    const mapped = mapEstadoFromBody(estado)
    if (!mapped || !['resuelto','rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'usuario') return res.status(404).json({ msg: 'Reporte de usuario no encontrado' })

    if (['resuelto','rechazado'].includes(reporte.estado)) return res.status(400).json({ msg: 'El reporte ya fue resuelto o rechazado' })

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      await reporte.save()
      const reportePop = await ReporteUnificado.findById(reporte._id).populate('meta.reportadoUsuarioId', 'nombre apellido fotoPerfil email').populate('reporterId', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto -> suspender usuario
    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    await reporte.save()

    const usuario = await Estudiante.findById(reporte.meta.reportadoUsuarioId)
    if (usuario) {
      usuario.suspendido = true
      await usuario.save()
    }

    const reportePop = await ReporteUnificado.findById(reporte._id).populate('meta.reportadoUsuarioId', 'nombre apellido fotoPerfil email').populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(200).json({ msg: 'Reporte resuelto. Usuario suspendido', reporte: reportePop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Resolve report: red
const resolverReporteRed = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, respuesta } = req.body
    const mapped = mapEstadoFromBody(estado)
    if (!mapped || !['resuelto','rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'red') return res.status(404).json({ msg: 'Reporte de red no encontrado' })

    if (['resuelto','rechazado'].includes(reporte.estado)) return res.status(400).json({ msg: 'El reporte ya fue resuelto o rechazado' })

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      await reporte.save()
      const reportePop = await ReporteUnificado.findById(reporte._id).populate('meta.redId', 'nombre deshabilitada').populate('reporterId', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto: deshabilitar la red
    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    await reporte.save()

    const red = await RedComunitaria.findById(reporte.meta.redId)
    if (!red) {
      const reportePop = await ReporteUnificado.findById(reporte._id).populate('meta.redId', 'nombre deshabilitada').populate('reporterId', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Reporte resuelto. La red no existe', reporte: reportePop })
    }

    red.deshabilitada = true
    await red.save()

    const reportePop = await ReporteUnificado.findById(reporte._id).populate('meta.redId', 'nombre deshabilitada').populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(200).json({ msg: 'Reporte resuelto. Red deshabilitada', reporte: reportePop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Resolve report: app
const resolverReporteApp = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, respuesta } = req.body
    const mapped = mapEstadoFromBody(estado)
    if (!mapped || !['resuelto','rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'app') return res.status(404).json({ msg: 'Reporte de app no encontrado' })

    if (['resuelto','rechazado'].includes(reporte.estado)) return res.status(400).json({ msg: 'El reporte ya fue resuelto' })

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      await reporte.save()
      const reportePop = await ReporteUnificado.findById(reporte._id).populate('reporterId', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    await reporte.save()

    const reportePop = await ReporteUnificado.findById(reporte._id).populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(200).json({ msg: 'Reporte de app resuelto', reporte: reportePop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Admin resolves publication report (only admin of red)
const resolverReportePublicacionAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, respuesta } = req.body
    const mapped = mapEstadoFromBody(estado)
    if (!mapped || !['resuelto','rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'publicacion') return res.status(404).json({ msg: 'Reporte de publicación no encontrado' })

    if (reporte.estado === 'resuelto') return res.status(400).json({ msg: 'El reporte ya fue resuelto' })

    const admin = req.user
    if (!admin.redAsignada || !reporte.meta.redId || String(reporte.meta.redId) !== String(admin.redAsignada)) {
      return res.status(403).json({ msg: 'No estás autorizado para resolver este reporte' })
    }

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      await reporte.save()
      const reportePop = await ReporteUnificado.findById(reporte._id)
        .populate('meta.publicacionId')
        .populate('meta.redId', 'nombre')
        .populate('reporterId', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto: eliminar publicación con cascada
    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    await reporte.save()

    const publicacion = await Publicacion.findById(reporte.meta.publicacionId)
    if (!publicacion) {
      const reportePop = await ReporteUnificado.findById(reporte._id)
        .populate('meta.publicacionId')
        .populate('meta.redId', 'nombre')
        .populate('reporterId', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Reporte resuelto. La publicación no existe (posible eliminación previa)', reporte: reportePop })
    }

    if (!publicacion.comunidadId || String(publicacion.comunidadId) !== String(admin.redAsignada)) {
      return res.status(403).json({ msg: 'No estás autorizado para eliminar la publicación' })
    }

    // Cascada
    await Comentario.deleteMany({ postId: publicacion._id })

    await Estudiante.updateMany(
      { publicacionesGuardadas: publicacion._id },
      { $pull: { publicacionesGuardadas: publicacion._id } }
    )

    await Publicacion.findByIdAndDelete(publicacion._id)

    const reportePop = await ReporteUnificado.findById(reporte._id)
      .populate('meta.publicacionId')
      .populate('meta.redId', 'nombre')
      .populate('reporterId', 'nombre apellido fotoPerfil email')
    return res.status(200).json({ msg: 'Reporte resuelto y publicación eliminada', reporte: reportePop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarReportesAdminRed = async (req, res) => {
  try {
    const admin = req.user
    if (!admin.redAsignada) return res.status(400).json({ msg: 'No tienes red asignada' })

    const reportes = await ReporteUnificado.find({ 
      subtype: 'publicacion', 
      'meta.redId': admin.redAsignada 
    })
      .populate('meta.publicacionId', 'titulo contenido tipoContenido mediaUrls')
      .populate('reporterId', 'nombre apellido fotoPerfil email')
      .sort({ createdAt: -1 })

    return res.status(200).json({ reportes })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Deletions
const deleteReportePorId = async (req, res, subtype) => {
  try {
    const { id } = req.params
    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || (subtype && reporte.subtype !== subtype)) return res.status(404).json({ msg: 'Reporte no encontrado' })
    await ReporteUnificado.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Reporte eliminado' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const deleteReporteUsuario = async (req, res) => deleteReportePorId(req, res, 'usuario')
const deleteReporteRed = async (req, res) => deleteReportePorId(req, res, 'red')
const deleteReporteApp = async (req, res) => deleteReportePorId(req, res, 'app')
const deleteReportePublicacionAdmin = async (req, res) => deleteReportePorId(req, res, 'publicacion')

// Solicitudes: crear verificacion
const crearSolicitudVerificacion = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, descripcion, solicitarVerificada = false, solicitarOficial = false } = req.body

    // Presence/format validation for `redId` and `descripcion` is handled by route validators.

    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId: redId, estado: 'activo' })
    const esCreador = red.creadaPor && red.creadaPor.equals(solicitanteId)
    if (!adminRelation && !esCreador) return res.status(403).json({ msg: 'Solo el admin asignado de la red puede solicitar verificación/oficialización' })

    if (!solicitarVerificada && !solicitarOficial) return res.status(400).json({ msg: 'Debes solicitar al menos "verificada" o "oficial"' })

    const nueva = await SolicitudUnificada.create({
      subtype: 'verificacion',
      solicitante: solicitanteId,
      descripcion: descripcion.trim(),
      meta: { redId, solicitarVerificada: Boolean(solicitarVerificada), solicitarOficial: Boolean(solicitarOficial) }
    })

    const pop = await SolicitudUnificada.findById(nueva._id).populate('meta.redId', 'nombre').populate('solicitante', 'nombre apellido fotoPerfil email')
    return res.status(201).json({ msg: 'Solicitud creada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Crear solicitud rehabilitar
const crearSolicitudRehabilitar = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, descripcion } = req.body
    // Presence/format validation for `redId` and `descripcion` is handled by route validators.
    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })
    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId: redId, estado: 'activo' })
    const esCreador = red.creadaPor && red.creadaPor.equals(solicitanteId)
    if (!adminRelation && !esCreador) return res.status(403).json({ msg: 'Solo el admin asignado de la red puede solicitar rehabilitación' })
    if (!red.deshabilitada) return res.status(400).json({ msg: 'La red no está deshabilitada' })
    const existePendiente = await SolicitudUnificada.findOne({ subtype: 'rehabilitar_red', 'meta.redId': redId, solicitante: solicitanteId, estado: 'pendiente' })
    if (existePendiente) return res.status(400).json({ msg: 'Ya existe una solicitud pendiente para esta red' })
    const nueva = await SolicitudUnificada.create({ subtype: 'rehabilitar_red', solicitante: solicitanteId, descripcion: descripcion.trim(), meta: { redId } })
    const pop = await SolicitudUnificada.findById(nueva._id).populate('meta.redId', 'nombre deshabilitada').populate('solicitante', 'nombre apellido fotoPerfil email')
    return res.status(201).json({ msg: 'Solicitud creada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Crear solicitud habilitar usuario
const crearSolicitudHabilitarUsuario = async (req, res) => {
  try {
    let solicitanteId = req.user?._id
    const { motivo, email, username } = req.body
    // Presence/format validation for `motivo` and (email|username) is handled by route validators.
    let estudiante = null
    if (solicitanteId) {
      estudiante = await Estudiante.findById(solicitanteId).select('-password')
    } else {
      if (email) estudiante = await Estudiante.findOne({ email: String(email).toLowerCase() }).select('-password')
      else if (username) estudiante = await Estudiante.findOne({ username: String(username).trim() }).select('-password')
    }
    if (!estudiante) return res.status(404).json({ msg: 'Usuario no encontrado' })
    if (!estudiante.suspendido) return res.status(400).json({ msg: 'El usuario no está suspendido' })
    const existePendiente = await SolicitudUnificada.findOne({ subtype: 'habilitar_usuario', solicitante: solicitanteId, estado: 'pendiente' })
    if (existePendiente) return res.status(400).json({ msg: 'Ya existe una solicitud pendiente' })
    // ensure solicitanteId is set to the found student's id
    solicitanteId = solicitanteId || estudiante._id
    const nueva = await SolicitudUnificada.create({ subtype: 'habilitar_usuario', solicitante: solicitanteId, descripcion: motivo.trim(), meta: { motivo } })
    const pop = await SolicitudUnificada.findById(nueva._id).populate('solicitante', 'nombre apellido fotoPerfil email')
    return res.status(201).json({ msg: 'Solicitud creada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// List own solicitudes
const listarMisSolicitudesRehabilitar = async (req, res) => {
  try {
    const adminId = req.user?._id
    const solicitudes = await SolicitudUnificada.find({ subtype: 'rehabilitar_red', solicitante: adminId }).populate('meta.redId', 'nombre deshabilitada').populate('solicitante', 'nombre apellido fotoPerfil email').sort({ createdAt: -1 })
    return res.status(200).json({ solicitudes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarMisSolicitudesVerificacion = async (req, res) => {
  try {
    const adminId = req.user?._id
    const solicitudes = await SolicitudUnificada.find({ subtype: 'verificacion', solicitante: adminId }).populate('meta.redId', 'nombre').populate('solicitante', 'nombre apellido fotoPerfil email').sort({ createdAt: -1 })
    return res.status(200).json({ solicitudes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Delete solicitudes
const deleteSolicitudRehabilitar = async (req, res) => {
  try {
    const { id } = req.params
    const sol = await SolicitudUnificada.findById(id)
    if (!sol || sol.subtype !== 'rehabilitar_red') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    await SolicitudUnificada.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Solicitud eliminada' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const deleteSolicitudHabilitarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const sol = await SolicitudUnificada.findById(id)
    if (!sol || sol.subtype !== 'habilitar_usuario') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    await SolicitudUnificada.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Solicitud eliminada' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const deleteSolicitudVerificacion = async (req, res) => {
  try {
    const { id } = req.params
    const sol = await SolicitudUnificada.findById(id)
    if (!sol || sol.subtype !== 'verificacion') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    await SolicitudUnificada.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Solicitud eliminada' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const deleteSolicitudRehabilitarByAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user?._id
    const sol = await SolicitudUnificada.findById(id)
    if (!sol || sol.subtype !== 'rehabilitar_red') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    if (String(sol.solicitante) !== String(adminId)) return res.status(403).json({ msg: 'No estás autorizado para eliminar esta solicitud' })
    await SolicitudUnificada.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Solicitud eliminada' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Resolve solicitud rehabilitar (superadmin)
const resolverSolicitudRehabilitar = async (req, res) => {
  try {
    const { id } = req.params
    const { accion, respuesta } = req.body
    if (!['Aprobar','Rechazar'].includes(accion)) return res.status(400).json({ msg: 'Acción inválida. Solo "Aprobar" o "Rechazar"' })
    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'rehabilitar_red') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    if (solicitud.estado === 'aprobada') return res.status(400).json({ msg: 'La solicitud ya fue aprobada' })
    const red = await RedComunitaria.findById(solicitud.meta.redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })
    if (accion === 'Rechazar') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      await solicitud.save()
      const pop = await SolicitudUnificada.findById(solicitud._id).populate('meta.redId', 'nombre deshabilitada').populate('solicitante', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }
    red.deshabilitada = false
    await red.save()
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    await solicitud.save()
    const pop = await SolicitudUnificada.findById(solicitud._id).populate('meta.redId', 'nombre deshabilitada').populate('solicitante', 'nombre apellido fotoPerfil email')
    return res.status(200).json({ msg: 'Solicitud aprobada. Red reactivada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Resolve solicitud habilitar usuario (superadmin)
const resolverSolicitudHabilitarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { accion, respuesta } = req.body
    if (!['Aprobar','Rechazar'].includes(accion)) return res.status(400).json({ msg: 'Acción inválida. Solo "Aprobar" o "Rechazar"' })
    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'habilitar_usuario') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    if (solicitud.estado === 'aprobada') return res.status(400).json({ msg: 'La solicitud ya fue aprobada' })
    const estudiante = await Estudiante.findById(solicitud.solicitante)
    if (!estudiante) return res.status(404).json({ msg: 'Estudiante no encontrado' })
    if (accion === 'Rechazar') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      await solicitud.save()
      const pop = await SolicitudUnificada.findById(solicitud._id).populate('solicitante', 'nombre apellido fotoPerfil email suspendido')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }
    estudiante.suspendido = false
    await estudiante.save()
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    await solicitud.save()
    const pop = await SolicitudUnificada.findById(solicitud._id).populate('solicitante', 'nombre apellido fotoPerfil email suspendido')
    return res.status(200).json({ msg: 'Solicitud aprobada. Usuario habilitado', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Resolve solicitud verificacion (superadmin)
const resolverSolicitudVerificacion = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, asignarVerificada = false, asignarOficial = false, respuesta } = req.body
    if (!['Aprobada','Rechazada'].includes(estado)) return res.status(400).json({ msg: 'Estado inválido. Solo "Aprobada" o "Rechazada"' })
    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'verificacion') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    if (solicitud.estado === 'aprobada') return res.status(400).json({ msg: 'La solicitud ya fue aprobada' })
    if (estado === 'Rechazada') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      await solicitud.save()
      const pop = await SolicitudUnificada.findById(solicitud._id).populate('meta.redId', 'nombre').populate('solicitante', 'nombre apellido fotoPerfil email').select('-__v')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }
    const red = await RedComunitaria.findById(solicitud.meta.redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })
    if (Boolean(asignarVerificada)) red.esVerificada = true
    if (Boolean(asignarOficial)) red.esOficial = true
    await red.save()
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    await solicitud.save()
    const pop = await SolicitudUnificada.findById(solicitud._id).populate('meta.redId', 'nombre esVerificada esOficial').populate('solicitante', 'nombre apellido fotoPerfil email').select('-__v')
    return res.status(200).json({ msg: 'Solicitud aprobada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const crearSolicitudRevocarAdminRed = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, descripcion } = req.body

    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    // Verificar que sea el admin activo de esa red
    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId, estado: 'activo' })
    const esCreador = red.creadaPor && red.creadaPor.equals(solicitanteId)
    if (!adminRelation && !esCreador) return res.status(403).json({ msg: 'Solo el admin activo de la red puede solicitar revocar su rol' })

    // Verificar que no haya solicitud pendiente previa
    const existePendiente = await SolicitudUnificada.findOne({
      subtype: 'revocar_admin_red',
      'meta.redId': redId,
      solicitante: solicitanteId,
      estado: 'pendiente'
    })
    if (existePendiente) return res.status(400).json({ msg: 'Ya existe una solicitud pendiente para revocar tu rol en esta red' })

    const nueva = await SolicitudUnificada.create({
      subtype: 'revocar_admin_red',
      solicitante: solicitanteId,
      descripcion: descripcion.trim(),
      meta: { redId, motivo: descripcion.trim() }
    })

    const pop = await SolicitudUnificada.findById(nueva._id)
      .populate('meta.redId', 'nombre deshabilitada')
      .populate('solicitante', 'nombre apellido fotoPerfil email')

    return res.status(201).json({ msg: 'Solicitud de revocación creada, será revisada por un administrador', solicitud: pop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const resolverSolicitudRevocarAdminRed = async (req, res) => {
  try {
    const { id } = req.params
    const { accion, respuesta } = req.body

    if (!['Aprobar', 'Rechazar'].includes(accion)) return res.status(400).json({ msg: 'Acción inválida. Solo "Aprobar" o "Rechazar"' })

    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'revocar_admin_red') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    if (solicitud.estado !== 'pendiente') return res.status(400).json({ msg: 'La solicitud ya fue resuelta' })

    const red = await RedComunitaria.findById(solicitud.meta.redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    const user = await Estudiante.findById(solicitud.solicitante)
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' })

    if (accion === 'Rechazar') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      await solicitud.save()
      const pop = await SolicitudUnificada.findById(solicitud._id)
        .populate('meta.redId', 'nombre deshabilitada')
        .populate('solicitante', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }

    // Aprobar

    // Marcar relación como revocada
    const rel = await AdminRed.findOne({ usuarioId: user._id, redId: red._id })
    if (rel) {
      rel.estado = 'revocado'
      await rel.save()
    }

    // Quitar rol admin_red del usuario
    if (Array.isArray(user.roles) && user.roles.includes('admin_red')) {
      user.roles = user.roles.filter(r => r !== 'admin_red')
      await user.save()
    }

    // Si era el creador de la red, limpiar creadaPor
    const wasCreator = red.creadaPor && red.creadaPor.toString() === user._id.toString()
    if (wasCreator) {
      red.creadaPor = null
      await red.save()
    }

    // Resolver la solicitud
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    await solicitud.save()

    // Notificar al usuario
    const emisorIdVal = req.user?._id || null
    const notificacion = await crearNotificacion({
      usuarioId: user._id,
      emisorId: emisorIdVal,
      tipo: 'mensaje',
      mensaje: solicitud.meta.motivo || `Tu solicitud de revocación como admin de la red ${red.nombre} fue aprobada`
    })

    let emisorData = null
    if (emisorIdVal) {
      emisorData = await Estudiante.findById(emisorIdVal).select('nombre apellido username fotoPerfil').lean()
    }

    await triggerUserChannel(user._id.toString(), 'nueva_notificacion', {
      _id: notificacion._id.toString(),
      tipo: notificacion.tipo,
      emisorSnap: emisorData,
      mensaje: notificacion.mensaje,
      leida: false,
      createdAt: notificacion.createdAt,
      updatedAt: notificacion.updatedAt
    })

    const pop = await SolicitudUnificada.findById(solicitud._id)
      .populate('meta.redId', 'nombre deshabilitada')
      .populate('solicitante', 'nombre apellido fotoPerfil email')

    return res.status(200).json({ msg: 'Solicitud aprobada. Rol revocado correctamente', solicitud: pop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const crearSolicitudPostularAdminRed = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, descripcion } = req.body

    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    // Solo aplica si la red no tiene admin
    if (red.creadaPor) return res.status(400).json({ msg: 'La red ya tiene un administrador asignado' })

    // La red debe estar activa
    if (red.deshabilitada) return res.status(400).json({ msg: 'No puedes postularte en una red deshabilitada' })

    // El solicitante debe ser miembro de la red
    const esMiembro = red.miembros.some(m => m.equals(solicitanteId))
    if (!esMiembro) return res.status(403).json({ msg: 'Debes ser miembro de la red para postularte como administrador' })

    // No puede postularse si ya tiene una postulación pendiente para esta red
    const existePendiente = await SolicitudUnificada.findOne({
      subtype: 'postular_admin_red',
      'meta.redId': redId,
      solicitante: solicitanteId,
      estado: 'pendiente'
    })
    if (existePendiente) return res.status(400).json({ msg: 'Ya tienes una postulación pendiente para esta red' })

    const nueva = await SolicitudUnificada.create({
      subtype: 'postular_admin_red',
      solicitante: solicitanteId,
      descripcion: descripcion.trim(),
      meta: { redId, motivo: descripcion.trim() }
    })

    const pop = await SolicitudUnificada.findById(nueva._id)
      .populate('meta.redId', 'nombre deshabilitada')
      .populate('solicitante', 'nombre apellido fotoPerfil email')

    return res.status(201).json({ msg: 'Postulación enviada, será revisada por un administrador', solicitud: pop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const resolverSolicitudPostularAdminRed = async (req, res) => {
  try {
    const { id } = req.params
    const { accion, respuesta } = req.body

    if (!['Aprobar', 'Rechazar'].includes(accion)) return res.status(400).json({ msg: 'Acción inválida. Solo "Aprobar" o "Rechazar"' })

    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'postular_admin_red') return res.status(404).json({ msg: 'Solicitud no encontrada' })
    if (solicitud.estado !== 'pendiente') return res.status(400).json({ msg: 'La solicitud ya fue resuelta' })

    const red = await RedComunitaria.findById(solicitud.meta.redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    // Verificar que la red siga sin admin al momento de resolver
    if (red.creadaPor) return res.status(400).json({ msg: 'La red ya tiene un administrador asignado' })

    const user = await Estudiante.findById(solicitud.solicitante)
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' })

    if (accion === 'Rechazar') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      await solicitud.save()
      const pop = await SolicitudUnificada.findById(solicitud._id)
        .populate('meta.redId', 'nombre deshabilitada')
        .populate('solicitante', 'nombre apellido fotoPerfil email')
      return res.status(200).json({ msg: 'Postulación rechazada', solicitud: pop })
    }

    // Aprobar

    // Añadir rol admin_red si no lo tiene
    if (!Array.isArray(user.roles)) user.roles = []
    if (!user.roles.includes('admin_red')) {
      user.roles.push('admin_red')
      await user.save()
    }

    // Añadir red a user.redComunitaria si no está
    if (!Array.isArray(user.redComunitaria)) user.redComunitaria = []
    if (!user.redComunitaria.some(rid => rid.toString() === red._id.toString())) {
      user.redComunitaria.push(red._id)
      await user.save()
    }

    // Crear o reactivar relación en AdminRed
    const existeRel = await AdminRed.findOne({ usuarioId: user._id, redId: red._id })
    if (!existeRel) {
      await AdminRed.create({
        usuarioId: user._id,
        redId: red._id,
        estado: 'activo',
        permisos: ['gestion_publicaciones', 'gestionar_miembros'],
        fechaAprobacion: new Date()
      })
    } else {
      if (existeRel.estado !== 'activo') {
        existeRel.estado = 'activo'
        existeRel.fechaAprobacion = new Date()
        await existeRel.save()
      }
    }

    // Asignar como nuevo admin de la red
    red.creadaPor = user._id
    if (!red.miembros.some(mid => mid.toString() === user._id.toString())) {
      red.miembros.push(user._id)
      red.cantidadMiembros = red.miembros.length
    }
    await red.save()

    // Rechazar automáticamente las demás postulaciones pendientes para esta red
    await SolicitudUnificada.updateMany(
      {
        subtype: 'postular_admin_red',
        'meta.redId': red._id,
        estado: 'pendiente',
        _id: { $ne: solicitud._id }
      },
      {
        estado: 'rechazada',
        respuesta: 'Se seleccionó otro administrador para la red'
      }
    )

    // Resolver la solicitud
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    await solicitud.save()

    // Notificar al nuevo admin
    const emisorIdVal = req.user?._id || null
    const notificacion = await crearNotificacion({
      usuarioId: user._id,
      emisorId: emisorIdVal,
      tipo: 'mensaje',
      mensaje: `Tu postulación fue aprobada. Ahora eres administrador de la red ${red.nombre}`
    })

    let emisorData = null
    if (emisorIdVal) {
      emisorData = await Estudiante.findById(emisorIdVal).select('nombre apellido username fotoPerfil').lean()
    }

    await triggerUserChannel(user._id.toString(), 'nueva_notificacion', {
      _id: notificacion._id.toString(),
      tipo: notificacion.tipo,
      emisorSnap: emisorData,
      mensaje: notificacion.mensaje,
      leida: false,
      createdAt: notificacion.createdAt,
      updatedAt: notificacion.updatedAt
    })

    const pop = await SolicitudUnificada.findById(solicitud._id)
      .populate('meta.redId', 'nombre deshabilitada')
      .populate('solicitante', 'nombre apellido fotoPerfil email')

    return res.status(200).json({ msg: 'Postulación aprobada. Nuevo administrador asignado', solicitud: pop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarSolicitudes = async (req, res) => {
  const { subtype } = req.params
  const { estado } = req.query

  const populateMap = {
    verificacion: {
      meta: { path: 'meta.redId', select: 'nombre' }
    },
    rehabilitar_red: {
      meta: { path: 'meta.redId', select: 'nombre deshabilitada' }
    },
    habilitar_usuario: {
      solicitante: 'nombre apellido fotoPerfil email suspendido'
    },
    postular_admin_red: {
      meta: { path: 'meta.redId', select: 'nombre deshabilitada fotoPerfil cantidadMiembros' },
      solicitante: 'nombre apellido fotoPerfil email username'
    },
    revocar_admin_red: {
      meta: { path: 'meta.redId', select: 'nombre deshabilitada fotoPerfil cantidadMiembros' },
      solicitante: 'nombre apellido fotoPerfil email username'
    }
  }

  try {
    const q = listarSolicitudesPorSubtype(subtype, populateMap[subtype], estado)
    const solicitudes = await q.exec()
    return res.status(200).json({ solicitudes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

export {
  crearReportePublicacion,
  crearReporteRed,
  crearReporteApp,
  crearReporteUsuario,
  listarReportes,
  resolverReporteUsuario,
  resolverReporteRed,
  resolverReporteApp,
  resolverReportePublicacionAdmin,
  listarReportesAdminRed,
  crearSolicitudVerificacion,
  resolverSolicitudVerificacion,
  crearSolicitudRehabilitar,
  resolverSolicitudRehabilitar,
  crearSolicitudHabilitarUsuario,
  resolverSolicitudHabilitarUsuario,
  deleteReporteUsuario,
  deleteReporteRed,
  deleteReporteApp,
  deleteReportePublicacionAdmin,
  deleteSolicitudRehabilitar,
  deleteSolicitudHabilitarUsuario,
  deleteSolicitudVerificacion,
  deleteSolicitudRehabilitarByAdmin,
  listarMisSolicitudesRehabilitar,
  listarMisSolicitudesVerificacion,
  crearSolicitudRevocarAdminRed,
  resolverSolicitudRevocarAdminRed,
  crearSolicitudPostularAdminRed,
  resolverSolicitudPostularAdminRed,
  listarSolicitudes
}
