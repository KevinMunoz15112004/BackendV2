import SuperAdmin from '../models/SuperAdmin.js'
import mongoose from 'mongoose'
import Estudiante from '../models/Estudiantes.js'
import RedComunitaria from '../models/RedComunitaria.js'
import { sendMailToRecoveryPassword } from "../config/nodemailer.js"
import { crearTokenJWT } from "../middlewares/authSuperAdmin.js"

//Controladores para la gestión de la cuenta
const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ msg: "Lo sentimos, debes llenar todos los campos" })
  }
  const superAdminBDD = await SuperAdmin.findOne({ email }).select("-__v -token -updatedAt -createdAt")
  if (!superAdminBDD) {
    return res.status(404).json({ msg: "Lo sentimos, el usuario no se encuentra registrado" })
  }
  if (superAdminBDD.confirmEmail === false) {
    return res.status(403).json({ msg: "Lo sentimos, debe verificar su cuenta" })
  }
  const verificarPassword = await superAdminBDD.matchPassword(password)
  if (!verificarPassword) {
    return res.status(401).json({ msg: "Lo sentimos, la contraseña no es la correcto" })
  }
  const { nombre, apellido, celular, _id, rol } = superAdminBDD
  const token = crearTokenJWT(superAdminBDD._id, superAdminBDD.rol)

  res.status(200).json({
    token,
    rol,
    nombre,
    apellido,
    celular,
    _id,
    email: superAdminBDD.email
  })
}

const recuperarPassword = async (req, res) => {
  const { email } = req.body
  if (Object.values(req.body).includes("")) {
    return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
  }

  const superAdminBDD = await SuperAdmin.findOne({ email })
  if (!superAdminBDD) {
    return res.status(404).json({ msg: "Lo sentimos, el usuario no se encuentra registrado" })
  }

  const token = superAdminBDD.crearToken()
  superAdminBDD.token = token

  await sendMailToRecoveryPassword(email, token)
  await superAdminBDD.save()

  res.status(200).json({ msg: "Revisa tu correo electrónico para reestablecer tu cuenta" })
}

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params

  if (!token) {
    return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
  }

  const superAdminBDD = await SuperAdmin.findOne({ token })
  if (!superAdminBDD || superAdminBDD.token !== token) {
    return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
  }

  res.status(200).json({ msg: "Token confirmado, ya puedes crear tu nueva contraseña" })
}

const crearNuevoPassword = async (req, res) => {
  const { password, confirmpassword } = req.body
  const { token } = req.params

  if (Object.values(req.body).includes("")) {
    return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
  }

  if (password !== confirmpassword) {
    return res.status(404).json({ msg: "Lo sentimos, los passwords no coinciden" })
  }

  const superAdminBDD = await SuperAdmin.findOne({ token })
  if (!superAdminBDD || superAdminBDD.token !== token) {
    return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
  }

  superAdminBDD.token = null
  superAdminBDD.password = await superAdminBDD.encrypPassword(password)

  await superAdminBDD.save()

  res.status(200).json({ msg: "Felicitaciones, ya puedes iniciar sesión con tu nueva contraseña" })
}

const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: `Lo sentimos, debe ser un id válido` });
  }

  const campos = ["nombre", "apellido", "direccion", "celular", "email"];
  const datos = {}

  for (const campo of campos) {
    if (req.body[campo] && req.body[campo].trim() !== "") {
      datos[campo] = req.body[campo]
    }
  }

  if (Object.keys(datos).length === 0) {
    return res.status(400).json({ msg: "Lo sentimos, debes llenar al menos un campo a actualizar" })
  }

  const superAdminBDD = await SuperAdmin.findById(id)
  if (!superAdminBDD) {
    return res.status(404).json({ msg: `Lo sentimos, no existe el usuario ${id}` })
  }

  if (datos.email && superAdminBDD.email !== datos.email) {
    const existeEmail = await SuperAdmin.findOne({ email: datos.email })
    if (existeEmail) {
      return res.status(400).json({ msg: `Lo sentimos, el email ya se encuentra registrado` })
    }
  }

  Object.assign(superAdminBDD, datos)
  await superAdminBDD.save();
  console.log(superAdminBDD)

  res.status(200).json({ msg: "Datos actualizados correctamente" })
}

const actualizarPassword = async (req, res) => {
  const superAdminBDD = await SuperAdmin.findById(req.user._id)
  if (!superAdminBDD) return res.status(404).json({ msg: `Lo sentimos, no existe el usario ${id}` })
  const verificarPassword = await superAdminBDD.matchPassword(req.body.passwordactual)
  if (!verificarPassword) return res.status(404).json({ msg: "Lo sentimos, la contraseña actual no es la correcta" })
  superAdminBDD.password = await superAdminBDD.encrypPassword(req.body.passwordnuevo)
  if (!req.body.passwordactual || !req.body.passwordnuevo) return res.status(404).json({ msg: "Debe completar todos los campos" })
  await superAdminBDD.save()
  res.status(200).json({ msg: "Password actualizado correctamente" })
}

const perfil = (req, res) => {
  delete req.user.token
  delete req.user.confirmEmail
  delete req.user.createdAt
  delete req.user.updatedAt
  delete req.user.__v
  res.status(200).json(req.user)
}

