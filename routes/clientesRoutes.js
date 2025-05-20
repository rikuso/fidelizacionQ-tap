// routes/clientesRoutes.js

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const asyncHandler       = require('../utils/asyncHandler');
const apiKeyAuth         = require('../middleware/apiKeyAuth');
const rateLimiter        = require('../middleware/rateLimiter');
const clientesController = require('../controllers/clientesController');

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
 * POST /api/v1/clientes
 * Crea o actualiza un cliente.
 */
router.post(
  '/',
  apiKeyAuth,
  rateLimiter,
  body('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 32 }).withMessage('UID inválido'),
  body('nombre')
    .isString().trim().notEmpty().withMessage('Nombre es obligatorio'),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('telefono')
    .optional()
    .isString().trim().isMobilePhone('any').withMessage('Teléfono inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const cliente = await clientesController.registrarCliente(req.body);
    res.status(201).json({ message: 'Cliente registrado/actualizado', data: cliente });
  })
);

/**
 * GET /api/v1/clientes/:uid
 * Obtiene un cliente por UID.
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
    const cliente = await clientesController.getCliente(uid);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ data: cliente });
  })
);

/**
 * GET /api/v1/clientes
 * Lista todos los clientes con paginación opcional.
 * Query: ?limit=50&startAfter=<ISO timestamp>
 */
router.get(
  '/',
  apiKeyAuth,
  rateLimiter,
  query('limit').optional().isInt({ min: 1, max: 500 }).toInt().withMessage('Limit inválido'),
  query('startAfter').optional().isISO8601().withMessage('startAfter debe ser ISO8601'),
  validate,
  asyncHandler(async (req, res) => {
    const { limit = 100, startAfter } = req.query;
    const { data, nextCursor } = await clientesController.getAllClientes({ limit, startAfter });
    res.json({ data, nextCursor });
  })
);

module.exports = router;
