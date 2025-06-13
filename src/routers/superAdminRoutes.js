import {Router} from 'express'
import { comprobarTokenPasword, crearNuevoPassword, recuperarPassword, login, perfil, actualizarPerfil, actualizarPassword } 
from '../controllers/SuperAdminController.js'
import { crearEstudiante, obtenerEstudiantes, obtenerEstudiantePorId, actualizarEstudiante, eliminarEstudiante } 
from '../controllers/SuperAdminController.js'
import { autenticarToken, isSuperAdmin } from '../middlewares/authSuperAdmin.js'
import { crearRed, obtenerRedes, obtenerRedPorId, actualizarRed, eliminarRed } from '../controllers/SuperAdminController.js'

const router = Router()

//Rutas para la gestión de la cuenta
router.post('/recuperar-password', recuperarPassword)
router.get('/recuperar-password/:token', comprobarTokenPasword)
router.post('/nuevo-password/:token', crearNuevoPassword)
router.post('/login', login)
router.get('/perfil-superadmin', autenticarToken, isSuperAdmin, perfil)
router.put('/superadmin/:id', autenticarToken, isSuperAdmin, actualizarPerfil)
router.put('/superadmin/actualizar-password/:id', autenticarToken, isSuperAdmin, actualizarPassword)

//Rutas para la gestión de usuarios
router.post('/crear-estudiantes', autenticarToken, isSuperAdmin, crearEstudiante)
router.get('/estudiantes', autenticarToken, isSuperAdmin, obtenerEstudiantes)
router.get('/estudiantes/:id', autenticarToken, isSuperAdmin, obtenerEstudiantePorId)
router.put('/actualizar-estudiantes/:id', autenticarToken, isSuperAdmin, actualizarEstudiante)
router.delete('/eliminar-estudiantes/:id', autenticarToken, isSuperAdmin, eliminarEstudiante)

//Rutas para la gestión de redes comunitarias
router.post('/crear-red', autenticarToken, isSuperAdmin, crearRed)
router.get('/redes', autenticarToken, isSuperAdmin, obtenerRedes)
router.get('/red/:id', autenticarToken, isSuperAdmin, obtenerRedPorId)
router.put('/actualizar-red/:id', autenticarToken, isSuperAdmin, actualizarRed)
router.delete('/eliminar-red/:id', autenticarToken, isSuperAdmin, eliminarRed)

export default router