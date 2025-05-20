// routes/userRoutes.js

const express               = require('express');
const { param, validationResult } = require('express-validator');
const asyncHandler         = require('../utils/asyncHandler');
const apiKeyAuth           = require('../middleware/apiKeyAuth');
const rateLimiter          = require('../middleware/rateLimiter');
const userController       = require('../controllers/userController');

const router = express.Router();

// Middleware de validación de express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * GET /api/v1/users/:uid
 * Devuelve datos físico, digital y cliente para un UID
 */
router.get(
  '/:uid',
  apiKeyAuth,
  rateLimiter,
  // Validar formato de UID
  param('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const cache = req.app.get('cache');
    const cacheKey = `user:${uid}`;

    // Intentar obtener desde caché
    if (cache && cache.has(cacheKey)) {
      return res.status(200).json({ data: cache.get(cacheKey), cache: true });
    }

    // Obtener datos del usuario desde el controlador
    const userData = await userController.getUsuarioByUID(uid);
    if (!userData) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Guardar en caché para próximas solicitudes
    if (cache) {
      cache.set(cacheKey, userData);
    }

    // Responder con los datos frescos
    res.status(200).json({ data: userData, cache: false });
  })
);

module.exports = router;
