import * as common from './commonValidators.js'
import * as string from './stringValidators.js'
import * as mongo from './mongoValidators.js'
import * as auth from './authValidators.js'
import * as report from './reportValidators.js'
import * as content from './contentValidators.js'
import * as red from './redValidators.js'

export const validators = {
  // common
  trimAndNotEmpty: common.trimAndNotEmpty,
  normalizeEmail: common.normalizeEmail,
  passwordField: common.passwordField,
  number: common.numberField,
  // string
  name: string.nameValidator,
  username: string.usernameValidator,
  title: string.titleValidator,
  description: string.descriptionValidator,
  // mongo
  tokenParam: mongo.tokenParam,
  mongoIdParam: mongo.mongoIdParam,
  mongoIdBody: mongo.mongoIdBody,
  // boolean
  booleanBody: common.booleanBody,
  // auth composed
  loginValidator: auth.loginValidator,
  recuperarPasswordValidator: auth.recuperarPasswordValidator,
  crearNuevoPasswordValidator: auth.crearNuevoPasswordValidator,
  actualizarPasswordValidator: auth.actualizarPasswordValidator,
  actualizarPerfilValidator: auth.actualizarPerfilValidator,
  mongoIdParamValidator: auth.mongoIdParamValidator
  ,
  // report validators
  reportPublicacionValidator: report.reportPublicacionValidator,
  reportAppValidator: report.reportAppValidator,
  reportUsuarioValidator: report.reportUsuarioValidator,
  reportArticuloValidator: report.reportArticuloValidator,
  rehabilitarUsuarioValidator: report.rehabilitarUsuarioValidator,
  listarReportesValidator: report.listarReportesValidator,
  listarSolicitudesValidator: report.listarSolicitudesValidator,
  listarReportesRedGlobalValidator: report.listarReportesRedGlobalValidator,
  resolverReporteRedGlobalValidator: report.resolverReporteRedGlobalValidator,
  deleteReporteValidator: report.deleteReporteValidator,      
  deleteSolicitudValidator: report.deleteSolicitudValidator,
  listarMisSolicitudesValidator: report.listarMisSolicitudesValidator
}

// content
validators.crearPublicacionValidator = content.crearPublicacionValidator
validators.publicarArticuloValidator = content.publicarArticuloValidator

// red
validators.actualizarRedComunitariaValidator = red.actualizarRedComunitariaValidator
validators.solicitarVerificacionRedValidator = red.solicitarVerificacionRedValidator
validators.resolverVerificacionRedValidator = red.resolverVerificacionRedValidator
validators.solicitarOficializacionRedValidator = red.solicitarOficializacionRedValidator

export default validators
