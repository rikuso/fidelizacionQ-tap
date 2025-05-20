// routes/advancedStatsRoutes.js

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const rateLimiter = require('../middleware/rateLimiter');
const advancedCtrl = require('../controllers/advancedStatsController');

const router = express.Router();

// Middleware de validación centralizado
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Estadísticas avanzadas
 */

// Escaneos diarios de NFC (UIDs)
router.get(
  '/stats_uids/daily',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const data = await advancedCtrl.getDailyScans();
    res.json({ data });
  })
);

// Visitas web diarias
router.get(
  '/stats_web/daily',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const data = await advancedCtrl.getDailyWeb();
    res.json({ data });
  })
);

// Distribución horaria de visitas web
router.get(
  '/stats_web/hours',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const data = await advancedCtrl.getHourlyDistribution();
    res.json({ data });
  })
);

// Tasa de conversión: visitas -> acciones
router.get(
  '/stats_web/conversion',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const data = await advancedCtrl.getConversionRate();
    res.json({ data });
  })
);

// Retención de usuarios de NFC
router.get(
  '/stats_uids/retention',
  apiKeyAuth,
  rateLimiter,
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 }).toInt().withMessage('days debe ser un entero entre 1 y 365'),
  validate,
  asyncHandler(async (req, res) => {
    const days = req.query.days || 30;
    const data = await advancedCtrl.getRetention(days);
    res.json({ data, days });
  })
);

// Geolocalización de visitas web
router.get(
  '/stats_web/locations',
  apiKeyAuth,
  rateLimiter,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).toInt().withMessage('limit inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit || 10;
    const data = await advancedCtrl.getLocations(limit);
    res.json({ data, limit });
  })
);

// Funnel de conversión web
router.get(
  '/stats_web/funnel',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const data = await advancedCtrl.getFunnel();
    res.json({ data });
  })
);

// Historial de un usuario por UID
router.get(
  '/usuario/history/:uid',
  apiKeyAuth,
  rateLimiter,
  param('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const data = await advancedCtrl.getUserHistory(uid);
    if (!data) {
      return res.status(404).json({ error: 'UID no encontrado' });
    }
    res.json({ data });
  })
);

// Eventos recientes NFC
router.get(
  '/nfc_events/recent',
  apiKeyAuth,
  rateLimiter,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).toInt().withMessage('limit inválido'),
  query('startAfter')
    .optional().isISO8601().withMessage('startAfter debe ser ISO8601'),
  validate,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit || 100;
    const startAfter = req.query.startAfter || null;
    const data = await advancedCtrl.getRecentEvents({ limit, startAfter });
    res.json({ data });
  })
);

// Usuarios activos en web
router.get(
  '/stats_web/active',
  apiKeyAuth,
  rateLimiter,
  query('days')
    .optional().isInt({ min: 1, max: 365 }).toInt().withMessage('days inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const days = req.query.days || 7;
    const data = await advancedCtrl.getActiveUsers(days);
    res.json({ data, days });
  })
);

module.exports = router;
