import Apelacion from '../models/Apelacion.js'
import Estudiante from '../models/Estudiantes.js'
import RedComunitaria from '../models/RedComunitaria.js'
import AdminRed from '../models/adminRedes.js'
import { sendMailApelacionAprobada, sendMailApelacionRechazada } from '../config/nodemailer.js'

const crearApelacion = async (req, res) => {
  const { nombre, correo, motivo } = req.body

  try {
    const estudiante = await Estudiante.findOne({ email: correo })
    if (!estudiante) {
      return res.status(404).json({ msg: 'No encontramos una cuenta con ese correo.' })
    }

    if (!estudiante.suspendido) {
      return res.status(400).json({ msg: 'Esta cuenta no está suspendida.' })
    }

    const apelacionPendiente = await Apelacion.findOne({ estudianteId: estudiante._id, estado: 'pendiente' })
    if (apelacionPendiente) {
      return res.status(409).json({ msg: 'Ya tienes una apelación pendiente de revisión.' })
    }

    const nuevaApelacion = new Apelacion({ tipo: 'usuario', estudianteId: estudiante._id, nombre, correo, motivo })
    await nuevaApelacion.save()

    res.status(201).json({ msg: 'Apelación enviada', apelacion: nuevaApelacion })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Hubo un error al crear la apelación' })
  }
}

// Endpoint para Admin de Red: POST /apelaciones/red
const crearApelacionRed = async (req, res) => {
  try {
    const solicitanteId = req.user?._id
    const { redId, descripcion } = req.body

    const red = await RedComunitaria.findById(redId)
    if (!red) return res.status(404).json({ msg: 'Red no encontrada' })

    const adminRelation = await AdminRed.findOne({ usuarioId: solicitanteId, redId: redId, estado: 'activo' })
    const esCreador = red.administrador && red.administrador.equals(solicitanteId)

    if (!adminRelation && !esCreador) return res.status(403).json({ msg: 'Solo el admin asignado de la red puede apelar' })
    if (!red.deshabilitada) return res.status(400).json({ msg: 'La red no está deshabilitada' })

    const apelacionPendiente = await Apelacion.findOne({ tipo: 'red', redId: redId, estado: 'pendiente' })
    if (apelacionPendiente) return res.status(409).json({ msg: 'Ya existe una apelación pendiente para esta red' })

    const nuevaApelacion = new Apelacion({
      tipo: 'red',
      estudianteId: solicitanteId,
      redId: redId,
      motivo: descripcion.trim()
    })
    await nuevaApelacion.save()

    res.status(201).json({ msg: 'Apelación de red enviada', apelacion: nuevaApelacion })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Hubo un error al crear la apelación de la red' })
  }
}

// Endpoints SuperAdmin
const getApelaciones = async (req, res) => {
  try {
    const apelaciones = await Apelacion.find()
      .populate('estudianteId', 'nombre apellido username correo suspendido')
      .sort({ fechaCreacion: -1 })
    res.json(apelaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Hubo un error al obtener las apelaciones' })
  }
}

const getApelacionById = async (req, res) => {
  const { id } = req.params
  try {
    const apelacion = await Apelacion.findById(id).populate('estudianteId', 'nombre apellido username correo suspendido')
    if (!apelacion) {
      return res.status(404).json({ msg: 'Apelación no encontrada' })
    }
    res.json(apelacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Hubo un error al obtener la apelación' })
  }
}

const resolverApelacion = async (req, res) => {
  const { id } = req.params
  const { estado, notaResolucion } = req.body

  try {
    const apelacion = await Apelacion.findById(id).populate('estudianteId')
    if (!apelacion) {
      return res.status(404).json({ msg: 'Apelación no encontrada' })
    }

    if (apelacion.estado !== 'pendiente') {
      return res.status(400).json({ msg: 'La apelación ya fue resuelta' })
    }

    apelacion.estado = estado
    apelacion.notaResolucion = notaResolucion
    apelacion.fechaResolucion = Date.now()
    apelacion.resolvedBy = req.user._id // ID del superadmin

    if (apelacion.tipo === 'red') {
      if (estado === 'aprobada') {
        const red = await RedComunitaria.findById(apelacion.redId)
        if (red) {
          red.deshabilitada = false
          red.strikes = []
          await red.save()
        }
      }
    } else {
      const estudiante = apelacion.estudianteId
      if (estado === 'aprobada') {
        estudiante.suspendido = false
        estudiante.strikes = []
        await estudiante.save()
        
        await sendMailApelacionAprobada(estudiante.correo, notaResolucion)
      } else if (estado === 'rechazada') {
        await sendMailApelacionRechazada(estudiante.correo, notaResolucion)
      }
    }

    await apelacion.save()

    res.json({ msg: 'Apelación resuelta', apelacion })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Hubo un error al resolver la apelación' })
  }
}

export { crearApelacion, crearApelacionRed, getApelaciones, getApelacionById, resolverApelacion }
