import {Router} from 'express'
import { comprobarTokenPassword, crearNuevoPassword, recuperarPassword, login, perfil, actualizarPerfil, actualizarAvatar, actualizarPassword, obtenerRedes, obtenerRedPorId, eliminarRed, resolverReporteRedGlobalSuperAdmin, obtenerEstudiantes, obtenerEstudiantePorId } 
from '../controllers/SuperAdminController.js'
import { listarRedesPendientesAprobacion, resolverAprobacionRed } from '../controllers/socialController.js'
import validators from '../validators/index.js'
import validateResult from '../validators/validateResult.js'
import { autenticarToken, isSuperAdmin } from '../middlewares/authSuperAdmin.js'
import { getApelaciones, getApelacionById, resolverApelacion } from '../controllers/apelacionController.js'
import {
  listarReportes,
  listarSolicitudes,
  resolverReporteUsuario,
  resolverReporteRed,
  resolverReporteApp,
  resolverSolicitudVerificacion,
  resolverSolicitudOficializacion,
  resolverSolicitudPostularAdminRed,
  resolverSolicitudRevocarAdminRed,
  deleteSolicitudPorId,
  deleteReportePorId,
  obtenerStrikesUsuario,
  eliminarStrikeUsuario,
  obtenerStrikesRed,
  eliminarStrikeRed
} from '../controllers/reportesSolicitudesController.js'

const router = Router()

//Rutas para la gestión de la cuenta
router.post('/recuperar-password', validators.recuperarPasswordValidator, validateResult, recuperarPassword)
router.get('/recuperar-password/:token', validators.tokenParam('token'), validateResult, comprobarTokenPassword)
router.post('/nuevo-password/:token', validators.crearNuevoPasswordValidator, validateResult, crearNuevoPassword)
router.post('/login', validators.loginValidator, validateResult, login)
router.get('/perfil-superadmin', autenticarToken, isSuperAdmin, perfil)
router.patch('/actualizar-superadmin/', autenticarToken, isSuperAdmin, validators.actualizarPerfilValidator, validateResult, actualizarPerfil)
router.patch('/perfil/avatar', autenticarToken, isSuperAdmin, actualizarAvatar)
router.patch('/superadmin/actualizar-password/', autenticarToken, isSuperAdmin, validators.actualizarPasswordValidator, validateResult, actualizarPassword)

//Rutas para la gestión de redes comunitarias
router.get('/redes', autenticarToken, isSuperAdmin, obtenerRedes)
router.get('/red/:id', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, obtenerRedPorId)
router.delete('/eliminar-red/:id', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, eliminarRed)

// Gestión de estudiantes
router.get('/estudiantes', autenticarToken, isSuperAdmin, obtenerEstudiantes)
router.get('/estudiantes/:id', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, obtenerEstudiantePorId)

// Reportes
router.get('/reportes/ver/:subtype', autenticarToken, isSuperAdmin, validators.listarReportesValidator, validateResult, listarReportes)
router.patch('/reportes/usuarios/:id/resolver', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, resolverReporteUsuario)
router.patch('/reportes/redes/:id/resolver', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, resolverReporteRed)
router.patch('/reportes/app/:id/resolver', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, resolverReporteApp)
router.delete('/superadmin/reportes/:subtype/:id', autenticarToken, isSuperAdmin, validators.deleteReporteValidator, validateResult, deleteReportePorId)
router.delete('/superadmin/solicitudes/:subtype/:id', autenticarToken, isSuperAdmin, validators.deleteSolicitudValidator, validateResult, deleteSolicitudPorId)

// Reportes red global
router.patch('/reportes/superadmin/red-global/:id/resolver', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validators.resolverReporteRedGlobalValidator, validateResult, resolverReporteRedGlobalSuperAdmin)

// Listar Solcitudes
router.get('/solicitudes/ver/:subtype', autenticarToken, isSuperAdmin, validators.listarSolicitudesValidator, validateResult, listarSolicitudes)

// Solicitudes de verificación/oficialización de redes
router.patch('/redes/solicitudes/:id/resolver-verificacion', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validators.resolverVerificacionRedValidator, validateResult, resolverSolicitudVerificacion)
router.patch('/redes/solicitudes/:id/resolver-oficializacion', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validators.resolverVerificacionRedValidator, validateResult, resolverSolicitudOficializacion)

// Solicitudes de revocar admin de red y postular como admin de red
router.patch('/red/:id/resolver/revocar-rol', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, resolverSolicitudRevocarAdminRed)
router.patch('/red/:id/resolver/postular-rol', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, resolverSolicitudPostularAdminRed)

// Solicitudes de crear redes comunitarias 
router.get('/superadmin/redes/pendientes', autenticarToken, isSuperAdmin, listarRedesPendientesAprobacion)
router.patch('/superadmin/redes/:redId/aprobacion', autenticarToken, isSuperAdmin, validators.mongoIdParam('redId'), validateResult, resolverAprobacionRed)

// Strikes
router.get('/estudiantes/:id/strikes', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, obtenerStrikesUsuario)
router.delete('/estudiantes/:id/strikes/:strikeId', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validators.mongoIdParam('strikeId'), validateResult, eliminarStrikeUsuario)
router.get('/redes/:id/strikes', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, obtenerStrikesRed)
router.delete('/redes/:id/strikes/:strikeId', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validators.mongoIdParam('strikeId'), validateResult, eliminarStrikeRed)

// Apelaciones
router.get('/apelaciones', autenticarToken, isSuperAdmin, getApelaciones)
router.get('/apelaciones/:id', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validateResult, getApelacionById)
router.patch('/apelaciones/:id/resolver', autenticarToken, isSuperAdmin, validators.mongoIdParam('id'), validators.resolverApelacionValidator, validateResult, resolverApelacion)

export default router