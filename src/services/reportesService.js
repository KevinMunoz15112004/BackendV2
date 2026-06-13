import Estudiante from '../models/Estudiantes.js'
import Publicacion from '../models/Publicaciones.js'
import Comentario from '../models/Comentarios.js'
import RedComunitaria from '../models/RedComunitaria.js'
import AdminRed from '../models/adminRedes.js'
import { crearNotificacion } from '../helpers/notificaciones.js'
import { triggerUserChannel } from '../config/pusher.js'
import { Articulo } from '../models/Articulos.js'
import { agregarStrikeUsuario, agregarStrikeRed } from '../helpers/reportHelpers.js'

export const eliminarPublicacionConStrike = async ({ reporte }) => {
  const publicacion = await Publicacion.findById(reporte.meta.publicacionId)
  if (!publicacion) return { noExiste: true }

  const autorId = publicacion.autorId

  await Comentario.deleteMany({ postId: publicacion._id })
  await Estudiante.updateMany(
    { publicacionesGuardadas: publicacion._id },
    { $pull: { publicacionesGuardadas: publicacion._id } }
  )
  await Publicacion.findByIdAndDelete(publicacion._id)

  if (!autorId) return { noExiste: false, autorActualizado: null }

  const strikeData = {
    reporteId: reporte._id,
    motivo: reporte.descripcion || 'Publicación eliminada por reporte aprobado en Red Global',
    tipoReporte: 'publicacion',
    publicacionId: reporte.meta.publicacionId,
    fecha: new Date()
  }
  const autorActualizado = await agregarStrikeUsuario(autorId, strikeData)

  if (autorActualizado?.strikes.length >= 5) {
    await Estudiante.findByIdAndUpdate(autorId, { suspendido: true })
  }

  await crearNotificacion({
    usuarioId: autorId,
    emisorId: null,
    tipo: 'strike',
    publicacionId: reporte.meta.publicacionId,
    mensaje: autorActualizado?.strikes.length >= 5
      ? `Una de tus publicaciones en la Red Global fue eliminada. Has alcanzado 5 strikes y tu cuenta fue suspendida.`
      : `Una de tus publicaciones en la Red Global fue eliminada. Has recibido un strike. Total: ${autorActualizado?.strikes.length ?? '?'}/5`
  })

  await triggerUserChannel(autorId.toString(), 'nuevo_strike', {
    strikesActuales: autorActualizado?.strikes.length ?? 0,
    suspendido: autorActualizado?.suspendido ?? false,
    motivo: reporte.motivo ?? reporte.descripcion ?? ''
  })

  return { noExiste: false, autorActualizado }
}

export const eliminarArticuloConStrike = async ({ reporte }) => {
  const articulo = await Articulo.findById(reporte.meta.articuloId)
  if (!articulo) return { noExiste: true }

  const autorId = articulo.autorId

  await Comentario.deleteMany({ postId: articulo._id })
  await Estudiante.updateMany(
    { publicacionesGuardadas: articulo._id },
    { $pull: { publicacionesGuardadas: articulo._id } }
  )
  await Articulo.findByIdAndDelete(articulo._id)

  if (!autorId) return { noExiste: false, autorActualizado: null }

  const strikeData = {
    reporteId: reporte._id,
    motivo: reporte.descripcion || 'Artículo eliminado por reporte aprobado en Red Global',
    tipoReporte: 'articulo',
    articuloId: reporte.meta.articuloId,
    fecha: new Date()
  }
  const autorActualizado = await agregarStrikeUsuario(autorId, strikeData)

  if (autorActualizado?.strikes.length >= 5) {
    await Estudiante.findByIdAndUpdate(autorId, { suspendido: true })
  }

  await crearNotificacion({
    usuarioId: autorId,
    emisorId: null,
    tipo: 'strike',
    articuloId: reporte.meta.articuloId,
    mensaje: autorActualizado?.strikes.length >= 5
      ? `Una de tus publicaciones fue eliminada. Has alcanzado 5 strikes y tu cuenta fue suspendida.`
      : `Una de tus publicaciones fue eliminada. Has recibido un strike. Total: ${autorActualizado?.strikes.length ?? '?'}/5`
  })

  await triggerUserChannel(autorId.toString(), 'nuevo_strike', {
    strikesActuales: autorActualizado?.strikes.length ?? 0,
    suspendido: autorActualizado?.suspendido ?? false,
    motivo: reporte.motivo ?? reporte.descripcion ?? ''
  })

  return { noExiste: false, autorActualizado }
}

