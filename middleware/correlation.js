// middleware/correlation.js

const { v4: uuidv4 } = require('uuid');

/**
 * Middleware para generación y propagación de Correlation ID.
 * - Usa el header 'X-Correlation-ID' si ya viene en la petición.
 * - Genera un UUID v4 si no existe.
 * - Añade req.correlationId y setea la cabecera de respuesta.
 */
module.exports = (req, res, next) => {
  // Normalizar header
  const incoming = req.header('X-Correlation-ID') || req.header('x-correlation-id');
  const correlationId = incoming && typeof incoming === 'string'
    ? incoming.trim()
    : uuidv4();

  // Adjuntar al request y response
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Mejor log de request con correlationId
  console.info(`[${correlationId}] › ${req.method} ${req.originalUrl}`);

  next();
};
