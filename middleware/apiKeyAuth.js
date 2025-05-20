// middleware/apiKeyAuth.js

// Carga variables de entorno una sola vez
require('dotenv').config();

const { ApiKeyAuthError } = require('../errors/customErrors');

// Variable global de API KEY
const VALID_API_KEY = process.env.API_KEY;

/**
 * Middleware de autenticación por x-api-key
 * Lanza ApiKeyAuthError si la clave no coincide.
 */
module.exports = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== VALID_API_KEY) {
    // No autorizado
    throw new ApiKeyAuthError();
  }
  next();
};