export const suspenderUsuarioConStrike = async ({ reporte, resolvedByModel = 'SuperAdmin' }) => {
  const strikeData = {
    reporteId: reporte._id,
    motivo: reporte.descripcion || 'Reporte de usuario aprobado por super administrador',
    tipoReporte: 'usuario',
    fecha: new Date()
  }

  const usuarioActualizado = await agregarStrikeUsuario(reporte.meta.reportadoUsuarioId, strikeData)
  if (!usuarioActualizado) return null

  if (usuarioActualizado.strikes.length >= 5) {
    const eraAdminRed = usuarioActualizado.roles.includes('admin_red')
    await Estudiante.findByIdAndUpdate(reporte.meta.reportadoUsuarioId, {
      suspendido: true,
      ...(eraAdminRed && { $pull: { roles: 'admin_red' } })
    })

    if (eraAdminRed) {
      await Promise.all([
        AdminRed.findOneAndUpdate(
          { usuarioId: usuarioActualizado._id, estado: 'activo' },
          { estado: 'revocado' }
        ),
        RedComunitaria.findOneAndUpdate(
          { administrador: usuarioActualizado._id },
          { administrador: null }
        )
      ])
    }
  }

  await crearNotificacion({
    usuarioId: reporte.meta.reportadoUsuarioId,
    emisorId: null,
    tipo: 'strike',
    mensaje: usuarioActualizado.strikes.length >= 5
      ? `Has alcanzado 5 strikes y tu cuenta fue suspendida.`
      : `Has recibido un strike. Total: ${usuarioActualizado.strikes.length}/5`
  })

  await triggerUserChannel(usuarioActualizado._id.toString(), 'nuevo_strike', {
    strikesActuales: usuarioActualizado.strikes.length,
    suspendido: usuarioActualizado.suspendido,
    motivo: reporte.motivo ?? reporte.descripcion ?? ''
  });

  return usuarioActualizado
}

export const amonestrarRedConStrike = async ({ reporte }) => {
  const strikeDataRed = {
    reporteId: reporte._id,
    motivo: reporte.descripcion || 'Reporte de red aprobado por super administrador',
    fecha: new Date()
  }

  const redActualizada = await agregarStrikeRed(reporte.meta.redId, strikeDataRed)
  if (!redActualizada) return null

  if (redActualizada.strikes.length >= 5) {
    await RedComunitaria.findByIdAndUpdate(reporte.meta.redId, { deshabilitada: true })
  }

  if (redActualizada.administrador) {
    await crearNotificacion({
      usuarioId: redActualizada.administrador,
      emisorId: null,
      tipo: 'strike',
      mensaje: redActualizada.strikes.length >= 5
        ? `Tu red comunitaria ha alcanzado 5 strikes y fue deshabilitada.`
        : `Tu red comunitaria ha recibido un strike. Total: ${redActualizada.strikes.length}/5`
    })
  }

  return redActualizada
}

export const eliminarPublicacionAdminConStrike = async ({ reporte, redAsignada }) => {
  const publicacion = await Publicacion.findById(reporte.meta.publicacionId)
  if (!publicacion) return { noExiste: true }

  if (!publicacion.comunidadId || String(publicacion.comunidadId) !== String(redAsignada)) {
    throw new Error('No autorizado para eliminar esta publicación')
  }

  const autorId = publicacion.autorId

  await Comentario.deleteMany({ postId: publicacion._id })
  await Estudiante.updateMany(
    { publicacionesGuardadas: publicacion._id },
    { $pull: { publicacionesGuardadas: publicacion._id } }
  )
  await Publicacion.findByIdAndDelete(publicacion._id)

  if (!autorId) return { noExiste: false, autorActualizado: null }

  const strikeData = {
    reporteId: reporte._id,
    motivo: reporte.descripcion || 'Publicación eliminada por reporte aprobado',
    tipoReporte: 'publicacion',
    publicacionId: reporte.meta.publicacionId,
    fecha: new Date()
  }
  const autorActualizado = await agregarStrikeUsuario(autorId, strikeData)

  if (autorActualizado?.strikes.length >= 5) {
    await Estudiante.findByIdAndUpdate(autorId, { suspendido: true })
  }

  await crearNotificacion({
    usuarioId: autorId,
    emisorId: null,
    tipo: 'strike',
    publicacionId: reporte.meta.publicacionId,
    mensaje: autorActualizado?.strikes.length >= 5
      ? `Una de tus publicaciones fue eliminada. Has alcanzado 5 strikes y tu cuenta fue suspendida.`
      : `Una de tus publicaciones fue eliminada. Has recibido un strike. Total: ${autorActualizado?.strikes.length ?? '?'}/5`
  })

  await triggerUserChannel(autorId.toString(), 'nuevo_strike', {
    strikesActuales: autorActualizado?.strikes.length ?? 0,
    suspendido: autorActualizado?.suspendido ?? false,
    motivo: reporte.motivo ?? reporte.descripcion ?? ''
  })

  return { noExiste: false, autorActualizado }
}