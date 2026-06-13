import Estudiante from '../models/Estudiantes.js'
import Publicacion from '../models/Publicaciones.js'
import Comentario from '../models/Comentarios.js'
import RedComunitaria from '../models/RedComunitaria.js'
import AdminRed from '../models/adminRedes.js'
import { crearNotificacion } from '../helpers/notificaciones.js'
import { triggerUserChannel } from '../config/pusher.js'
import { sendMailRedAprobada, sendMailRedRechazada } from '../config/nodemailer.js'
import SolicitudUnificada from '../models/Solicitudes.js'

export const aprobarRed = async (red, emisorId) => {
  const userId = red.administrador
  if (!userId) throw new Error('La red no tiene asociado un creador')

  const user = await Estudiante.findById(userId)
  if (!user) throw new Error('Usuario creador no encontrado')

  // Asegurar rol 'admin_red'
  if (!Array.isArray(user.roles)) user.roles = []
  if (!user.roles.includes('admin_red')) {
    user.roles.push('admin_red')
    await user.save()
  }

  // Añadir al usuario como miembro de la red si no está
  if (!Array.isArray(user.redComunitaria)) user.redComunitaria = []
  if (!user.redComunitaria.some(rid => rid.toString() === red._id.toString())) {
    user.redComunitaria.push(red._id)
    await user.save()
  }

  // Crear relación en adminRedes si no existe
  const existeRel = await AdminRed.findOne({ usuarioId: user._id, redId: red._id })
  if (!existeRel) {
    await AdminRed.create({
      usuarioId: user._id,
      redId: red._id,
      estado: 'activo',
      permisos: ['gestion_publicaciones', 'gestionar_miembros'],
      fechaAprobacion: new Date()
    })
  }

  // Actualizar red
  red.estadoAprobacion = 'aprobada'
  if (!Array.isArray(red.miembros)) red.miembros = []
  if (!red.miembros.some(mid => mid.toString() === user._id.toString())) {
    red.miembros.push(user._id)
  }
  red.cantidadMiembros = red.miembros.length
  await red.save()

  // Notificar
  await _notificarCreador({
    usuarioId: user._id,
    emisorId,
    mensaje: 'Tu solicitud de creación de red fue aprobada'
  })

  // Email (no-throw)
  if (user.email) {
    await sendMailRedAprobada(user.email, red.nombre).catch(e =>
      console.error('Error al enviar email de red aprobada:', e)
    )
  }

  return red
}

export const rechazarRed = async (red, emisorId) => {
  const creadoPorId = red.administrador

  // Limpiar referencias en estudiantes
  await Estudiante.updateMany(
    { redComunitaria: red._id },
    { $pull: { redComunitaria: red._id } }
  )

  // Limpiar publicaciones, comentarios y guardados
  const publicaciones = await Publicacion.find({ comunidadId: red._id }).select('_id').lean()
  const postIds = (publicaciones || []).map(p => p._id).filter(Boolean)

  if (postIds.length > 0) {
    await Comentario.deleteMany({ postId: { $in: postIds } })
    await Estudiante.updateMany(
      { publicacionesGuardadas: { $in: postIds } },
      { $pull: { publicacionesGuardadas: { $in: postIds } } }
    )
    await Publicacion.deleteMany({ _id: { $in: postIds } })
  }

  await RedComunitaria.findByIdAndDelete(red._id)

  // Notificar y email al creador
  if (creadoPorId) {
    await _notificarCreador({
      usuarioId: creadoPorId,
      emisorId,
      mensaje: 'Tu solicitud de creación de red fue rechazada'
    })

    const creador = await Estudiante.findById(creadoPorId)
    if (creador?.email) {
      await sendMailRedRechazada(creador.email, red.nombre).catch(e =>
        console.error('Error al enviar email de red rechazada:', e)
      )
    }
  }
}

const _notificarCreador = async ({ usuarioId, emisorId, mensaje }) => {
  // Si el emisor es el mismo usuario, no notificar
  if (emisorId && usuarioId.toString() === emisorId.toString()) return

  const notificacion = await crearNotificacion({
    usuarioId,
    emisorId: emisorId || null,
    tipo: 'mensaje',
    mensaje
  })

  let emisorData = null
  if (emisorId) {
    emisorData = await Estudiante.findById(emisorId)
      .select('nombre apellido username fotoPerfil')
      .lean()
  }

  await triggerUserChannel(usuarioId.toString(), 'nueva_notificacion', {
    _id: notificacion._id.toString(),
    tipo: notificacion.tipo,
    emisorSnap: emisorData,
    mensaje: notificacion.mensaje,
    leida: false,
    createdAt: notificacion.createdAt,
    updatedAt: notificacion.updatedAt
  })
}

export const aprobarPostulacionAdminRed = async ({ solicitud, red, user, emisorId }) => {
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
  } else if (existeRel.estado !== 'activo') {
    existeRel.estado = 'activo'
    existeRel.fechaAprobacion = new Date()
    await existeRel.save()
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

  // Notificar al nuevo admin
  await _notificarCreador({
    usuarioId: user._id,
    emisorId,
    mensaje: `Tu postulación fue aprobada. Ahora eres administrador de la red ${red.nombre}`
  })
}