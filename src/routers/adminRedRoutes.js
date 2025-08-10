import { Router } from 'express'
import { autenticarTokenAdminRed, isAdminRed } from '../middlewares/authAdminRed.js'
import { verificarEstadoLogin } from '../middlewares/verificarLogin.js'
import {loginAdminRed, actualizarAvatarAdminRed, perfilAdminRed, actualizarPerfilAdminRed, actualizarPasswordAdminRed, listarPublicaciones, listarArticulosPorRedAdmin, eliminarArticuloAdmin, eliminarPublicacionAdmin, verEstudiantesDeRed, eliminarEstudianteDeRed, actualizarRedComunitaria, obtenerInfoRed} from '../controllers/adminRedController.js'

const router = Router()

//Rutas para la gestión de la cuenta
router.post('/login/admin-red', verificarEstadoLogin, loginAdminRed)
router.put('/perfil/avatar/admin-red', autenticarTokenAdminRed, isAdminRed, actualizarAvatarAdminRed)
router.get('/perfil/admin-red', autenticarTokenAdminRed, isAdminRed, perfilAdminRed)
router.put('/perfil/admin-red/actualizar', autenticarTokenAdminRed, isAdminRed, actualizarPerfilAdminRed)
router.put('/perfil/admin-red/actualizar/password', autenticarTokenAdminRed, isAdminRed, actualizarPasswordAdminRed)

//Rutas para la gestión de publicaciones
router.get('/publicaciones/listar/admin', autenticarTokenAdminRed, isAdminRed, listarPublicaciones)
router.delete('/publicaciones/admin/eliminar/:id', autenticarTokenAdminRed, isAdminRed, eliminarPublicacionAdmin)
router.get('/publicaciones/articulos/listar/admin', autenticarTokenAdminRed, isAdminRed, listarArticulosPorRedAdmin)
router.delete('/publicaciones/admin/articulo/eliminar/:id', autenticarTokenAdminRed, isAdminRed, eliminarArticuloAdmin)

//Rutas para la gestión de redes comunitarias
router.get('/red/admin/informacion', autenticarTokenAdminRed, isAdminRed, obtenerInfoRed)
router.put('/admin/actualizar/red', autenticarTokenAdminRed, isAdminRed, actualizarRedComunitaria)
router.get('/admin/estudiantes/listar', autenticarTokenAdminRed, isAdminRed, verEstudiantesDeRed)
router.delete('/admin/estudiantes/eliminar/:estudianteId', autenticarTokenAdminRed, isAdminRed, eliminarEstudianteDeRed)

export default router
