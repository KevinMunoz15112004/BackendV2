import jwt from 'jsonwebtoken'
import SuperAdmin from '../models/SuperAdmin.js'

export const crearTokenJWT = (id, rol) => {

    return jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

export function isSuperAdmin(req, res, next) {
  if (req.user && req.user.rol === 'SuperAdmin') {
    return next();
  }
  return res.status(403).json({ msg: 'Acceso denegado. Solo para super administradores.' })
}

export async function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No autorizado, token faltante' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    
    const user = await SuperAdmin.findById(payload.id).lean().select('-password')
    if (!user) {
      return res.status(401).json({ msg: 'Usuario no encontrado' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ msg: 'Token inválido o expirado' })
  }
}
