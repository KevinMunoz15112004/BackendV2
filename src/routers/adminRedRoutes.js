import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.js'
import { perfilAdminRed, verEstudiantesDeRed, eliminarEstudianteDeRed, actualizarRedComunitaria, obtenerInfoRed } from '../controllers/adminRedController.js'
import validators from '../validators/index.js'
import validateResult from '../validators/validateResult.js'
import { resolverReportePublicacionAdmin, crearSolicitudVerificacion, crearSolicitudRehabilitar, deleteSolicitudRehabilitarByAdmin, crearSolicitudRevocarAdminRed, crearSolicitudOficializacion, deleteReportePorId, listarMisSolicitudes } from '../controllers/reportesSolicitudesController.js'

const router = Router()

//Rutas para la gestión de la cuenta
router.get('/perfil/admin-red', verifyToken, requireRole('admin_red'), perfilAdminRed)

//Rutas para la gestión de redes comunitarias
router.get('/red/admin/informacion', verifyToken, requireRole('admin_red'), obtenerInfoRed)
router.patch('/admin/actualizar/red', verifyToken, requireRole('admin_red'), validators.actualizarRedComunitariaValidator, validateResult, actualizarRedComunitaria)
router.get('/admin/estudiantes/listar', verifyToken, requireRole('admin_red'), verEstudiantesDeRed)
router.delete('/admin/estudiantes/eliminar/:estudianteId', verifyToken, requireRole('admin_red'), validators.mongoIdParam('estudianteId'), validateResult, eliminarEstudianteDeRed)

// Admin Red:resolver reportes de publicaciones de su red
router.patch('/admin/reportes/:id/resolver', verifyToken, requireRole('admin_red'), validators.mongoIdParam('id'), validateResult, resolverReportePublicacionAdmin)
router.delete('/admin/reportes/:subtype/:id', verifyToken, requireRole('admin_red'), validators.deleteReporteValidator, validateResult, deleteReportePorId)
router.delete('/admin/solicitudes/rehabilitar/:id', verifyToken, requireRole('admin_red'), validators.mongoIdParam('id'), validateResult, deleteSolicitudRehabilitarByAdmin)

// Admin Red:listar sus propias solicitudes
router.get('/solicitudes', verifyToken, requireRole('admin_red'), validators.listarMisSolicitudesValidator, validateResult, listarMisSolicitudes)

// Admin Red:crear solicitud para rehabilitar su red deshabilitada
router.post('/solicitudes/rehabilitar', verifyToken, requireRole('admin_red'), validators.mongoIdBody('redId'), validators.description('descripcion', { optional: false }), validateResult, crearSolicitudRehabilitar)

// Admin Red:solicitar verificación/oficialización de su red (solo su red asignada)
router.post('/redes/solicitar-verificacion', verifyToken, requireRole('admin_red'), validators.mongoIdBody('redId'), validators.solicitarVerificacionRedValidator, validateResult, crearSolicitudVerificacion)
router.post('/redes/solicitar-oficializacion', verifyToken, requireRole('admin_red'), validators.mongoIdBody('redId'), validators.solicitarOficializacionRedValidator, validateResult, crearSolicitudOficializacion)

// Admin Red: solicitar revocar admin de red actual
router.post('/redes/solicitar/revocar-admin', verifyToken, requireRole('admin_red'), validators.mongoIdBody('redId'), validators.trimAndNotEmpty('descripcion'), validateResult, crearSolicitudRevocarAdminRed)

export default router
