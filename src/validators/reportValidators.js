import { body, param, query } from 'express-validator'
import { mongoIdBody, mongoIdParam } from './mongoValidators.js'
import Publicacion from '../models/Publicaciones.js'
import RedComunitaria from '../models/RedComunitaria.js'

const ESTADOS_VALIDOS = [
  'pendiente',
  'resuelto',
  'rechazado'
]

const SUBTYPES_VALIDOS = [
  'publicacion',
  'usuario',
  'red',
  'app'
]

const SOLICITUD_SUBTYPES_VALIDOS = [
  'verificacion',
  'oficializacion',
  'rehabilitar_red',
  'habilitar_usuario',
  'postular_admin_red',
  'revocar_admin_red'
]

const SOLICITUD_ESTADOS_VALIDOS = [
  'pendiente',
  'aprobada',
  'rechazada'
]

const REPORTE_SUBTYPES_DELETE = [
  'publicacion',
  'articulo',
  'usuario',
  'red',
  'app'
]

const SOLICITUD_SUBTYPES_DELETE = [
  'verificacion',
  'oficializacion',
  'rehabilitar_red',
  'habilitar_usuario',
  'postular_admin_red',
  'revocar_admin_red'
]

const SOLICITUD_SUBTYPES_PROPIOS = [
  'rehabilitar_red', 
  'verificacion'
]

const PUBLICACION_TIPOS = [
  'Contenido Inapropiado',
  'Spam',
  'Acoso o Bullying',
  'Información falsa',
  'Otro'
]

const ARTICULO_TIPOS = [
  'Estafa',
  'Contenido Inapropiado',
  'Información falsa',
  'Otro'
]

const APP_TIPOS = [
  'Error Técnico',
  'Problema con la cuenta',
  'Contenidos Inapropiados',
  'Otro'
]

const USUARIO_TIPOS = [
  'Comportamiento inapropiado',
  'Acoso',
  'Otro'
]

const listarReportesValidator = [
  param('subtype').isIn(SUBTYPES_VALIDOS).withMessage('Tipo de reporte inválido'),
  query('estado').optional().isIn(ESTADOS_VALIDOS).withMessage('Estado inválido')
]

const listarSolicitudesValidator = [
  param('subtype').isIn(SOLICITUD_SUBTYPES_VALIDOS).withMessage('Tipo de solicitud inválido'),
  query('estado').optional().isIn(SOLICITUD_ESTADOS_VALIDOS).withMessage('Estado inválido')
]

const listarReportesRedGlobalValidator = [
  param('subtype')
    .optional()
    .isIn(['publicacion', 'articulo'])
    .withMessage('Subtype inválido'),
  query('estado')
    .optional()
    .isIn(['pendiente', 'resuelto', 'rechazado'])
    .withMessage('Estado inválido')
]

// Reporte sobre una publicación dentro de una red comunitaria
const reportPublicacionValidator = [
  mongoIdBody('publicacionId'),
  body('tipo').exists().withMessage('El tipo es obligatorio').bail().isString().withMessage('Tipo inválido').bail().isIn(PUBLICACION_TIPOS).withMessage('Tipo no permitido'),
  // descripcion required only when tipo === 'Otro'
  body('descripcion').if(body('tipo').equals('Otro')).exists().withMessage('Descripcion obligatoria para "Otro"').bail().isString().withMessage('La descripcion debe ser texto').bail().trim().notEmpty().withMessage('La descripcion no puede estar vacía')
]

const reportArticuloValidator = [
  mongoIdBody('articuloId'),
  body('tipo').exists().withMessage('El tipo es obligatorio').bail().isString().withMessage('Tipo inválido').bail().isIn(ARTICULO_TIPOS).withMessage('Tipo no permitido'),
  body('descripcion').if(body('tipo').equals('Otro')).exists().withMessage('Descripcion obligatoria para "Otro"').bail().isString().withMessage('La descripcion debe ser texto').bail().trim().notEmpty().withMessage('La descripcion no puede estar vacía')
]

