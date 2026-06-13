import { Router } from 'express'
import { crearApelacion, crearApelacionRed } from '../controllers/apelacionController.js'
import { verifyToken, requireRole } from '../middlewares/auth.js'
import validators from '../validators/index.js'
import validateResult from '../validators/validateResult.js'

const router = Router()

// POST /api/apelaciones (Apelación de Usuario - Pública)
router.post('/apelaciones', validators.crearApelacionValidator, validateResult, crearApelacion)

// POST /api/apelaciones/red (Apelación de Red - Admin Red)
router.post('/apelaciones/red', verifyToken, requireRole('admin_red'), validators.mongoIdBody('redId'), validators.description('descripcion', { optional: false }), validateResult, crearApelacionRed)

export default router
