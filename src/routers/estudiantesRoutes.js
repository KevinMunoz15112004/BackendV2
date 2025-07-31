import {Router} from 'express'
import { registroEstudiante, confirmarMailEstudiante, comprobarTokenPasswordEstudiante, recuperarPasswordEstudiante, crearNuevoPasswordEstudiante, loginEstudiante, perfilEstudiante, actualizarPerfilEstudiante, actualizarPasswordEstudiante, crearPublicacion, unirseARedComunitaria, listarPublicaciones, listarRedesDelEstudiante, listarPublicacionesPorRed, obtenerRedesComunitarias, publicarArticulo, listarArticulosPorRed, eliminarArticulo, actualizarArticulo, actualizarPublicacion, eliminarPublicacion, comprarArticulo, listarTodosArticulos, obtenerEstudiantes } 
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

//Rutas para la gestión de publicaciones
router.post('/estudiantes/publicaciones', verificarTokenEstudiante, crearPublicacion)
router.get('/publicaciones/listar', verificarTokenEstudiante, listarPublicaciones)
router.put('/publicaciones/actualizar/:id', verificarTokenEstudiante, actualizarPublicacion)
router.delete('/publicaciones/eliminar/:id', verificarTokenEstudiante, eliminarPublicacion)
router.get('/publicaciones/red/:redId', verificarTokenEstudiante, listarPublicacionesPorRed)
router.post('/publicaciones/articulos', verificarTokenEstudiante, publicarArticulo)
router.get('/publicaciones/articulos/listar', verificarTokenEstudiante, listarTodosArticulos)
router.get('/publicaciones/articulos/listar/:redId', verificarTokenEstudiante, listarArticulosPorRed)
router.put('/publicaciones/articulo/actualizar/:id', verificarTokenEstudiante, actualizarArticulo)
router.delete('/publicaciones/articulo/eliminar/:id', verificarTokenEstudiante, eliminarArticulo)
router.post('/articulo/comprar', verificarTokenEstudiante, comprarArticulo)

//Rutas para la getsión de redes comunitarias
router.get('/redes/listar', verificarTokenEstudiante, obtenerRedesComunitarias)
router.get('/estudiantes/listar/redes', verificarTokenEstudiante, listarRedesDelEstudiante)
router.post('/estudiantes/unirse/red', verificarTokenEstudiante, unirseARedComunitaria)

//Rutas para la gestión de mensajes
router.get('/cargar/estudiantes', verificarTokenEstudiante, obtenerEstudiantes)


export default router