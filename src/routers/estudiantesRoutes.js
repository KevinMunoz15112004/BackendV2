import {Router} from 'express'
import { registroEstudiante, confirmarMailEstudiante, comprobarTokenPasswordEstudiante, recuperarPasswordEstudiante, crearNuevoPasswordEstudiante, perfilEstudiante, actualizarUsername, completarPerfil, actualizarPerfilEstudiante, actualizarPasswordEstudiante, crearPublicacion, unirseARedComunitaria, salirseDeRedComunitaria, listarRedesDelEstudiante, listarPublicacionesPorRed, listarPublicacionesGlobal, listarPublicacionesComunidades, obtenerRedesComunitarias, obtenerPerfilRed, publicarArticulo, listarArticulosGlobal, listarArticulosComunidades, eliminarArticulo, eliminarPublicacion, obtenerEstudiantes, obtenerPerfilPublicoInfo, obtenerPerfilPublicoFeed } 
from '../controllers/estudiantesController.js'
import { requirePerfilCompleto, disallowPerfilCompleto } from '../middlewares/checkPerfilCompleto.js'
import { verifyToken, optionalVerifyToken } from '../middlewares/auth.js'
import validators from '../validators/index.js'
import validateResult from '../validators/validateResult.js'
import { crearReporteRed, crearSolicitudPostularAdminRed } from '../controllers/reportesSolicitudesController.js'

const router = Router()

//Rutas para la gestión de la cuenta
router.post('/registro-estudiantes', validators.name('nombre'), validators.name('apellido'), validators.normalizeEmail('email'), validators.passwordField('password'), validateResult, registroEstudiante)
router.get('/confirmar/:token', validators.tokenParam('token'), validateResult, confirmarMailEstudiante)
router.post('/recuperar-password-e', validators.normalizeEmail('email'), validateResult, recuperarPasswordEstudiante)
router.get('/recuperar-password-e/:token', validators.tokenParam('token'), validateResult, comprobarTokenPasswordEstudiante)
router.post('/nuevo-password-e/:token', validators.crearNuevoPasswordValidator, validateResult, crearNuevoPasswordEstudiante)
router.get('/perfil-estudiante', verifyToken, requirePerfilCompleto, perfilEstudiante)
router.patch('/perfil/username', verifyToken, requirePerfilCompleto, actualizarUsername)
router.patch('/completar/perfil', verifyToken, disallowPerfilCompleto, completarPerfil)
router.patch('/estudiante/:id', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validators.actualizarPerfilValidator, validateResult, actualizarPerfilEstudiante)
router.patch('/estudiante/actualizarpassword/:id', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validators.actualizarPasswordValidator, validateResult, actualizarPasswordEstudiante)

//Rutas para la gestión de publicaciones
router.post('/estudiantes/publicaciones', verifyToken, requirePerfilCompleto, validators.crearPublicacionValidator, validateResult, crearPublicacion)
router.delete('/publicaciones/eliminar/:id', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, eliminarPublicacion)
router.get('/publicaciones/red/:redId', verifyToken, requirePerfilCompleto, validators.mongoIdParam('redId'), validateResult, listarPublicacionesPorRed)
router.post('/publicaciones/articulos', verifyToken, requirePerfilCompleto, validators.publicarArticuloValidator, validateResult, publicarArticulo)
router.get('/publicaciones/articulos/global', verifyToken, requirePerfilCompleto, listarArticulosGlobal)
router.get('/publicaciones/articulos/comunitarias', verifyToken, requirePerfilCompleto, listarArticulosComunidades)
router.delete('/publicaciones/articulo/eliminar/:id', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, eliminarArticulo)

//Rutas para la getsión de redes comunitarias
router.get('/redes/listar', verifyToken, requirePerfilCompleto, obtenerRedesComunitarias)

// Obtener perfil de red
router.get('/redes/:redId', verifyToken, requirePerfilCompleto, validators.mongoIdParam('redId'), validateResult, obtenerPerfilRed)

// Ver publicaciones de redes global y comunitarias
router.get('/publicaciones/global', verifyToken, requirePerfilCompleto, listarPublicacionesGlobal)
router.get('/publicaciones/comunitarias', verifyToken, requirePerfilCompleto, listarPublicacionesComunidades)

router.get('/estudiantes/listar/redes', verifyToken, requirePerfilCompleto, listarRedesDelEstudiante)
router.post('/estudiantes/unirse/red', verifyToken, requirePerfilCompleto, validators.mongoIdBody('redId'), validateResult, unirseARedComunitaria)
router.post('/estudiantes/salirse/red', verifyToken, requirePerfilCompleto, validators.mongoIdBody('redId'), validateResult, salirseDeRedComunitaria)

//Rutas para la gestión de mensajes
router.get('/cargar/estudiantes', verifyToken, requirePerfilCompleto, obtenerEstudiantes)
router.get('/perfil-publico/:usuarioId/info', verifyToken, requirePerfilCompleto, validators.mongoIdParam('usuarioId'), validateResult, obtenerPerfilPublicoInfo)
router.get('/perfil-publico/:usuarioId/feed', verifyToken, requirePerfilCompleto, validators.mongoIdParam('usuarioId'), validateResult, obtenerPerfilPublicoFeed)

// Estudiante: reportes sobre redes
router.post('/estudiantes/reportes/red', verifyToken, requirePerfilCompleto, validators.mongoIdBody('redId'), validators.reportRedValidator, validateResult, crearReporteRed)

// Estudiante: solicitar ser admin de red comunitaria
router.post('/estudiantes/solicitud/postular/admin-red', verifyToken, requirePerfilCompleto, validators.mongoIdBody('redId'), validators.trimAndNotEmpty('descripcion'), validateResult, crearSolicitudPostularAdminRed)

export default router