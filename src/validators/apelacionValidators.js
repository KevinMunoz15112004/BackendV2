import { body } from 'express-validator'

const crearApelacionValidator = [
  body('nombre').exists().withMessage('El nombre es obligatorio').bail().isString().withMessage('Nombre inválido').bail().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('correo').exists().withMessage('El correo es obligatorio').bail().isEmail().withMessage('Correo inválido').bail().trim().normalizeEmail(),
  body('motivo').exists().withMessage('El motivo es obligatorio').bail().isString().withMessage('Motivo inválido').bail().trim().notEmpty().withMessage('El motivo no puede estar vacío')
]

const resolverApelacionValidator = [
  body('estado').exists().withMessage('El estado es obligatorio').bail().isIn(['aprobada', 'rechazada']).withMessage('Estado inválido'),
  body('notaResolucion').exists().withMessage('Debe proveer una nota de resolución').bail().isString().withMessage('Nota de resolución inválida').bail().trim().notEmpty().withMessage('La nota de resolución no puede estar vacía')
]

export {
  crearApelacionValidator,
  resolverApelacionValidator
}
