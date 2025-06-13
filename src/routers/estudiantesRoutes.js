import {Router} from 'express'
import { registroEstudiante, confirmarMailEstudiante, comprobarTokenPasswordEstudiante, recuperarPasswordEstudiante, crearNuevoPasswordEstudiante, loginEstudiante, perfilEstudiante, actualizarPerfilEstudiante, actualizarPasswordEstudiante } 
from '../controllers/estudiantesController.js'
import { verificarTokenEstudiante } from '../middlewares/JWTEstudiante.js'

const router = Router()

//Rutas para la gestión de la cuenta
router.post('/registro-estudiantes', registroEstudiante)
router.get('/confirmar/:token', confirmarMailEstudiante)
router.post('/recuperar-password-e', recuperarPasswordEstudiante)
router.get('/recuperar-password-e/:token', comprobarTokenPasswordEstudiante)
router.post('/nuevo-password-e/:token', crearNuevoPasswordEstudiante)
router.post('/login-estudiante', loginEstudiante)
router.get('/perfil-estudiante', verificarTokenEstudiante, perfilEstudiante)
router.put('/estudiante/:id', verificarTokenEstudiante, actualizarPerfilEstudiante)
router.put('/estudiante/actualizarpassword/:id', verificarTokenEstudiante, actualizarPasswordEstudiante)

export default router