// Reporte general de la aplicación (va al superadmin)
const reportAppValidator = [
  body('tipo').exists().withMessage('El tipo es obligatorio').bail().isString().withMessage('Tipo inválido').bail().isIn(APP_TIPOS).withMessage('Tipo no permitido'),
  body('descripcion').if(body('tipo').equals('Otro')).exists().withMessage('Descripcion obligatoria para "Otro"').bail().isString().withMessage('La descripcion debe ser texto').bail().trim().notEmpty().withMessage('La descripcion no puede estar vacía')
]

// Reporte de usuario (va al superadmin)
const reportUsuarioValidator = [
  mongoIdBody('reportadoUsuarioId'),

  body('publicacionId')
    .optional()
    .isMongoId().withMessage('publicacionId no es un ObjectId válido')
    .bail()
    .custom(async (value) => {
      const publicacion = await Publicacion.findById(value)
      if (!publicacion) throw new Error('La publicación no existe')
      return true
    }),

  body('redId')
    .optional()
    .isMongoId().withMessage('redId no es un ObjectId válido')
    .bail()
    .custom(async (value) => {
      const red = await RedComunitaria.findById(value)
      if (!red) throw new Error('La red no existe')
      return true
    }),
  body('tipo').exists().withMessage('El tipo es obligatorio').bail().isString().withMessage('Tipo inválido').bail().isIn(USUARIO_TIPOS).withMessage('Tipo no permitido'),
  body('descripcion').if(body('tipo').equals('Otro')).exists().withMessage('Descripcion obligatoria para "Otro"').bail().isString().withMessage('La descripcion debe ser texto').bail().trim().notEmpty().withMessage('La descripcion no puede estar vacía')
]

const rehabilitarUsuarioValidator = [
  body('motivo').exists().withMessage('El motivo es obligatorio').bail().isString().withMessage('Motivo inválido').bail().trim().notEmpty().withMessage('El motivo no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido').bail().trim().normalizeEmail(),
  body('username').optional().isString().withMessage('Username inválido').bail().trim().notEmpty().withMessage('Username no puede estar vacío'),
  body().custom((value, { req }) => {
    if (req.user && req.user._id) return true
    if ((req.body.email && String(req.body.email).trim() !== '') || (req.body.username && String(req.body.username).trim() !== '')) return true
    throw new Error('Debes especificar email o username para identificar al usuario suspendido si no estás autenticado')
  })
]

const resolverReporteRedGlobalValidator = [
  body('estado')
    .exists().withMessage('El estado es obligatorio').bail()
    .isIn(['Resuelta', 'resuelta', 'Rechazada', 'rechazada'])
    .withMessage('Estado inválido. Solo se acepta "Resuelta" o "Rechazada"'),
  body('respuesta')
    .optional()
    .isString().withMessage('La respuesta debe ser texto').bail()
    .trim().notEmpty().withMessage('La respuesta no puede estar vacía')
]

const deleteReporteValidator = [
  mongoIdParam('id'),
  param('subtype')
    .isIn(REPORTE_SUBTYPES_DELETE)
    .withMessage('Subtype inválido')
]

const deleteSolicitudValidator = [
  mongoIdParam('id'),
  param('subtype')
    .isIn(SOLICITUD_SUBTYPES_DELETE)
    .withMessage('Subtype inválido')
]

const listarMisSolicitudesValidator = [
  param('subtype')
    .isIn(SOLICITUD_SUBTYPES_PROPIOS)
    .withMessage('Subtype inválido')
]

export { reportPublicacionValidator, reportAppValidator, reportUsuarioValidator, reportArticuloValidator, rehabilitarUsuarioValidator, listarReportesValidator, listarSolicitudesValidator, listarReportesRedGlobalValidator, resolverReporteRedGlobalValidator, deleteReporteValidator, deleteSolicitudValidator, listarMisSolicitudesValidator }