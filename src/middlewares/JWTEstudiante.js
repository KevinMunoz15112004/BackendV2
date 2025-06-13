import Estudiante from "../models/Estudiantes.js"
import jwt from "jsonwebtoken"

const crearTokenJWT = (id, rol) => {

    return jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

const verificarTokenEstudiante = async (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ msg: "Token no proporcionado" })

  try {
    const token = auth.split(" ")[1]
    const { id, rol } = jwt.verify(token, process.env.JWT_SECRET)

    if (rol !== "Estudiante") {
      return res.status(403).json({ msg: "Acceso denegado: no autorizado" })
    }

    req.estudianteBDD = await Estudiante.findById(id).select("-password")
    next()
  } catch (error) {
    return res.status(401).json({ msg: "Token inválido o expirado" })
  }
}

export {
    crearTokenJWT,
    verificarTokenEstudiante
}
