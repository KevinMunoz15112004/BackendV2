import SuperAdmin from '../models/SuperAdmin.js'
import mongoose from 'mongoose'
import Estudiante from '../models/Estudiantes.js'
import RedComunitaria from '../models/RedComunitaria.js'
import Publicacion from '../models/Publicaciones.js'
import Comentario from '../models/Comentarios.js'
import ReporteUnificado from '../models/Reportes.js'
import { mapEstadoFromBody, populateReporte } from '../helpers/reportHelpers.js'
import { Articulo } from '../models/Articulos.js'
import { isGlobalRed } from '../helpers/globalRed.js'
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs-extra"
import profileService from '../services/profileService.js'
import AdminRed from '../models/adminRedes.js'
import { sendMailToRecoveryPassword, sendMailToRegister, enviarCorreoNuevoAdmin } from "../config/nodemailer.js"
import jwt from 'jsonwebtoken'

//Controladores para la gestión de la cuenta
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const superAdminBDD = await SuperAdmin.findOne({ email })
      .select("-__v -token -updatedAt -createdAt")

    if (!superAdminBDD) {
      return res.status(404).json({ msg: "Lo sentimos, el usuario no se encuentra registrado" })
    }

    if (superAdminBDD.confirmEmail === false) {
      return res.status(403).json({ msg: "Lo sentimos, debe verificar su cuenta" })
    }

    const verificarPassword = await superAdminBDD.matchPassword(password)
    if (!verificarPassword) {
      return res.status(401).json({ msg: "Lo sentimos, la contraseña no es correcta" })
    }

    const { nombre, apellido, _id, rol } = superAdminBDD
    const crearTokenJWT = (id, rol) => jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: '2h' })
    const token = crearTokenJWT(superAdminBDD._id, superAdminBDD.rol)

    res.status(200).json({
      token,
      rol,
      nombre,
      apellido,
      _id,
      email: superAdminBDD.email
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: "Error en el servidor" })
  }
}

const recuperarPassword = async (req, res) => {
  // Request format validation moved to centralized validators (routes)

  try {
    const { email } = req.body;

    const superAdminBDD = await SuperAdmin.findOne({ email })
    if (!superAdminBDD) {
      return res.status(404).json({ msg: "Lo sentimos, el usuario no se encuentra registrado" })
    }

    const token = superAdminBDD.crearToken()
    superAdminBDD.token = token

    await sendMailToRecoveryPassword(email, token)
    await superAdminBDD.save()

    res.status(200).json({ msg: "Revisa tu correo electrónico para reestablecer tu cuenta" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: "Error en el servidor" })
  }
}

const comprobarTokenPassword = async (req, res) => {
  try {
    const { token } = req.params

    const superAdminBDD = await SuperAdmin.findOne({ token })
    if (!superAdminBDD || superAdminBDD.token !== token) {
      return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
    }

    res.status(200).json({ msg: "Token confirmado, ya puedes crear tu nueva contraseña" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: "Error en el servidor" })
  }
}

const crearNuevoPassword = async (req, res) => {
  try {
    const { password, confirmpassword } = req.body
    const { token } = req.params

    const superAdminBDD = await SuperAdmin.findOne({ token })
    if (!superAdminBDD || superAdminBDD.token !== token) {
      return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
    }

    superAdminBDD.token = null
    superAdminBDD.password = await superAdminBDD.encrypPassword(password)

    await superAdminBDD.save()

    res.status(200).json({ msg: "Felicitaciones, ya puedes iniciar sesión con tu nueva contraseña" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: "Error en el servidor" })
  }
}

