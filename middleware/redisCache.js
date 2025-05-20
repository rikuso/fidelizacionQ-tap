// middleware/redisCache.js

const redis = require('redis');
const { promisify } = require('util');
const { CustomError } = require('../errors/customErrors');

// Crear cliente Redis
const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: process.env.NODE_ENV === 'production' ? { tls: {} } : undefined
});
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});
(async () => { await client.connect(); })();

const getAsync = async (key) => {
  try {
    const data = await client.get(key);
    return data;
  } catch (err) {
    console.error('Redis GET error:', err);
    return null;
  }
};

const setExAsync = async (key, ttl, value) => {
  try {
    await client.setEx(key, ttl, value);
  } catch (err) {
    console.error('Redis SETEX error:', err);
  }
};

/**
 * Middleware para cachear respuestas en Redis
 * @param {Function} keyGenerator - Función (req) => string para generar la clave
 * @param {number} ttl - Time to live en segundos
 */
module.exports = (keyGenerator, ttl = 60) => {
  if (typeof keyGenerator !== 'function') {
    throw new CustomError('keyGenerator debe ser función', 'CACHE_ERROR', 500);
  }

  return async (req, res, next) => {
    const cacheKey = keyGenerator(req);
    if (!cacheKey) return next();

    // Intentar obtener de cache
    const cached = await getAsync(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        return res.json(data);
      } catch (err) {
        console.error('Error parsing cached data for', cacheKey, err);
      }
    }

    // Interceptar respuesta
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Guardar en cache
      setExAsync(cacheKey, ttl, JSON.stringify(body));
      return originalJson(body);
    };

    next();
  };
};
