import AdminRed from '../models/adminRedes.js'
import Estudiante from '../models/Estudiantes.js'
import { sendMailToRecoveryPassword } from '../config/nodemailer.js'
import fs from 'fs-extra'
import { v2 as cloudinary } from 'cloudinary'
import profileService from '../services/profileService.js'
import Publicacion from '../models/Publicaciones.js'
import { Articulo } from '../models/Articulos.js'
import Comentario from '../models/Comentarios.js'
import mongoose from 'mongoose'
import RedComunitaria from '../models/RedComunitaria.js'
import { isGlobalRed, filterOutGlobalIds } from '../helpers/globalRed.js'

const perfilAdminRed = async (req, res) => {
  try {
    if (req.user.redAsignada && await isGlobalRed(req.user.redAsignada)) {
      delete req.user.redAsignada
    }

    const perfil = {
      _id: req.user._id,
      nombre: req.user.nombre,
      apellido: req.user.apellido,
      fotoPerfil: req.user.fotoPerfil,
      email: req.user.email,
      username: req.user.username,
      biografia: req.user.biografia,
      roles: req.user.roles,
      redAsignada: req.user.redAsignada || null
    }

    return res.status(200).json(perfil)
  } catch (error) {
    console.error('Error en perfilAdminRed:', error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const obtenerInfoRed = async (req, res) => {
  try {
    const relaciones = req.adminRelations || []
    const activa = relaciones.find(r => r.estado === 'activo')
    if (!activa) return res.status(400).json({ msg: 'No tienes una red comunitaria asignada.' })

    const red = await RedComunitaria.findById(activa.redId).lean()
    if (!red) return res.status(404).json({ msg: 'Red comunitaria no encontrada' })

    // Contadores importantes para mostrar al admin de red
    const publicacionesCount = await Publicacion.countDocuments({ comunidadId: red._id })

    // Asegurar que cantidadMiembros esté poblada o derivada
    const cantidadMiembros = typeof red.cantidadMiembros === 'number' ? red.cantidadMiembros : (Array.isArray(red.miembros) ? red.miembros.length : 0)

    const info = {
      _id: red._id,
      nombre: red.nombre,
      descripcion: red.descripcion,
      proposito: red.proposito,
      fotoPerfil: red.fotoPerfil || null,
      esVerificada: red.esVerificada || false,
      deshabilitada: red.deshabilitada || false,
      esGlobal: red.esGlobal || false,
      esOficial: red.esOficial || false,
      cantidadMiembros,
      publicacionesCount,
      creadaAt: red.createdAt,
      actualizadaAt: red.updatedAt
    }

    return res.status(200).json({ msg: 'Red comunitaria asignada', red: info })

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error en el servidor' });
  }
}

const verEstudiantesDeRed = async (req, res) => {
  try {
    const relaciones = req.adminRelations || []
    const activa = relaciones.find(r => r.estado === 'activo')
    const redAsignada = activa ? activa.redId : null

    if (!redAsignada) return res.status(400).json({ msg: 'No tienes una red comunitaria asignada.' })

    const estudiantes = await Estudiante.find({ redComunitaria: redAsignada }).select('nombre apellido email fotoPerfil').lean()

    if (estudiantes.length === 0) {
      return res.status(200).json({ msg: 'No hay estudiantes en tu red comunitaria', estudiantes: [] })
    }

    res.status(200).json({ msg: 'Estudiantes encontrados', estudiantes })
  } catch (error) {
    console.error('Error al listar estudiantes:', error)
    res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const eliminarEstudianteDeRed = async (req, res) => {
  try {
    const relaciones = req.adminRelations || []
    const activa = relaciones.find(r => r.estado === 'activo')
    const redAsignadaId = activa ? activa.redId : null
    const { estudianteId } = req.params

    const estudiante = await Estudiante.findById(estudianteId)

    if (!estudiante) {
      return res.status(404).json({ msg: 'Estudiante no encontrado' })
    }

    if (!redAsignadaId) return res.status(403).json({ msg: 'No autorizado para esta acción' })
    if (!estudiante.redComunitaria || !estudiante.redComunitaria.some(r => String(r) === String(redAsignadaId))) {
      return res.status(403).json({ msg: 'No puedes modificar estudiantes que no pertenecen a tu red comunitaria' })
    }

    estudiante.redComunitaria = estudiante.redComunitaria.filter(
      redId => redId.toString() !== redAsignadaId.toString()
    )
    await estudiante.save()

    const red = await RedComunitaria.findById(redAsignadaId)
    if (red) {
      red.miembros = red.miembros.filter(
        miembroId => miembroId.toString() !== estudianteId
      )
      red.cantidadMiembros = red.miembros.length
      await red.save()
    }

    res.status(200).json({ msg: 'Estudiante removido de la red comunitaria correctamente' })
  } catch (error) {
    console.error('Error al eliminar estudiante de red:', error)
    res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const actualizarRedComunitaria = async (req, res) => {
  try {
    if (!req.user.roles || !req.user.roles.includes('admin_red')) {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo los administradores de red pueden realizar esta acción.' })
    }

    const relaciones = req.adminRelations || []
    const activa = relaciones.find(r => r.estado === 'activo')
    const redId = activa ? activa.redId : null

    const { descripcion, nombre, proposito } = req.body || {}

    if (!redId) {
      return res.status(400).json({ msg: 'No estás asignado a ninguna red comunitaria.' })
    }

    const red = await RedComunitaria.findById(redId)

    if (!red) {
      return res.status(404).json({ msg: 'Red comunitaria no encontrada.' })
    }

    let seActualizo = false

    if (nombre?.trim()) {
      const nombreTrim = nombre.trim()
      const existente = await RedComunitaria.findOne({ nombre: { $regex: `^${nombreTrim}$`, $options: 'i' }, _id: { $ne: red._id } })
      if (existente) return res.status(400).json({ msg: 'Ya existe una red comunitaria con ese nombre.' })
      red.nombre = nombreTrim
      seActualizo = true
    }

    if (descripcion?.trim()) {
      red.descripcion = descripcion.trim()
      seActualizo = true
    }

    if (proposito?.trim()) {
      red.proposito = proposito.trim()
      seActualizo = true
    }

    if ((req.files && req.files.imagen) || (req.body && req.body.fotoPerfil)) {
      try {
        const url = await profileService.handleProfileImage({ req, bodyField: 'fotoPerfil', filesField: 'imagen', folder: 'foto_red_comunitaria', publicIdPrefix: red._id, required: false })
        if (url) {
          red.fotoPerfil = url
          seActualizo = true
        }
      } catch (err) {
        if (err && err.type === 'VALIDATION') return res.status(400).json({ msg: err.message, code: err.code })
        if (err && err.type === 'UPLOAD_ERROR') return res.status(500).json({ msg: err.message, code: err.code })
        console.error('Error al subir imagen de la red:', err)
        return res.status(500).json({ msg: 'Error al subir la imagen' })
      }
    }

    await red.save()

    res.status(200).json({ msg: 'Red comunitaria actualizada exitosamente', red })
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.nombre) {
      return res.status(400).json({ msg: 'Ya existe una red comunitaria con ese nombre.' })
    }
    console.error('Error al actualizar red comunitaria:', error)
    res.status(500).json({ msg: 'Error en el servidor' })
  }
}

export {
  perfilAdminRed,
  obtenerInfoRed,
  verEstudiantesDeRed,
  eliminarEstudianteDeRed,
  actualizarRedComunitaria
}