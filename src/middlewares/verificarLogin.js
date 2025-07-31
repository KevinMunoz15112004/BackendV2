import jwt from 'jsonwebtoken'

export const verificarEstadoLogin = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1]

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      return res.status(400).json({ msg: "Ya estás logueado" })
    } catch (error) {
      return next()
    }
  } else {
    return next()
  }
}
