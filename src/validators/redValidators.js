import { body } from 'express-validator'

const actualizarRedComunitariaValidator = [
  // nombre and descripcion optional, but at least one of them or an uploaded file must be present
  body('nombre')
    .optional()
    .isString().withMessage('El nombre debe ser texto')
    .bail()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío'),
  body('descripcion')
    .optional()
    .isString().withMessage('La descripción debe ser texto')
    .bail()
    .trim()
    .notEmpty().withMessage('La descripción no puede estar vacía'),
  body()
    .custom((_, { req }) => {
      const hasNombre = req.body && req.body.nombre && String(req.body.nombre).trim() !== ''
      const hasDescripcion = req.body && req.body.descripcion && String(req.body.descripcion).trim() !== ''
      const hasFile = req.files && req.files.imagen
      if (!hasNombre && !hasDescripcion && !hasFile) {
        throw new Error('Debe proporcionar al menos un campo válido para actualizar (descripción o imagen).')
      }
      return true
    })
]

// Para crear solicitud de verificación
const solicitarVerificacionRedValidator = [
  body('nombreRed').trim().notEmpty().withMessage('El nombre de la red es obligatorio'),
  body('fechaCreacionRed')
    .notEmpty().withMessage('La fecha de creación es obligatoria')
    .isISO8601().withMessage('La fecha debe tener formato válido'),
  body('cantidadMiembros')
    .notEmpty().withMessage('La cantidad de miembros es obligatoria')
    .isInt({ min: 0 }).withMessage('La cantidad de miembros debe ser un número entero positivo'),
]

// Para crear solicitud de oficialización
const solicitarOficializacionRedValidator = [
  body('nombreRed').trim().notEmpty().withMessage('El nombre de la red es obligatorio'),
  body('fechaCreacionRed')
    .notEmpty().withMessage('La fecha de creación es obligatoria')
    .isISO8601().withMessage('La fecha debe tener formato válido'),
  body('cantidadMiembros')
    .notEmpty().withMessage('La cantidad de miembros es obligatoria')
    .isInt({ min: 0 }).withMessage('La cantidad de miembros debe ser un número entero positivo'),
  body('dependencia')
    .notEmpty().withMessage('La dependencia es obligatoria')
    .isIn(['Rectorado', 'Vicerrectorado', 'Facultad', 'Carrera', 'Departamento', 'Bienestar Universitario', 'Otro'])
    .withMessage('Dependencia no válida'),
  body('dependenciaPersonalizada')
    .if((value, { req }) => req.body.dependencia === 'Otro')
    .trim().notEmpty().withMessage('Debes describir la dependencia cuando seleccionas "Otro"'),
  body('cargo')
    .notEmpty().withMessage('El cargo es obligatorio')
    .isIn(['Director', 'Coordinador', 'Docente responsable', 'Administrativo', 'Representante autorizado', 'Otro'])
    .withMessage('Cargo no válido'),
  body('cargoPersonalizado')
    .if((value, { req }) => req.body.cargo === 'Otro')
    .trim().notEmpty().withMessage('Debes describir el cargo cuando seleccionas "Otro"'),
  // body('correoInstitucional')
  //   .notEmpty().withMessage('El correo institucional es obligatorio')
  //   .matches(/^[^\s@]+@epn\.edu\.ec$/i).withMessage('El correo debe ser institucional (@epn.edu.ec)'),
  body('justificacion')
    .trim().notEmpty().withMessage('La justificación es obligatoria')
    .isLength({ max: 2000 }).withMessage('La justificación no puede superar los 2000 caracteres'),
]

// Para resolver cualquiera de las dos solicitudes
const resolverVerificacionRedValidator = [
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn(['Aprobada', 'Rechazada']).withMessage('Estado inválido. Solo "Aprobada" o "Rechazada"'),
  body('respuesta').optional().isString().withMessage('La respuesta debe ser texto'),
]

export { actualizarRedComunitariaValidator, resolverVerificacionRedValidator, solicitarOficializacionRedValidator, solicitarVerificacionRedValidator }