const actualizarPerfil = async (req, res) => {
  try {
    const id = req.user._id;

    const campos = ["nombre", "apellido", "direccion", "email"]
    const datos = {};

    for (const campo of campos) {
      if (req.body[campo] && req.body[campo].trim() !== "") {
        datos[campo] = req.body[campo];
      }
    }

    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ msg: "Lo sentimos, debes llenar al menos un campo a actualizar" })
    }

    const superAdminBDD = await SuperAdmin.findById(id);
    if (!superAdminBDD) {
      return res.status(404).json({ msg: `Lo sentimos, no existe el usuario` })
    }

    if (datos.email && superAdminBDD.email !== datos.email) {
      const existeEmail = await SuperAdmin.findOne({ email: datos.email })
      if (existeEmail) {
        return res.status(400).json({ msg: `Lo sentimos, el email ya se encuentra registrado` })
      }
    }

    Object.assign(superAdminBDD, datos)
    await superAdminBDD.save()

    res.status(200).json({ msg: "Datos actualizados correctamente" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: "Error en el servidor" })
  }
}

const actualizarAvatar = async (req, res) => {
  const id = req.user._id;

  const superAdminBDD = await SuperAdmin.findById(id);
  if (!superAdminBDD) {
    return res.status(404).json({ msg: 'Usuario no encontrado' });
  }

  try {
    const url = await profileService.handleProfileImage({ req, bodyField: 'avatar', filesField: 'imagen', folder: 'avatares', publicIdPrefix: id, required: true })
    superAdminBDD.avatar = url
    await superAdminBDD.save();
    res.status(200).json({ msg: 'Avatar actualizado correctamente', avatar: superAdminBDD.avatar })
  } catch (err) {
    if (err && err.type === 'VALIDATION') return res.status(400).json({ msg: err.message, code: err.code })
    if (err && err.type === 'UPLOAD_ERROR') return res.status(500).json({ msg: err.message, code: err.code })
    console.error(err)
    res.status(500).json({ msg: 'Error al subir imagen' })
  }
}

const actualizarPassword = async (req, res) => {
  try {
    const id = req.user._id
    const { passwordactual, passwordnuevo } = req.body

    if (!passwordactual || !passwordnuevo) return res.status(400).json({ msg: "Completa los campos necesarios" })

    const superAdminBDD = await SuperAdmin.findById(id);
    if (!superAdminBDD) return res.status(404).json({ msg: "Lo sentimos, no existe el usuario" })

    const verificarPassword = await superAdminBDD.matchPassword(passwordactual);
    if (!verificarPassword) return res.status(400).json({ msg: "La contraseña actual no es la correcta" })

    superAdminBDD.password = await superAdminBDD.encrypPassword(passwordnuevo)
    await superAdminBDD.save();

    res.status(200).json({ msg: "Contraseña actualizada correctamente" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: "Error en el servidor" })
  }
}

const perfil = (req, res) => {
  delete req.user.token
  delete req.user.confirmEmail
  delete req.user.createdAt
  delete req.user.updatedAt
  delete req.user.__v
  res.status(200).json(req.user)
}

const obtenerEstudiantes = async (req, res) => {
  try {
    const estudiantes = await Estudiante.find()
      .populate('redComunitaria', 'nombre')

    res.json(estudiantes);
  } catch (error) {
    console.error('Error al obtener estudiantes:', error)
    res.status(500).json({ msg: 'Error al obtener estudiantes' })
  }
}

