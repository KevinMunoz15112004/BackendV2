import AdminRed from '../models/adminRedes.js'
import Estudiante from '../models/Estudiantes.js'
import { crearTokenJWT } from '../middlewares/authAdminRed.js'
import { sendMailToRecoveryPassword } from '../config/nodemailer.js'
import fs from 'fs-extra'
import cloudinary from 'cloudinary'
import Publicacion from '../models/Publicaciones.js'
import { Articulo } from '../models/Articulos.js'
import mongoose from 'mongoose'
import RedComunitaria from '../models/RedComunitaria.js'

//Controladores para la gestión de la cuenta
const loginAdminRed = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ msg: "Debes llenar todos los campos" })
  }

  const adminBDD = await AdminRed.findOne({ email }).select("-__v -token -updatedAt -createdAt")
  if (!adminBDD) {
    return res.status(404).json({ msg: "Usuario no registrado" })
  }

  if (!adminBDD.confirmEmail) {
    return res.status(403).json({ msg: "Debes verificar tu cuenta" })
  }

  const match = await adminBDD.matchPassword(password)
  if (!match) {
    return res.status(401).json({ msg: "Contraseña incorrecta" })
  }

  const token = crearTokenJWT(adminBDD._id, adminBDD.rol)

  res.status(200).json({
    token,
    rol: adminBDD.rol,
    nombre: adminBDD.nombre,
    apellido: adminBDD.apellido,
    celular: adminBDD.celular,
    email: adminBDD.email,
    _id: adminBDD._id
  })
}

const perfilAdminRed = (req, res) => {
  delete req.user.token
  delete req.user.confirmEmail
  delete req.user.createdAt
  delete req.user.updatedAt
  delete req.user.__v
  res.status(200).json(req.user)
}

const actualizarPerfilAdminRed = async (req, res) => {
  const id = req.user._id
  const campos = ["nombre", "apellido", "celular", "email"]
  const datos = {}

  for (const campo of campos) {
    if (req.body[campo] && req.body[campo].trim() !== "") {
      datos[campo] = req.body[campo]
    }
  }

  if (Object.keys(datos).length === 0) return res.status(400).json({ msg: "No se recibió ningún cambio" })

  const adminRedBDD = await AdminRed.findById(id)
  if (!adminRedBDD) return res.status(404).json({ msg: "Usuario no encontrado" })

  if (datos.email && datos.email !== adminRedBDD.email) {
    const existeEmail = await AdminRed.findOne({ email: datos.email })
    if (existeEmail) return res.status(400).json({ msg: "El correo ya está registrado" })
  }

  Object.assign(adminRedBDD, datos)
  await adminRedBDD.save()

  res.status(200).json({ msg: "Perfil actualizado correctamente" })
}

const actualizarPasswordAdminRed = async (req, res) => {
  const id = req.user._id
  const { passwordactual, passwordnuevo } = req.body

  if (!passwordactual || !passwordnuevo) return res.status(400).json({ msg: "Campos obligatorios" })

  const adminBDD = await AdminRed.findById(id)
  if (!adminBDD) return res.status(404).json({ msg: "Usuario no encontrado" })

  const match = await adminBDD.matchPassword(passwordactual)
  if (!match) return res.status(400).json({ msg: "La contraseña actual es incorrecta" })

  adminBDD.password = await adminBDD.encrypPassword(passwordnuevo)
  await adminBDD.save()

  res.status(200).json({ msg: "Contraseña actualizada correctamente" })
}

const actualizarAvatarAdminRed = async (req, res) => {
  const id = req.user._id

  if (!req.files || !req.files.imagen) {
    return res.status(400).json({ msg: 'Debes subir una imagen' })
  }

  const file = req.files.imagen

  const adminRedBDD = await AdminRed.findById(id)
  if (!adminRedBDD) {
    return res.status(404).json({ msg: 'Usuario no encontrado' })
  }

  try {
    const resultado = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'avatar_adminRed',
      public_id: `${id}_avatar`,
      overwrite: true,
    })

    await fs.unlink(file.tempFilePath)

    adminRedBDD.avatar = resultado.secure_url
    await adminRedBDD.save()

    res.status(200).json({
      msg: 'Avatar actualizado correctamente',
      avatar: adminRedBDD.avatar,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Error al subir imagen', error: error.message })
  }
}

