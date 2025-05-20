// middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('../errors/customErrors');

/**
 * Middleware de limitación de peticiones por IP.
 * Configurable para prevenir abuso.
 */
module.exports = rateLimit({
  windowMs: 60 * 1000,          // Ventana de 1 minuto
  max: 30,                      // Máximo 30 peticiones por IP en esa ventana
  standardHeaders: true,        // Cabeceras RateLimit-* en la respuesta
  legacyHeaders: false,         // Deshabilita X-RateLimit-* headers
  handler: (req, res, next) => {
    // Lanza un error personalizado en lugar de responder directamente
    next(new RateLimitError());
  }
});