const obtenerEstudiantePorId = async (req, res) => {
  const id = req.params.id
  // ID validado por validators en rutas

  try {
    const estudiante = await Estudiante.findById(id)

    if (!estudiante) {
      return res.status(404).json({ msg: 'Estudiante no encontrado' })
    }

    res.json(estudiante)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const actualizarEstudiante = async (req, res) => {
  const id = req.params.id;

  try {
    const estudiante = await Estudiante.findById(id);
    if (!estudiante) {
      return res.status(404).json({ msg: 'Estudiante no encontrado' });
    }

    const camposActualizados = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (value && value.toString().trim() !== '') {
        camposActualizados[key] = value;
      }
    }

    // Determinar si se solicita promover a Admin_Red
    const nuevoRolSolicitado = req.body.rol || (req.body.roles && (Array.isArray(req.body.roles) ? req.body.roles[0] : req.body.roles))
    const cambiandoARolAdmin = !estudiante.roles.includes('admin_red') && (nuevoRolSolicitado === 'Admin_Red' || (Array.isArray(req.body.roles) && req.body.roles.includes('admin_red')))

    // Solo si el estudiante sigue como Estudiante, puede actualizar redComunitaria
    if (req.body.redComunitaria && !cambiandoARolAdmin) {
      const nuevaRedId = req.body.redComunitaria;

      const redNueva = await RedComunitaria.findById(nuevaRedId);
      if (!redNueva) {
        return res.status(404).json({ msg: 'La nueva red comunitaria no existe' });
      }

      for (const redIdActual of estudiante.redComunitaria) {
        const redAnterior = await RedComunitaria.findById(redIdActual);
        if (redAnterior) {
          redAnterior.miembros = redAnterior.miembros.filter(id => !id.equals(estudiante._id));
          redAnterior.cantidadMiembros = redAnterior.miembros.length;
          await redAnterior.save();
        }
      }

      if (!redNueva.miembros.includes(estudiante._id)) {
        redNueva.miembros.push(estudiante._id);
        redNueva.cantidadMiembros = redNueva.miembros.length;
        await redNueva.save();
      }

      camposActualizados.redComunitaria = nuevaRedId;
    }

    if (Object.keys(camposActualizados).length === 0) {
      return res.status(400).json({ msg: 'Debes llenar al menos un campo a actualizar' });
    }

    // Determinar el rol objetivo: soporta legacy `rol` y nuevo `roles`
    let nuevoRol
    if (camposActualizados.rol) {
      nuevoRol = camposActualizados.rol
    } else if (Array.isArray(camposActualizados.roles)) {
      nuevoRol = camposActualizados.roles.includes('admin_red') ? 'Admin_Red' : 'Estudiante'
    } else {
      nuevoRol = estudiante.roles.includes('admin_red') ? 'Admin_Red' : 'Estudiante'
    }

    if (!['Estudiante', 'Admin_Red'].includes(nuevoRol)) {
      return res.status(400).json({ msg: 'Rol inválido. Solo se permite "Estudiante" o "Admin_Red"' });
    }

    // Convertir a Admin_Red
    if (!estudiante.roles.includes('admin_red') && (nuevoRol === 'Admin_Red' || (Array.isArray(req.body.roles) && req.body.roles.includes('admin_red')))) {
      const redComunitaria = req.body.redComunitaria;

      if (!redComunitaria) {
        return res.status(400).json({ msg: 'Debes especificar la red comunitaria para el nuevo Admin_Red' });
      }

      const red = await RedComunitaria.findById(redComunitaria);
      if (!red) {
        return res.status(404).json({ msg: 'La red comunitaria especificada no existe' });
      }

      if (!red.miembros.includes(estudiante._id)) {
        red.miembros.push(estudiante._id);
        red.cantidadMiembros = red.miembros.length;
        await red.save();
      }

      const nuevoEmail = estudiante.email;

      // Crear relación AdminRed (permiso sobre la red) y añadir rol al estudiante
      const existingRelation = await AdminRed.findOne({ usuarioId: estudiante._id, redId: redComunitaria })
      if (existingRelation) {
        return res.status(400).json({ msg: 'Ya existe una relación de admin para ese usuario y red' })
      }

      const rel = new AdminRed({ usuarioId: estudiante._id, redId: redComunitaria, estado: 'activo', fechaAprobacion: new Date() })
      await rel.save()

      // Añadir rol admin_red al estudiante
      await estudiante.addRole('admin_red')

      await enviarCorreoNuevoAdmin(estudiante.email, nuevoEmail);

      delete camposActualizados.redComunitaria;
    }

    // Convertir a Estudiante
    if (estudiante.roles.includes('admin_red') && (nuevoRol === 'Estudiante' || (Array.isArray(req.body.roles) && !req.body.roles.includes('admin_red')))) {
      // Revocar rol admin_red y eliminar relaciones activas
      await AdminRed.updateMany({ usuarioId: estudiante._id, estado: { $in: ['activo', 'pendiente'] } }, { $set: { estado: 'revocado' } })
      await estudiante.removeRole('admin_red')

      if (estudiante.redComunitaria) {
        // limpiar miembros de redes si corresponde
        for (const redId of estudiante.redComunitaria) {
          const red = await RedComunitaria.findById(redId)
          if (red && red.miembros.includes(estudiante._id)) {
            red.miembros = red.miembros.filter(idMiembro => !idMiembro.equals(estudiante._id))
            red.cantidadMiembros = red.miembros.length
            await red.save()
          }
        }

        if (!camposActualizados.redComunitaria) camposActualizados.redComunitaria = []
      }
    }

    // Encriptar nueva contraseña si se envía
    if (camposActualizados.password) {
      camposActualizados.password = await estudiante.encrypPassword(camposActualizados.password);
    }

    // Eliminar el campo rol legacy para evitar modificarlo directamente en Estudiante
    if (camposActualizados.rol) delete camposActualizados.rol;

    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      id,
      camposActualizados,
      { new: true }
    );

    res.json({ msg: 'Datos actualizados correctamente', estudiante: estudianteActualizado });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Controladores para la gestión de redes comunitarias
const obtenerRedes = async (req, res) => {
  try {
    const redes = await RedComunitaria.find()
      .select('nombre descripcion proposito fotoPerfil cantidadMiembros esVerificada esOficial esGlobal deshabilitada estadoAprobacion createdAt')
      .lean()
    return res.status(200).json({ redes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const obtenerRedPorId = async (req, res) => {
  const { id } = req.params
  try {
    const red = await RedComunitaria.findById(id)
      .select('nombre descripcion proposito fotoPerfil cantidadMiembros esVerificada esOficial esGlobal deshabilitada estadoAprobacion createdAt')
      .lean()

    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    return res.status(200).json({ red })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const eliminarRed = async (req, res) => {
  const id = req.params.id
  try {
    const red = await RedComunitaria.findById(id)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    if (await isGlobalRed(red._id)) return res.status(400).json({ msg: 'La red global no puede eliminarse' })

    const adminActivo = await AdminRed.findOne({ redId: red._id, estado: 'activo' })
    if (adminActivo) return res.status(400).json({ msg: 'La red tiene un administrador activo' })

    if (red.miembros.length > 0) return res.status(400).json({
      msg: `La red aún tiene ${red.miembros.length} miembro(s). No puede eliminarse.`
    })

    if (!red.deshabilitada) return res.status(400).json({
      msg: 'La red debe estar deshabilitada antes de poder eliminarse'
    })

    const diasDesdeActualizacion = (Date.now() - new Date(red.updatedAt)) / (1000 * 60 * 60 * 24)
    if (diasDesdeActualizacion < 90) return res.status(400).json({
      msg: `La red debe permanecer inactiva al menos 90 días. Lleva ${Math.floor(diasDesdeActualizacion)} días.`
    })

    // Cascada publicaciones
    const publicaciones = await Publicacion.find({ comunidadId: id }).select('_id').lean()
    const postIds = (publicaciones || []).map(p => p._id).filter(Boolean)

    if (postIds.length > 0) {
      await Comentario.deleteMany({ postId: { $in: postIds } })
      await Estudiante.updateMany(
        { publicacionesGuardadas: { $in: postIds } },
        { $pull: { publicacionesGuardadas: { $in: postIds } } }
      )
      await Publicacion.deleteMany({ _id: { $in: postIds } })
    }

    // Cascada artículos
    const articulos = await Articulo.find({ redComunitaria: id }).select('_id').lean()
    const articuloIds = (articulos || []).map(a => a._id).filter(Boolean)
    if (articuloIds.length > 0) {
      await Comentario.deleteMany({ postId: { $in: articuloIds } })
      await Articulo.deleteMany({ _id: { $in: articuloIds } })
    }

    // Cascada reportes y solicitudes
    await ReporteUnificado.deleteMany({ 'meta.redId': red._id })
    await SolicitudUnificada.deleteMany({ 'meta.redId': red._id })

    // Reportes de publicaciones de la red
    if (postIds.length > 0) {
      await ReporteUnificado.deleteMany({ 'meta.publicacionId': { $in: postIds } })
    }

    // Limpiar estudiantes
    await Estudiante.updateMany(
      { redComunitaria: id },
      { $pull: { redComunitaria: id } }
    )

    await RedComunitaria.findByIdAndDelete(id)
    return res.status(200).json({ msg: 'Red eliminada correctamente' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

const resolverReporteRedGlobalSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, respuesta } = req.body

    const mapped = mapEstadoFromBody(estado)

    const redGlobal = await RedComunitaria.findOne({ esGlobal: true })
    if (!redGlobal) return res.status(404).json({ msg: 'Red global no encontrada' })

    const reporte = await ReporteUnificado.findById(id)
    if (!reporte || !['publicacion', 'articulo'].includes(reporte.subtype))
      return res.status(404).json({ msg: 'Reporte no encontrado' })

    if (String(reporte.meta.redId) !== String(redGlobal._id))
      return res.status(403).json({ msg: 'Este reporte no pertenece a la red global' })

    if (reporte.estado === 'resuelto')
      return res.status(400).json({ msg: 'El reporte ya fue resuelto' })

    reporte.estado = mapped
    if (respuesta) reporte.respuesta = respuesta
    await reporte.save()

    if (mapped === 'rechazado') {
      const reportePop = await populateReporte(reporte._id, reporte.subtype)
      return res.status(200).json({ msg: 'Reporte rechazado', reporte: reportePop })
    }

    // Resuelto: eliminar contenido según subtype
    if (reporte.subtype === 'publicacion') {
      const publicacion = await Publicacion.findById(reporte.meta.publicacionId)
      if (!publicacion) {
        const reportePop = await populateReporte(reporte._id, reporte.subtype)
        return res.status(200).json({ msg: 'Reporte resuelto. La publicación no existe (posible eliminación previa)', reporte: reportePop })
      }

      await Comentario.deleteMany({ postId: publicacion._id })
      await Estudiante.updateMany(
        { publicacionesGuardadas: publicacion._id },
        { $pull: { publicacionesGuardadas: publicacion._id } }
      )
      await Publicacion.findByIdAndDelete(publicacion._id)
    }

    if (reporte.subtype === 'articulo') {
      const articulo = await Articulo.findById(reporte.meta.articuloId)
      if (!articulo) {
        const reportePop = await populateReporte(reporte._id, reporte.subtype)
        return res.status(200).json({ msg: 'Reporte resuelto. El artículo no existe (posible eliminación previa)', reporte: reportePop })
      }

      await Comentario.deleteMany({ postId: articulo._id })
      await Estudiante.updateMany(
        { publicacionesGuardadas: articulo._id },
        { $pull: { publicacionesGuardadas: articulo._id } }
      )
      await Articulo.findByIdAndDelete(articulo._id)
    }

    const reportePop = await populateReporte(reporte._id, reporte.subtype)
    return res.status(200).json({ msg: 'Reporte resuelto y contenido eliminado', reporte: reportePop })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ msg: 'Error en el servidor' })
  }
}

export {
  login,
  recuperarPassword,
  comprobarTokenPassword,
  crearNuevoPassword,
  perfil,
  actualizarPerfil,
  actualizarAvatar,
  actualizarPassword,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  obtenerRedes,
  obtenerRedPorId,
  eliminarRed,
  resolverReporteRedGlobalSuperAdmin
}