const listarPublicaciones = async (req, res) => {
  try {
    if (req.user.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo para administradores de red.' })
    }

    const redAsignada = req.user.redAsignada;

    if (!redAsignada) {
      return res.status(400).json({ msg: 'El administrador no tiene una red comunitaria asignada' })
    }

    const publicaciones = await Publicacion.find({ comunidadId: redAsignada })
      .populate('autorId', 'nombre apellido')
      .populate('comunidadId', 'nombre')
      .sort({ timestamp: -1 })

    if (publicaciones.length === 0) {
      return res.status(200).json({ msg: 'No hay publicaciones disponibles', publicaciones: [] })
    }

    res.status(200).json(publicaciones)
  } catch (error) {
    console.error('Error al listar publicaciones:', error)
    res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const eliminarPublicacionAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const admin = req.user

    if (admin.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo administradores de red pueden eliminar publicaciones.' })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'ID de publicación no válido' })
    }

    const publicacion = await Publicacion.findById(id)
    if (!publicacion) {
      return res.status(404).json({ msg: 'Publicación no encontrada' })
    }

    if (!publicacion.comunidadId.equals(admin.redAsignada)) {
      return res.status(403).json({ msg: 'No tienes permiso para eliminar publicaciones de esta red' })
    }

    await Publicacion.findByIdAndDelete(id)

    return res.status(200).json({ msg: 'Publicación eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar publicación:', error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const listarArticulosPorRedAdmin = async (req, res) => {
  try {
    if (req.user.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo para administradores de red.' })
    }

    const redAsignada = req.user.redAsignada

    if (!redAsignada) {
      return res.status(400).json({ msg: 'El administrador no tiene una red comunitaria asignada' })
    }

    const articulos = await Articulo.find({ redComunitaria: redAsignada })
      .populate('autorId', 'nombre apellido email')
      .populate('redComunitaria', 'nombre')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      msg: articulos.length > 0
        ? 'Artículos encontrados'
        : 'No hay artículos en venta en tu red comunitaria',
      articulos
    })

  } catch (error) {
    console.error('Error al listar artículos para admin de red:', error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const eliminarArticuloAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const admin = req.user

    if (admin.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo administradores de red pueden eliminar artículos.' })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'ID de artículo no válido' })
    }

    const articulo = await Articulo.findById(id)
    if (!articulo) {
      return res.status(404).json({ msg: 'Artículo no encontrado' })
    }

    if (!articulo.redComunitaria.equals(admin.redAsignada)) {
      return res.status(403).json({ msg: 'No tienes permiso para eliminar artículos de esta red' })
    }

    await Articulo.findByIdAndDelete(id)

    return res.status(200).json({ msg: 'Artículo eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar artículo:', error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const obtenerInfoRed = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id

    const admin = await AdminRed.findById(adminId).populate('redAsignada')
    if (!admin) {
      return res.status(404).json({ msg: 'Administrador no encontrado' })
    }

    if (!admin.redAsignada) {
      return res.status(400).json({ msg: 'No tienes una red comunitaria asignada.' })
    }

    return res.status(200).json({
      msg: 'Red comunitaria asignada',
      red: admin.redAsignada
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error en el servidor' });
  }
}



const verEstudiantesDeRed = async (req, res) => {
  try {
    if (req.user.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo para administradores de red.' })
    }

    const redAsignada = req.user.redAsignada

    if (!redAsignada) {
      return res.status(400).json({ msg: 'No tienes una red comunitaria asignada.' })
    }

    const estudiantes = await Estudiante.find({ redComunitaria: redAsignada }).select('nombre apellido email')

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
    if (req.user.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo para administradores de red.' })
    }

    const redAsignadaId = req.user.redAsignada
    const { estudianteId } = req.params

    const estudiante = await Estudiante.findById(estudianteId)

    if (!estudiante) {
      return res.status(404).json({ msg: 'Estudiante no encontrado' })
    }

    if (
      !estudiante.redComunitaria ||
      !estudiante.redComunitaria.includes(redAsignadaId.toString())
    ) {
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
    if (req.user.rol !== 'Admin_Red') {
      return res.status(403).json({ msg: 'Acceso no autorizado. Solo los administradores de red pueden realizar esta acción.' })
    }

    const redId = req.user.redAsignada
    const { nombre, descripcion } = req.body

    if (!redId) {
      return res.status(400).json({ msg: 'No estás asignado a ninguna red comunitaria.' })
    }

    const red = await RedComunitaria.findById(redId)

    if (!red) {
      return res.status(404).json({ msg: 'Red comunitaria no encontrada.' })
    }

    let seActualizo = false

    if (nombre?.trim()) {
      red.nombre = nombre.trim()
      seActualizo = true
    }

    if (descripcion?.trim()) {
      red.descripcion = descripcion.trim()
      seActualizo = true
    }

    if (!seActualizo) {
      return res.status(400).json({ msg: 'Debe proporcionar al menos un campo válido para actualizar (nombre o descripción).' })
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
  loginAdminRed,
  perfilAdminRed,
  actualizarAvatarAdminRed,
  actualizarPerfilAdminRed,
  actualizarPasswordAdminRed,
  listarPublicaciones,
  listarArticulosPorRedAdmin,
  eliminarArticuloAdmin,
  eliminarPublicacionAdmin,
  obtenerInfoRed,
  verEstudiantesDeRed,
  eliminarEstudianteDeRed,
  actualizarRedComunitaria
}