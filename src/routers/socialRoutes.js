import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.js'
import validators from '../validators/index.js'
import validateResult from '../validators/validateResult.js'
import {
  solicitarCreacionRed,
  darLikePublicacion,
  quitarLikePublicacion,
  crearComentarioPublicacion,
  responderComentario,
  listarComentariosArbol,
  guardarPublicacion,
  quitarGuardadoPublicacion,
  listarPublicacionesGuardadas,
  listarPublicacionesLiked,
  listarNotificaciones,
  marcarNotificacionLeida,
  listarLikesPublicacion,
} from '../controllers/socialController.js'
import { requirePerfilCompleto } from '../middlewares/checkPerfilCompleto.js'
import { crearReportePublicacion, crearReporteApp, crearReporteUsuario, crearReporteArticulo } from '../controllers/reportesSolicitudesController.js'

const router = Router()

// Estudiantes
router.post('/redes/solicitar-creacion', verifyToken, validators.title('nombre'), validators.description('descripcion'), validators.description('proposito'), validateResult, solicitarCreacionRed)

router.post('/publicaciones/:id/like', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, darLikePublicacion)
router.delete('/publicaciones/:id/like', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, quitarLikePublicacion)
router.get('/publicaciones/:id/likes', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, listarLikesPublicacion)

router.post('/publicaciones/:id/comentarios', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validators.trimAndNotEmpty('contenido'), validateResult, crearComentarioPublicacion)
router.post('/comentarios/:comentarioId/responder', verifyToken, requirePerfilCompleto, validators.mongoIdParam('comentarioId'), validators.trimAndNotEmpty('contenido'), validateResult, responderComentario)
router.get('/publicaciones/:id/comentarios/arbol', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, listarComentariosArbol)

router.post('/publicaciones/:id/guardar', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, guardarPublicacion)
router.delete('/publicaciones/:id/guardar', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, quitarGuardadoPublicacion)
router.get('/usuarios/guardados', verifyToken, requirePerfilCompleto, listarPublicacionesGuardadas)
router.get('/usuarios/likes', verifyToken, requirePerfilCompleto, listarPublicacionesLiked)

router.get('/notificaciones', verifyToken, requirePerfilCompleto, listarNotificaciones)
router.patch('/notificaciones/:id/leida', verifyToken, requirePerfilCompleto, validators.mongoIdParam('id'), validateResult, marcarNotificacionLeida)

// Reportes: estudiantes crean (publicación), admin de red consulta los reportes de su red
router.post('/reportes/publicacion', verifyToken, requirePerfilCompleto, validators.reportPublicacionValidator, validateResult, crearReportePublicacion)
router.post('/reportes/articulo', verifyToken, requirePerfilCompleto, validators.reportArticuloValidator, validateResult, crearReporteArticulo)

// Reportes generales de la app (van al superadmin)
router.post('/reportes/app', verifyToken, requirePerfilCompleto, validators.reportAppValidator, validateResult, crearReporteApp)

// Reportes de usuarios (van al superadmin)
router.post('/reportes/usuario', verifyToken, requirePerfilCompleto, validators.reportUsuarioValidator, validateResult, crearReporteUsuario)

export default router
