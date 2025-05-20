const { param, validationResult } = require('express-validator');

/**
 * Middleware para validar UID por parámetro.
 * - Debe ser hexadecimal.
 * - Longitud entre 4 y 32 caracteres.
 */
exports.validateUID = [
  param('uid')
    .trim()
    .isHexadecimal().withMessage('El UID debe ser un valor hexadecimal válido.')
    .isLength({ min: 4, max: 32 }).withMessage('El UID debe tener entre 4 y 32 caracteres.')
];

/**
 * Middleware general para validar errores capturados por express-validator.
 * Si hay errores, responde con status 422 y detalle de cada uno.
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      error: 'VALIDATION_ERROR',
      details: errors.array().map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
  }
  next();
};
