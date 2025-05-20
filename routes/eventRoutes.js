// routes/eventRoutes.js

const express = require('express');
const { body, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const rateLimiter = require('../middleware/rateLimiter');
const eventController = require('../controllers/eventController');

const router = express.Router();

// Middleware para validar express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /api/v1/events/batch
 * Inserta un lote de eventos.
 * Body: [{ uid, eventType, timestamp, meta? }]
 */
router.post(
  '/batch',
  apiKeyAuth,
  rateLimiter,
  // Validaciones del array de eventos
  body()
    .isArray({ min: 1 }).withMessage('El body debe ser un array de eventos'),
  body('*.uid')
    .exists().withMessage('UID es requerido')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID longitud inválida'),
  body('*.eventType')
    .isString().notEmpty().withMessage('eventType es requerido'),
  body('*.timestamp')
    .isISO8601().withMessage('timestamp debe ser fecha ISO8601'),
  validate,
  asyncHandler(async (req, res) => {
    const events = req.body;
    const inserted = await eventController.batchInsert(events);
    return res.status(201).json({ message: 'Eventos insertados', count: inserted.length, data: inserted });
  })
);

module.exports = router;
