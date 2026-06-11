import ReporteUnificado from '../models/Reportes.js'
import SolicitudUnificada from '../models/Solicitudes.js'
import RedComunitaria from '../models/RedComunitaria.js'
import Publicacion from '../models/Publicaciones.js'
import Estudiante from '../models/Estudiantes.js'
import { Articulo } from '../models/Articulos.js'
import AdminRed from '../models/adminRedes.js'
import Comentario from '../models/Comentarios.js'
import { crearNotificacion } from '../helpers/notificaciones.js'
import { triggerUserChannel } from '../config/pusher.js'
import { mapEstadoFromBody, listarReportesPorSubtype, listarSolicitudesPorSubtype, populateReporte, populateSolicitud, reportePopulateMap, reporteSelectMap, solicitudPopulateMap, solicitudSelectMap } from '../helpers/reportHelpers.js'
import { isGlobalRed, getGlobalIds } from '../helpers/globalRed.js'

// Create report: publication
const crearReportePublicacion = async (req, res) => {
  try {
    const { tipo, descripcion, publicacionId } = req.body
    const publicacion = await Publicacion.findById(publicacionId)
    if (!publicacion) return res.status(404).json({ msg: 'Publicación no encontrada' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'publicacion',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD ? req.estudianteBDD._id : (req.user?._id || null),
      meta: { publicacionId: publicacion._id, redId: publicacion.comunidadId || null }
    })

    const pop = await populateReporte(nuevo._id, 'publicacion')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const crearReporteArticulo = async (req, res) => {
  try {
    const { tipo, descripcion, articuloId } = req.body

    const articulo = await Articulo.findById(articuloId)
    if (!articulo) return res.status(404).json({ msg: 'Artículo no encontrado' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'articulo',          
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD?._id ?? req.user?._id ?? null,
      meta: {
        articuloId: articulo._id,    
        redId: articulo.redComunitaria || null
      }
    })

    const pop = await populateReporte(nuevo._id, 'articulo')

    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Create report: red
const crearReporteRed = async (req, res) => {
  try {
    const { tipo, descripcion, redId } = req.body
    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red comunitaria no encontrada' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'red',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.user?._id || null,
      meta: { redId }
    })

    const pop = await populateReporte(nuevo._id, 'red')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Create report: app
const crearReporteApp = async (req, res) => {
  try {
    const { tipo, descripcion } = req.body
    const nuevo = await ReporteUnificado.create({
      subtype: 'app',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD ? req.estudianteBDD._id : (req.user?._id || null)
    })
    const pop = await populateReporte(nuevo._id, 'app')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Create report: usuario
const crearReporteUsuario = async (req, res) => {
  try {
    const { tipo, descripcion, reportadoUsuarioId, publicacionId, redId } = req.body

    const usuario = await Estudiante.findById(reportadoUsuarioId)
    if (!usuario) return res.status(404).json({ msg: 'Usuario reportado no encontrado' })

    const nuevo = await ReporteUnificado.create({
      subtype: 'usuario',
      tipo,
      descripcion: descripcion ? descripcion.trim() : '',
      reporterId: req.estudianteBDD ? req.estudianteBDD._id : (req.user?._id || null),
      meta: {
        reportadoUsuarioId,
        publicacionId: publicacionId || null,
        redId: redId || null
      }
    })

    const pop = await populateReporte(nuevo._id, 'usuario')
    return res.status(201).json({ msg: 'Reporte creado', reporte: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarReportes = async (req, res) => {
  const { subtype } = req.params
  const { estado } = req.query

  try {
    let filtroExtra = {}
    if (subtype === 'publicacion') {
      const globalIds = await getGlobalIds()
      filtroExtra = { 'meta.redId': { $in: globalIds } }
    }
    if (subtype === 'publicacion' || subtype === 'articulo') {
      const globalIds = await getGlobalIds()
      filtroExtra = { 'meta.redId': { $in: globalIds } }
    }
    const q = listarReportesPorSubtype(subtype, reportePopulateMap[subtype], estado, filtroExtra)
    q.select(reporteSelectMap[subtype] || '-__v')
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
    if (!mapped || !['resuelto', 'rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'usuario') return res.status(404).json({ msg: 'Reporte de usuario no encontrado' })

    if (['resuelto', 'rechazado'].includes(reporte.estado)) return res.status(400).json({ msg: 'El reporte ya fue resuelto o rechazado' })

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      reporte.resolvedBy = req.user._id   
      reporte.resolvedByModel = 'SuperAdmin' 
      await reporte.save()
      const reportePop = await populateReporte(reporte._id, 'usuario')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto -> suspender usuario
    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    reporte.resolvedBy = req.user._id 
    reporte.resolvedByModel = 'SuperAdmin' 
    await reporte.save()

    const usuario = await Estudiante.findById(reporte.meta.reportadoUsuarioId)
    if (usuario) {
      const eraAdminRed = usuario.roles.includes('admin_red')
      usuario.suspendido = true

      if (eraAdminRed) {
        usuario.roles = usuario.roles.filter(r => r !== 'admin_red')

        await Promise.all([
          AdminRed.findOneAndUpdate(
            { usuarioId: usuario._id, estado: 'activo' },
            { estado: 'revocado' }
          ),
          RedComunitaria.findOneAndUpdate(
            { administrador: usuario._id },
            { administrador: null }
          )
        ])
      }

      await usuario.save()

      const reportePop = await populateReporte(reporte._id, 'usuario')

      const msg = eraAdminRed
        ? 'Reporte resuelto. Usuario suspendido y rol de administrador revocado'
        : 'Reporte resuelto. Usuario suspendido'

      return res.status(200).json({ msg, reporte: reportePop })
    }

    // Si por alguna razón el usuario no existe pero el reporte sí
    const reportePop = await populateReporte(reporte._id, 'usuario')
    return res.status(200).json({ msg: 'Reporte resuelto. Usuario no encontrado en el sistema', reporte: reportePop })

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
    if (!mapped || !['resuelto', 'rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'red') return res.status(404).json({ msg: 'Reporte de red no encontrado' })

    if (['resuelto', 'rechazado'].includes(reporte.estado)) return res.status(400).json({ msg: 'El reporte ya fue resuelto o rechazado' })

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      reporte.resolvedBy = req.user._id  
      reporte.resolvedByModel = 'SuperAdmin'
      await reporte.save()
      const reportePop = await populateReporte(reporte._id, 'red')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto: deshabilitar la red
    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    reporte.resolvedBy = req.user._id 
    reporte.resolvedByModel = 'SuperAdmin'
    await reporte.save()

    const red = await RedComunitaria.findById(reporte.meta.redId)
    if (!red) {
      const reportePop = await populateReporte(reporte._id, 'red')
      return res.status(200).json({ msg: 'Reporte resuelto. La red no existe', reporte: reportePop })
    }

    red.deshabilitada = true
    await red.save()

    const reportePop = await populateReporte(reporte._id, 'red')
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
    if (!mapped || !['resuelto', 'rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'app') return res.status(404).json({ msg: 'Reporte de app no encontrado' })

    if (['resuelto', 'rechazado'].includes(reporte.estado)) return res.status(400).json({ msg: 'El reporte ya fue resuelto o rechazado' })

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      reporte.resolvedBy = req.user._id  
      reporte.resolvedByModel = 'SuperAdmin'
      await reporte.save()
      const reportePop = await populateReporte(reporte._id, 'app')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    reporte.resolvedBy = req.user._id 
    reporte.resolvedByModel = 'SuperAdmin'
    await reporte.save()

    const reportePop = await populateReporte(reporte._id, 'app')
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
    if (!mapped || !['resuelto', 'rechazado'].includes(mapped)) return res.status(400).json({ msg: 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || reporte.subtype !== 'publicacion') return res.status(404).json({ msg: 'Reporte de publicación no encontrado' })

    if (['resuelto', 'rechazado'].includes(reporte.estado))return res.status(400).json({ msg: 'El reporte ya fue resuelto o rechazado' })

    const admin = req.user
    if (!admin.redAsignada || !reporte.meta.redId || String(reporte.meta.redId) !== String(admin.redAsignada)) {
      return res.status(403).json({ msg: 'No estás autorizado para resolver este reporte' })
    }

    if (mapped === 'rechazado') {
      reporte.estado = 'rechazado'
      if (respuesta) reporte.respuesta = respuesta
      reporte.resolvedBy = req.user._id 
      reporte.resolvedByModel = 'Estudiante'
      await reporte.save()
      const reportePop = await populateReporte(reporte._id, 'publicacion')
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto: eliminar publicación con cascada
    reporte.estado = 'resuelto'
    if (respuesta) reporte.respuesta = respuesta
    reporte.resolvedBy = req.user._id 
    reporte.resolvedByModel = 'Estudiante'
    await reporte.save()

    const publicacion = await Publicacion.findById(reporte.meta.publicacionId)
    if (!publicacion) {
      const reportePop = await populateReporte(reporte._id, 'publicacion')
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

    const reportePop = await populateReporte(reporte._id, 'publicacion')
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
      .select('-meta.reportadoUsuarioId -meta.articuloId')
      .populate({
        path: 'meta.publicacionId',
        select: 'titulo contenido tipoContenido mediaUrls autorId timestamp',
        populate: { path: 'autorId', select: 'nombre apellido fotoPerfil username' }
      })
      .populate('reporterId', 'nombre apellido fotoPerfil email')
      .populate('meta.redId', 'nombre descripcion fotoPerfil')
      .sort({ createdAt: -1 })  
          
    return res.status(200).json({ reportes })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Borrar reporte o solicitud
const deleteReportePorId = async (req, res) => {
  try {
    const { id, subtype } = req.params
    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || (subtype && reporte.subtype !== subtype))
      return res.status(404).json({ msg: 'Reporte no encontrado' })

    if (reporte.estado === 'pendiente')
      return res.status(400).json({ msg: 'No puedes eliminar un reporte pendiente' })

    const esGlobalRed = await isGlobalRed(reporte.meta.redId)
    const esSuperAdmin = req.user?.rol === 'SuperAdmin'
    const esAdminRed = req.user?.roles?.includes('admin_red')

    if (esSuperAdmin) {
      if ((reporte.subtype === 'publicacion' || reporte.subtype === 'articulo') && !esGlobalRed)
        return res.status(403).json({ msg: 'Este reporte pertenece a un admin de red' })
    }

    if (esAdminRed) {
      if (reporte.subtype !== 'publicacion')
        return res.status(403).json({ msg: 'No estás autorizado para eliminar este tipo de reporte' })

      if (esGlobalRed)
        return res.status(403).json({ msg: 'No estás autorizado para eliminar reportes de la red global' })

      const relaciones = req.adminRelations || []
      const activa = relaciones.find(r => r.estado === 'activo')
      if (!activa || String(reporte.meta.redId) !== String(activa.redId))
        return res.status(403).json({ msg: 'No estás autorizado para eliminar este reporte' })
    }

    await ReporteUnificado.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Reporte eliminado' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const deleteSolicitudPorId = async (req, res) => {
  try {
    const { id, subtype } = req.params
    const sol = await SolicitudUnificada.findById(id)
    if (!sol || (subtype && sol.subtype !== subtype))
      return res.status(404).json({ msg: 'Solicitud no encontrada' })

    if (sol.estado === 'pendiente')
      return res.status(400).json({ msg: 'No puedes eliminar una solicitud pendiente' })

    await SolicitudUnificada.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Solicitud eliminada' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Solicitudes: crear verificacion
const crearSolicitudVerificacion = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, nombreRed, fechaCreacionRed, cantidadMiembros, correoInstitucional } = req.body

    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId, estado: 'activo' })
    const esCreador = red.administrador?.equals(solicitanteId)
    if (!adminRelation && !esCreador)
      return res.status(403).json({ msg: 'Solo el admin asignado de la red puede solicitar verificación' })

    const solicitudPendiente = await SolicitudUnificada.findOne({ 'meta.redId': redId, subtype: 'verificacion', estado: 'pendiente' })
    if (solicitudPendiente) return res.status(400).json({ msg: 'Ya existe una solicitud de verificación pendiente para esta red' })

    if (red.esVerificada) return res.status(400).json({ msg: 'La red ya es verificada' })

    if (nombreRed?.trim() !== red.nombre)
      return res.status(400).json({ msg: 'El nombre de la red no coincide con el registrado' })

    const fechaEnviada = new Date(fechaCreacionRed)
    const fechaReal = new Date(red.createdAt)
    if (isNaN(fechaEnviada) || fechaEnviada.toISOString().split('T')[0] !== fechaReal.toISOString().split('T')[0])
      return res.status(400).json({ msg: 'La fecha de creación no coincide con la registrada' })

    if (Number(cantidadMiembros) !== red.cantidadMiembros)
      return res.status(400).json({ msg: 'La cantidad de miembros no coincide con la registrada' })

    const diasDeVida = Math.floor((Date.now() - red.createdAt) / (1000 * 60 * 60 * 24))
    if (diasDeVida < 30)
      return res.status(400).json({ msg: `La red debe tener al menos 30 días de antigüedad (actualmente tiene ${diasDeVida} días)` })

    if (red.cantidadMiembros < 30)
      return res.status(400).json({ msg: `La red debe tener al menos 30 miembros (actualmente tiene ${red.cantidadMiembros})` })

    const estudiante = await Estudiante.findById(solicitanteId).select('email')
    if (!correoInstitucional || correoInstitucional.toLowerCase() !== estudiante.email.toLowerCase())
      return res.status(400).json({ msg: 'El correo institucional debe ser el tuyo, no el de otra persona' })

    const nueva = await SolicitudUnificada.create({
      subtype: 'verificacion',
      solicitante: solicitanteId,
      descripcion: '',
      meta: {
        redId,
        solicitarVerificada: true,
        solicitarOficial: false,
        nombreRed: red.nombre,
        fechaCreacionRed: red.createdAt,
        cantidadMiembros: red.cantidadMiembros,
        correoInstitucional: correoInstitucional.toLowerCase()
      }
    })

    const pop = await populateSolicitud(nueva._id, 'verificacion')

    return res.status(201).json({ msg: 'Solicitud de verificación creada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const crearSolicitudOficializacion = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, nombreRed, fechaCreacionRed, cantidadMiembros, dependencia, dependenciaPersonalizada, cargo, cargoPersonalizado, correoInstitucional, justificacion } = req.body

    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId, estado: 'activo' })
    const esCreador = red.administrador?.equals(solicitanteId)
    if (!adminRelation && !esCreador)
      return res.status(403).json({ msg: 'Solo el admin asignado de la red puede solicitar oficialización' })

    const solicitudPendiente = await SolicitudUnificada.findOne({ 'meta.redId': redId, subtype: 'oficializacion', estado: 'pendiente' })
    if (solicitudPendiente) return res.status(400).json({ msg: 'Ya existe una solicitud de oficialización pendiente para esta red' })

    if (red.esOficial) return res.status(400).json({ msg: 'La red ya es oficial' })

    if (nombreRed?.trim() !== red.nombre)
      return res.status(400).json({ msg: 'El nombre de la red no coincide con el registrado' })

    const fechaEnviada = new Date(fechaCreacionRed)
    const fechaReal = new Date(red.createdAt)
    if (isNaN(fechaEnviada) || fechaEnviada.toISOString().split('T')[0] !== fechaReal.toISOString().split('T')[0])
      return res.status(400).json({ msg: 'La fecha de creación no coincide con la registrada' })

    if (Number(cantidadMiembros) !== red.cantidadMiembros)
      return res.status(400).json({ msg: 'La cantidad de miembros no coincide con la registrada' })

    const diasDeVida = Math.floor((Date.now() - red.createdAt) / (1000 * 60 * 60 * 24))
    if (diasDeVida < 30)
      return res.status(400).json({ msg: `La red debe tener al menos 30 días de antigüedad (actualmente tiene ${diasDeVida} días)` })

    if (red.cantidadMiembros < 30)
      return res.status(400).json({ msg: `La red debe tener al menos 30 miembros (actualmente tiene ${red.cantidadMiembros})` })

    const estudiante = await Estudiante.findById(solicitanteId).select('email')
    if (!correoInstitucional || correoInstitucional.toLowerCase() !== estudiante.email.toLowerCase())
      return res.status(400).json({ msg: 'El correo institucional debe ser el tuyo, no el de otra persona' })

    const nueva = await SolicitudUnificada.create({
      subtype: 'oficializacion',
      solicitante: solicitanteId,
      descripcion: '',
      meta: {
        redId,
        solicitarVerificada: false,
        solicitarOficial: true,
        nombreRed: red.nombre,
        fechaCreacionRed: red.createdAt,
        cantidadMiembros: red.cantidadMiembros,
        dependencia,
        dependenciaPersonalizada: dependencia === 'Otro' ? dependenciaPersonalizada.trim() : null,
        cargo,
        cargoPersonalizado: cargo === 'Otro' ? cargoPersonalizado.trim() : null,
        correoInstitucional: correoInstitucional.toLowerCase(),
        justificacion: justificacion.trim()
      }
    })

    const pop = await populateSolicitud(nueva._id, 'oficializacion')

    return res.status(201).json({ msg: 'Solicitud de oficialización creada', solicitud: pop })
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
    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })
    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId: redId, estado: 'activo' })
    const esCreador = red.administrador && red.administrador.equals(solicitanteId)
    if (!adminRelation && !esCreador) return res.status(403).json({ msg: 'Solo el admin asignado de la red puede solicitar rehabilitación' })
    if (!red.deshabilitada) return res.status(400).json({ msg: 'La red no está deshabilitada' })
    const existePendiente = await SolicitudUnificada.findOne({ subtype: 'rehabilitar_red', 'meta.redId': redId, solicitante: solicitanteId, estado: 'pendiente' })
    if (existePendiente) return res.status(400).json({ msg: 'Ya existe una solicitud pendiente para esta red' })
    const nueva = await SolicitudUnificada.create({ subtype: 'rehabilitar_red', solicitante: solicitanteId, descripcion: descripcion.trim(), meta: { redId } })
    const pop = await populateSolicitud(nueva._id, 'rehabilitar_red')
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
    let estudiante = null
    if (solicitanteId) {
      estudiante = await Estudiante.findById(solicitanteId).select('-password')
    } else {
      if (email) estudiante = await Estudiante.findOne({ email: String(email).toLowerCase() }).select('-password')
      else if (username) estudiante = await Estudiante.findOne({ username: String(username).trim() }).select('-password')
    }
    if (!estudiante) return res.status(404).json({ msg: 'Usuario no encontrado' })
    if (!estudiante.suspendido) return res.status(400).json({ msg: 'El usuario no está suspendido' })
    solicitanteId = solicitanteId || estudiante._id
    const existePendiente = await SolicitudUnificada.findOne({ subtype: 'habilitar_usuario', solicitante: solicitanteId, estado: 'pendiente' })
    if (existePendiente) return res.status(400).json({ msg: 'Ya existe una solicitud pendiente' })
    const nueva = await SolicitudUnificada.create({ subtype: 'habilitar_usuario', solicitante: solicitanteId, descripcion: motivo.trim(), meta: {} })
    const pop = await populateSolicitud(nueva._id, 'habilitar_usuario')
    return res.status(201).json({ msg: 'Solicitud creada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

// Listar solicitudes del admin logueado por subtype
const listarMisSolicitudes = async (req, res) => {
  try {
    const { subtype } = req.params
    const adminId = req.user?._id

    const solicitudes = await SolicitudUnificada.find({ subtype, solicitante: adminId })
      .populate('meta.redId', 'nombre deshabilitada')
      .populate('solicitante', 'nombre apellido fotoPerfil email')
      .sort({ createdAt: -1 })

    return res.status(200).json({ solicitudes })
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
      solicitud.resolvedBy = req.user._id
      await solicitud.save()
      const pop = await populateSolicitud(solicitud._id, 'rehabilitar_red')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }
    red.deshabilitada = false
    await red.save()
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    solicitud.resolvedBy = req.user._id
    await solicitud.save()
    const pop = await populateSolicitud(solicitud._id, 'rehabilitar_red')
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
      solicitud.resolvedBy = req.user._id 
      await solicitud.save()
      const pop = await SolicitudUnificada.findById(solicitud._id).populate('solicitante', 'nombre apellido fotoPerfil email suspendido').populate('resolvedBy', 'nombre apellido rol')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }
    estudiante.suspendido = false
    await estudiante.save()
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    solicitud.resolvedBy = req.user._id 
    await solicitud.save()
    const pop = await SolicitudUnificada.findById(solicitud._id).populate('solicitante', 'nombre apellido fotoPerfil email suspendido').populate('resolvedBy', 'nombre apellido rol')
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
    const { estado, respuesta } = req.body

    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'verificacion')
      return res.status(404).json({ msg: 'Solicitud no encontrada' })

    if (['aprobada', 'rechazada'].includes(solicitud.estado))
      return res.status(400).json({ msg: 'La solicitud ya fue procesada' })

    if (estado === 'Rechazada') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      solicitud.resolvedBy = req.user._id 
      await solicitud.save()
      const pop = await populateSolicitud(solicitud._id, 'verificacion')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }

    const red = await RedComunitaria.findById(solicitud.meta.redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    red.esVerificada = true
    await red.save()

    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    solicitud.resolvedBy = req.user._id 
    await solicitud.save()

    const pop = await populateSolicitud(solicitud._id, 'verificacion')
    return res.status(200).json({ msg: 'Solicitud aprobada', solicitud: pop })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const resolverSolicitudOficializacion = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, respuesta } = req.body

    const solicitud = await SolicitudUnificada.findById(id)
    if (!solicitud || solicitud.subtype !== 'oficializacion')
      return res.status(404).json({ msg: 'Solicitud no encontrada' })

    if (['aprobada', 'rechazada'].includes(solicitud.estado))
      return res.status(400).json({ msg: 'La solicitud ya fue procesada' })

    if (estado === 'Rechazada') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      solicitud.resolvedBy = req.user._id
      await solicitud.save()
      const pop = await populateSolicitud(solicitud._id, 'oficializacion')
      return res.status(200).json({ msg: 'Solicitud rechazada', solicitud: pop })
    }

    const red = await RedComunitaria.findById(solicitud.meta.redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    red.esOficial = true
    await red.save()

    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    solicitud.resolvedBy = req.user._id
    await solicitud.save()

    const pop = await populateSolicitud(solicitud._id, 'oficializacion')
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
    const esCreador = red.administrador && red.administrador.equals(solicitanteId)
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
      meta: { redId }
    })

    const pop = await populateSolicitud(nueva._id, 'revocar_admin_red')

    return res.status(201).json({ msg: 'Solicitud de revocación creada, será revisada por el super administrador', solicitud: pop })

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
      solicitud.resolvedBy = req.user._id
      await solicitud.save()
      const pop = await populateSolicitud(solicitud._id, 'revocar_admin_red')
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

    // Si era el creador de la red, limpiar administrador
    const wasCreator = red.administrador && red.administrador.toString() === user._id.toString()
    if (wasCreator) {
      red.administrador = null
      await red.save()
    }

    // Resolver la solicitud
    solicitud.estado = 'aprobada'
    if (respuesta) solicitud.respuesta = respuesta
    solicitud.resolvedBy = req.user._id
    await solicitud.save()

    // Notificar al usuario
    const emisorIdVal = req.user?._id || null
    const notificacion = await crearNotificacion({
      usuarioId: user._id,
      emisorId: emisorIdVal,
      tipo: 'mensaje',
      mensaje: solicitud.descripcion || `Tu solicitud de revocación como admin de la red ${red.nombre} fue aprobada`
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

    const pop = await populateSolicitud(solicitud._id, 'revocar_admin_red')

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
    if (red.administrador) return res.status(400).json({ msg: 'La red ya tiene un administrador asignado' })

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
      meta: { redId }
    })

    const pop = await populateSolicitud(nueva._id, 'postular_admin_red')

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
    if (red.administrador) return res.status(400).json({ msg: 'La red ya tiene un administrador asignado' })

    const user = await Estudiante.findById(solicitud.solicitante)
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' })

    if (accion === 'Rechazar') {
      solicitud.estado = 'rechazada'
      if (respuesta) solicitud.respuesta = respuesta
      solicitud.resolvedBy = req.user._id
      await solicitud.save()
      const pop = await populateSolicitud(solicitud._id, 'postular_admin_red')
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
    red.administrador = user._id
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
    solicitud.resolvedBy = req.user._id
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

    const pop = await populateSolicitud(solicitud._id, 'postular_admin_red')

    return res.status(200).json({ msg: 'Postulación aprobada. Nuevo administrador asignado', solicitud: pop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarSolicitudes = async (req, res) => {
  const { subtype } = req.params
  const { estado } = req.query

  try {
    const q = listarSolicitudesPorSubtype(subtype, solicitudPopulateMap[subtype], estado)
    q.select(solicitudSelectMap[subtype] || '-__v')
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
  deleteSolicitudPorId,
  deleteReportePorId,
  resolverSolicitudRehabilitar,
  crearSolicitudHabilitarUsuario,
  resolverSolicitudHabilitarUsuario,
  deleteSolicitudRehabilitarByAdmin,
  listarMisSolicitudes,
  crearSolicitudRevocarAdminRed,
  resolverSolicitudRevocarAdminRed,
  crearSolicitudPostularAdminRed,
  resolverSolicitudPostularAdminRed,
  listarSolicitudes,
  resolverSolicitudOficializacion,
  crearSolicitudOficializacion,
  crearReporteArticulo
}
