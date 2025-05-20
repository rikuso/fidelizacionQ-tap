// routes/tagRoutes.js

const express               = require('express');
const { body, param, validationResult } = require('express-validator');
const asyncHandler         = require('../utils/asyncHandler');
const apiKeyAuth           = require('../middleware/apiKeyAuth');
const rateLimiter          = require('../middleware/rateLimiter');
const tagController        = require('../controllers/tagController');
const NodeCache            = require('node-cache');

// Opcional: Middleware de cache en memoria si no se usa globalmente
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const router = express.Router();

// Validación de errores de express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /api/v1/tags
 * Body: { uid, url, deviceId, scanType }
 */
router.post(
  '/',
  apiKeyAuth,
  rateLimiter,
  // Validaciones
  body('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID inválido'),
  body('url').isURL().withMessage('URL inválida'),
  body('deviceId').isString().notEmpty().withMessage('deviceId requerido'),
  body('scanType').isIn(['nfc']).withMessage('scanType inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.body;
    // Cache en app (puede venir de app.set('cache')) o local
    const appCache = req.app.get('cache') || cache;

    if (appCache.has(uid)) {
      return res.status(200).json({ message: 'UID ya procesado recientemente (caché)' });
    }

    // Guarda el UID y envía respuesta
    const saved = await tagController.saveUID(req.body);
    // Se asume que saveUID retorna un objeto o éxito
    appCache.set(uid, true);

    return res.status(201).json({ message: 'UID procesado', data: saved });
  })
);

/**
 * GET /api/v1/tags/:uid
 */
router.get(
  '/:uid',
  apiKeyAuth,
  rateLimiter,
  param('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const appCache = req.app.get('cache') || cache;

    if (appCache.has(`tag_${uid}`)) {
      const cached = appCache.get(`tag_${uid}`);
      return res.status(200).json({ message: 'Desde caché', data: cached });
    }

    const tag = await tagController.getUID(uid);
    if (!tag) {
      return res.status(404).json({ error: 'UID no encontrado' });
    }

    appCache.set(`tag_${uid}`, tag, 120); // TTL 2 minutos
    return res.status(200).json({ data: tag });
  })
);

/**
 * GET /api/v1/tags
 * Opcional: ?limit=50&startAfter=<ISO timestamp>
 */
router.get(
  '/',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const { limit = 100, startAfter } = req.query;
    const tags = await tagController.getAllUIDs({ limit, startAfter });
    return res.status(200).json({ data: tags });
  })
);

module.exports = router;
