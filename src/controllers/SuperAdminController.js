import SuperAdmin from '../models/SuperAdmin.js'
import mongoose from 'mongoose'
import Estudiante from '../models/Estudiantes.js'
import RedComunitaria from '../models/RedComunitaria.js'
import cloudinary from 'cloudinary'
import fs from "fs-extra"
import AdminRed from '../models/adminRedes.js'
import { sendMailToRecoveryPassword, sendMailToRegister, enviarCorreoNuevoAdmin } from "../config/nodemailer.js"
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
  const id = req.user._id;

  const campos = ["nombre", "apellido", "direccion", "celular", "email"]
  const datos = {};

  for (const campo of campos) {
    if (req.body[campo] && req.body[campo].trim() !== "") {
      datos[campo] = req.body[campo];
    }
  }

  if (Object.keys(datos).length === 0) {
    return res.status(400).json({ msg: "Lo sentimos, debes llenar al menos un campo a actualizar" })
  }

  const regexSoloLetras = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/

  if (datos.nombre && !regexSoloLetras.test(datos.nombre)) {
    return res.status(400).json({ msg: "El nombre no debe contener números ni caracteres especiales" });
  }

  if (datos.apellido && !regexSoloLetras.test(datos.apellido)) {
    return res.status(400).json({ msg: "El apellido no debe contener números ni caracteres especiales" });
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
}

const actualizarAvatar = async (req, res) => {
  const id = req.user._id;

  if (!req.files || !req.files.imagen) {
    return res.status(400).json({ msg: 'Debes subir una imagen' });
  }

  const file = req.files.imagen;

  const superAdminBDD = await SuperAdmin.findById(id);
  if (!superAdminBDD) {
    return res.status(404).json({ msg: 'Usuario no encontrado' });
  }

  try {
    const resultado = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'avatares',
      public_id: `${id}_avatar`,
      overwrite: true,
    });

    await fs.unlink(file.tempFilePath)

    superAdminBDD.avatar = resultado.secure_url
    await superAdminBDD.save();

    res.status(200).json({
      msg: 'Avatar actualizado correctamente',
      avatar: superAdminBDD.avatar,
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Error al subir imagen', error: error.message })
  }
}

const actualizarPassword = async (req, res) => {
  const id = req.user._id

  if (!req.body.passwordactual || !req.body.passwordnuevo) {
    return res.status(400).json({ msg: "Debe completar todos los campos" })
  }

  const superAdminBDD = await SuperAdmin.findById(id);
  if (!superAdminBDD) return res.status(404).json({ msg: "Lo sentimos, no existe el usuario" })

  const verificarPassword = await superAdminBDD.matchPassword(req.body.passwordactual);
  if (!verificarPassword) return res.status(400).json({ msg: "La contraseña actual no es la correcta" })

  superAdminBDD.password = await superAdminBDD.encrypPassword(req.body.passwordnuevo)
  await superAdminBDD.save();

  res.status(200).json({ msg: "Password actualizado correctamente" })
};

const perfil = (req, res) => {
  delete req.user.token
  delete req.user.confirmEmail
  delete req.user.createdAt
  delete req.user.updatedAt
  delete req.user.__v
  res.status(200).json(req.user)
}

const crearEstudiante = async (req, res) => {
  try {
    const { nombre, apellido, celular, email, password, rol, redComunitaria } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ msg: "Todos los campos obligatorios deben estar llenos" });
    }

    const regexSoloLetras = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/

    if (!regexSoloLetras.test(nombre.trim())) {
      return res.status(400).json({ msg: "El nombre no debe contener números ni caracteres especiales" })
    }

    if (!regexSoloLetras.test(apellido.trim())) {
      return res.status(400).json({ msg: "El apellido no debe contener números ni caracteres especiales" })
    }

    const regexCelular = /^\d{10}$/
    
    if (celular && !regexCelular.test(celular)) {
      return res.status(400).json({ msg: "El número celular debe contener exactamente 10 dígitos y sin letras ni símbolos" });
    }

    const existe = await Estudiante.findOne({ email });
    if (existe) {
      return res.status(400).json({ msg: 'El email ya está registrado' });
    }

    const redesArray = Array.isArray(redComunitaria) ? redComunitaria : [];

    const nuevoEstudiante = new Estudiante({
      nombre,
      apellido,
      celular,
      email,
      rol,
      redComunitaria: redesArray
    });

    nuevoEstudiante.password = await nuevoEstudiante.encrypPassword(password);
    const token = nuevoEstudiante.crearToken();

    await nuevoEstudiante.save();

    for (const redId of redesArray) {
      const red = await RedComunitaria.findById(redId);
      if (!red) {
        return res.status(400).json({ msg: `La red comunitaria con id ${redId} no existe` });
      }
      if (!red.miembros.includes(nuevoEstudiante._id)) {
        red.miembros.push(nuevoEstudiante._id);
        red.cantidadMiembros = red.miembros.length;
        await red.save()
      }
    }

    await sendMailToRegister(email, token);

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
    console.error("Error crearEstudiante:", error);
    res.status(500).json({ msg: error.message });
  }
};

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
    return res.status(400).json({ msg: 'ID no válido' });
  }

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

    const cambiandoARolAdmin = estudiante.rol === 'Estudiante' && req.body.rol === 'Admin_Red';

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

    const nuevoRol = camposActualizados.rol || estudiante.rol;

    if (!['Estudiante', 'Admin_Red'].includes(nuevoRol)) {
      return res.status(400).json({ msg: 'Rol inválido. Solo se permite "Estudiante" o "Admin_Red"' });
    }

    // Convertir a Admin_Red
    if (estudiante.rol === 'Estudiante' && nuevoRol === 'Admin_Red') {
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

      const nuevoEmail = `AR${estudiante.email}`;

      const adminExistente = await AdminRed.findOne({ email: nuevoEmail });
      if (adminExistente) {
        return res.status(400).json({ msg: 'Ya existe un Admin_Red con ese correo' });
      }

      const nuevoAdmin = new AdminRed({
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        email: nuevoEmail,
        confirmEmail: true,
        password: estudiante.password,
        rol: 'Admin_Red',
        redAsignada: redComunitaria,
      });

      await nuevoAdmin.save();

      await enviarCorreoNuevoAdmin(estudiante.email, nuevoEmail);

      delete camposActualizados.redComunitaria;
    }

    // Convertir a Estudiante
    if (estudiante.rol === 'Admin_Red' && nuevoRol === 'Estudiante') {
      await AdminRed.findOneAndDelete({ _id: estudiante._id });

      if (estudiante.redComunitaria) {
        const red = await RedComunitaria.findOne({ nombre: estudiante.redComunitaria });
        if (red && red.miembros.includes(estudiante._id)) {
          red.miembros = red.miembros.filter(idMiembro => !idMiembro.equals(estudiante._id));
          red.cantidadMiembros = red.miembros.length;
          await red.save();
        }

        if (!camposActualizados.redComunitaria) {
          camposActualizados.redComunitaria = [];
        }
      }
    }

    // Encriptar nueva contraseña si se envía
    if (camposActualizados.password) {
      camposActualizados.password = await estudiante.encrypPassword(camposActualizados.password);
    }

    // Eliminar el campo rol para evitar modificarlo directamente en Estudiante
    delete camposActualizados.rol;

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

    const red = new RedComunitaria({
      nombre,
      descripcion,
      miembros: [],
      cantidadMiembros: 0
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
  actualizarAvatar,
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
