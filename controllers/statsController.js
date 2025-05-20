// controllers/statsController.js

const { db } = require('../services/firebase');
const CACHE_TTL = 60; // en segundos

/**
 * Obtiene estadísticas básicas de un UID: token y lastSeen.
 * @param {string} uid - Identificador hexadecimal
 * @param {NodeCache} cache - Instancia de caché en memoria (opcional)
 * @returns {Object} - { token, lastSeen }
 * @throws {Error} - Error con status 404 si no existe el UID
 */
exports.getStatsByUid = async (uid, cache) => {
  if (!uid) {
    const err = new Error('UID es requerido');
    err.status = 400;
    throw err;
  }

  const cacheKey = `stats:uid:${uid}`;
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const snapshot = await db.collection('uids').doc(uid).get();
  if (!snapshot.exists) {
    const err = new Error('Estadísticas no encontradas para UID');
    err.status = 404;
    throw err;
  }

  const { token, lastSeen } = snapshot.data();
  const result = { token, lastSeen: lastSeen.toDate().toISOString() };

  if (cache) {
    cache.set(cacheKey, result, CACHE_TTL);
  }

  return result;
};

/**
 * Lista estadísticas de todos los UIDs, paginadas.
 * @param {Object} params
 * @param {number} params.limit - máximo de ítems (1-500)
 * @param {string|null} params.startAfter - ISO timestamp para paginación
 * @param {NodeCache} cache - Instancia de caché en memoria (opcional)
 * @returns {Object} - { data: Array<{uid, token, lastSeen}>, nextCursor }
 */
exports.listAllStats = async ({ limit = 100, startAfter = null } = {}, cache) => {
  // Validar límites
  limit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

  const cacheKey = `stats:list:${limit}:${startAfter || 'init'}`;
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let query = db.collection('uids')
    .orderBy('lastSeen', 'desc')
    .limit(limit);

  if (startAfter) {
    const cursorDate = new Date(startAfter);
    if (isNaN(cursorDate)) {
      const err = new Error('startAfter debe ser fecha ISO válida');
      err.status = 400;
      throw err;
    }
    query = query.startAfter(cursorDate);
  }

  const snapshot = await query.get();
  const data = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      uid:      doc.id,
      token:    d.token,
      lastSeen: d.lastSeen.toDate().toISOString(),
    };
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastDoc
    ? lastDoc.data().lastSeen.toDate().toISOString()
    : null;

  const response = { data, nextCursor };
  if (cache) {
    cache.set(cacheKey, response, CACHE_TTL);
  }

  return response;
};
