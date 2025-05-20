// services/cache.js
const NodeCache = require('node-cache');

// TTL por defecto: 60 segundos (modificable por .set)
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

module.exports = cache;
