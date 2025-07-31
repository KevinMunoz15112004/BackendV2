import jwt from 'jsonwebtoken'
import AdminRed from '../models/adminRedes.js'

export const crearTokenJWT = (id, rol) => {
  return jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

export function isAdminRed(req, res, next) {
  if (req.user && req.user.rol === 'Admin_Red') {
    return next()
  }
  return res.status(403).json({ msg: 'Acceso denegado. Solo para administradores de red.' })
}

export async function autenticarTokenAdminRed(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No autorizado, token faltante' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const admin = await AdminRed.findById(payload.id).lean().select('-password')
    if (!admin) {
      return res.status(401).json({ msg: 'Administrador no encontrado' })
    }

    req.user = admin
    next()
  } catch (error) {
    return res.status(401).json({ msg: 'Token inválido o expirado' })
  }
}