// Controladores para le gestión de estudiantes
const crearEstudiante = async (req, res) => {
  try {
    const { nombre, apellido, celular, email, password, rol, redComunitaria } = req.body

    const existe = await Estudiante.findOne({ email })
    if (existe) {
      return res.status(400).json({ msg: 'El email ya está registrado' })
    }

    const nuevoEstudiante = new Estudiante({
      nombre,
      apellido,
      celular,
      email,
      rol,
      redComunitaria
    })

    nuevoEstudiante.password = await nuevoEstudiante.encrypPassword(password)
    nuevoEstudiante.crearToken()

    await nuevoEstudiante.save()

    res.status(201).json({
      mensaje: 'Estudiante creado exitosamente',
      estudiante: {
        id: nuevoEstudiante._id,
        nombre: nuevoEstudiante.nombre,
        apellido: nuevoEstudiante.apellido,
        email: nuevoEstudiante.email,
        rol: nuevoEstudiante.rol,
        redComunitaria: nuevoEstudiante.redComunitaria
      }
    });
  } catch (error) {
    res.status(400).json({ msg: "Debe llenar los campos obligatorios" })
  }
}

const obtenerEstudiantes = async (req, res) => {
  const estudiantes = await Estudiante.find()
  res.json(estudiantes);
}

const obtenerEstudiantePorId = async (req, res) => {
  const id = req.params.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'ID no válido' })
  }

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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: "ID no válido" });
  }

  try {
    const estudiante = await Estudiante.findById(id);
    if (!estudiante) {
      return res.status(404).json({ msg: 'Estudiante no encontrado' });
    }

    const camposActualizados = {};
    for (const key in req.body) {
      if (req.body[key] && req.body[key].trim() !== "") {
        camposActualizados[key] = req.body[key];
      }
    }

    if (Object.keys(camposActualizados).length === 0) {
      return res.status(400).json({ msg: "Debes llenar al menos un campo a actualizar" })
    }

    if (camposActualizados.password) {
      camposActualizados.password = await estudiante.encrypPassword(camposActualizados.password)
    }

    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      id,
      camposActualizados,
      { new: true }
    )

    res.json({ msg: "Datos actualizados correctamente", estudiante: estudianteActualizado })
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const eliminarEstudiante = async (req, res) => {
  const id = req.params.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: "ID no válido" })
  }

  try {
    const estudianteEliminado = await Estudiante.findByIdAndDelete(id)

    if (!estudianteEliminado) {
      return res.status(404).json({ msg: 'Estudiante no encontrado' })
    }

    res.json({ msg: 'Estudiante eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

//Controladores para la gestión de redes comunitarias
const crearRed = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    const existente = await RedComunitaria.findOne({ nombre });
    if (existente) {
      return res.status(400).json({ mensaje: 'Ya existe una red con ese nombre' })
    }

    const estudiantes = await Estudiante.find({ redComunitaria: nombre })

    const red = new RedComunitaria({
      nombre,
      descripcion,
      miembros: estudiantes.map(e => e._id),
      cantidadMiembros: estudiantes.length
    })

    await red.save();

    res.status(201).json({ msg: 'Red comunitaria creada correctamente', red })
  } catch (error) {
    res.status(400).json({ msg: "Debe llenar los campos obligatorios" })
  }
}

const obtenerRedes = async (req, res) => {
  const redes = await RedComunitaria.find().populate('miembros', 'nombre apellido email')
  res.json(redes);
}

const obtenerRedPorId = async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'ID no válido' });
  }

  try {
    const red = await RedComunitaria.findById(id).populate('miembros', 'nombre apellido email');

    if (!red) {
      return res.status(404).json({ msg: 'Red no encontrada' });
    }

    res.json(red);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

const actualizarRed = async (req, res) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: "ID no válido" })
  }

  try {
    const redExistente = await RedComunitaria.findById(id)
    if (!redExistente) {
      return res.status(404).json({ msg: "Red no encontrada" })
    }

    const { nombre, descripcion } = req.body

    if (!nombre && !descripcion) {
      return res.status(400).json({ msg: "Lo sentimos, debes llenar al menos un campo a actualizar" });
    }

    const camposActualizados = {};

    if (nombre) {

      const nombreExistente = await RedComunitaria.findOne({ nombre, _id: { $ne: id } })
      if (nombreExistente) {
        return res.status(400).json({ msg: "Ya existe una red con ese nombre" })
      }

      camposActualizados.nombre = nombre

      const estudiantes = await Estudiante.find({ redComunitaria: nombre })
      camposActualizados.miembros = estudiantes.map(e => e._id)
      camposActualizados.cantidadMiembros = estudiantes.length
    }

    if (descripcion) {
      camposActualizados.descripcion = descripcion
    }

    const redActualizada = await RedComunitaria.findByIdAndUpdate(
      id,
      camposActualizados,
      { new: true }
    )

    res.json(redActualizada)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const eliminarRed = async (req, res) => {
  const id = req.params.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'ID no válido' })
  }

  try {
    const redEliminada = await RedComunitaria.findByIdAndDelete(id)

    if (!redEliminada) {
      return res.status(404).json({ msg: 'Red no encontrada' })
    }

    res.json({ mensaje: 'Red eliminada correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: error.message })
  }
}

export {
  login,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  perfil,
  actualizarPerfil,
  actualizarPassword,
  crearEstudiante,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  eliminarEstudiante,
  crearRed,
  obtenerRedes,
  obtenerRedPorId,
  actualizarRed,
  eliminarRed
}
