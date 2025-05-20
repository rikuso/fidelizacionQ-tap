// routes/statsRoutes.js

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const apiKeyAuth   = require('../middleware/apiKeyAuth');
const rateLimiter  = require('../middleware/rateLimiter');
const statsController = require('../controllers/statsController');

const router = express.Router();

// Middleware: valida express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * GET /api/v1/stats/uids/:uid
 * Devuelve estadísticas para un UID específico.
 */
router.get(
  '/uids/:uid',
  apiKeyAuth,
  rateLimiter,
  // Validar parámetro UID
  param('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID longitud inválida'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const cache = req.app.get('cache');
    const cacheKey = `stats:uid:${uid}`;

    // Intentar servir desde caché
    if (cache && cache.has(cacheKey)) {
      return res.json({ data: cache.get(cacheKey), cache: true });
    }

    // Obtener stats del controlador
    const stats = await statsController.getStatsByUid(uid);
    if (!stats) {
      return res.status(404).json({ error: 'Estadísticas no encontradas para UID' });
    }

    // Guardar en caché por 60s
    if (cache) {
      cache.set(cacheKey, stats, 60);
    }

    return res.json({ data: stats, cache: false });
  })
);

/**
 * GET /api/v1/stats/uids
 * Listar todas las estadísticas, con paginación opcional.
 * Query params:
 *  - limit: número máximo de ítems (1-500, default 100)
 *  - startAfter: ISO8601 timestamp para paginación
 */
router.get(
  '/uids',
  apiKeyAuth,
  rateLimiter,
  // Validar query params
  query('limit').optional().isInt({ min: 1, max: 500 }).toInt().withMessage('Limit inválido'),
  query('startAfter').optional().isISO8601().withMessage('startAfter debe ser fecha ISO8601'),
  validate,
  asyncHandler(async (req, res) => {
    const { limit = 100, startAfter } = req.query;
    // Llamar controlador
    const { data, nextCursor } = await statsController.listAllStats({ limit, startAfter });
    return res.json({ data, nextCursor });
  })
);

module.exports = router;
