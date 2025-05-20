// errors/customErrors.js

/**
 * Base class para errores personalizados con statusCode y tipo.
 */
class CustomError extends Error {
  constructor(message, type = 'server_error', statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    if (details) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validación de Tag
 */
class TagValidationError extends CustomError {
  constructor(details) {
    super('Tag validation failed', 'TAG_VALIDATION', 422, details);
  }
}

/**
 * Error de autenticación de API Key
 */
class ApiKeyAuthError extends CustomError {
  constructor() {
    super('Invalid API key', 'AUTH_ERROR', 401);
  }
}

/**
 * Error de límite de peticiones alcanzado
 */
class RateLimitError extends CustomError {
  constructor() {
    super('Too many requests', 'RATE_LIMIT', 429);
  }
}

module.exports = {
  CustomError,
  TagValidationError,
  ApiKeyAuthError,
  RateLimitError
};

// --- Middleware de manejo de errores (index.js) ---
// Debe ir después de todas las rutas y middlewares

/*
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const payload = {
    error: err.type || 'server_error',
    message: err.message || 'Internal Server Error'
  };
  if (err.details) payload.details = err.details;
  // Solo en no producción incluir stack
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});
*/
