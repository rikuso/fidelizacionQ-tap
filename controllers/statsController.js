// controllers/statsController.js

const { db, admin } = require('../services/firebase');
const COLLECTION_STATS = 'stats_web';
const CACHE_TTL = 60; // en segundos

/**
 * Obtiene estadísticas básicas de un UID: token, lastSeen, pageViews, totalClicks, lastPage.
 * @param {string} uid - Identificador hexadecimal
 * @param {NodeCache} cache - Instancia de caché en memoria (opcional)
 * @returns {Object} - { token, lastSeen, pageViews, totalClicks, lastPage }
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

  const docRef = db.collection(COLLECTION_STATS).doc(uid);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    const err = new Error('Estadísticas no encontradas para UID');
    err.status = 404;
    throw err;
  }

  const data = snapshot.data();
  // Desestructurar todos los campos relevantes
  const {
    token,
    lastSeen,
    pageViews = 0,
    totalClicks = 0,
    lastPage = null
  } = data;

  // Manejo seguro de lastSeen (Timestamp o ISO string)
  let lastSeenDate;
  if (lastSeen && typeof lastSeen.toDate === 'function') {
    lastSeenDate = lastSeen.toDate();
  } else {
    lastSeenDate = new Date(lastSeen);
  }

  const result = {
    token,
    lastSeen: lastSeenDate.toISOString(),
    pageViews,
    totalClicks,
    lastPage
  };

  if (cache) cache.set(cacheKey, result, CACHE_TTL);
  return result;
};

/**
 * Lista estadísticas de todos los UIDs, paginadas.
 * @param {Object} params
 * @param {number} params.limit - máximo de ítems (1-500)
 * @param {string|null} params.startAfter - ISO timestamp para paginación
 * @param {NodeCache} cache - Instancia de caché en memoria (opcional)
 * @returns {Object} - { data: Array<{uid, token, lastSeen, pageViews, totalClicks, lastPage}>, nextCursor }
 */
exports.listAllStats = async ({ limit = 100, startAfter = null } = {}, cache) => {
  limit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

  const cacheKey = `stats:list:${limit}:${startAfter || 'init'}`;
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let query = db.collection(COLLECTION_STATS)
    .orderBy('lastSeen', 'desc')
    .limit(limit);

  if (startAfter) {
    const cursorDate = new Date(startAfter);
    if (isNaN(cursorDate)) {
      const err = new Error('startAfter debe ser fecha ISO válida');
      err.status = 400;
      throw err;
    }
    query = query.startAfter(admin.firestore.Timestamp.fromDate(cursorDate));
  }

  const snapshot = await query.get();
  const data = snapshot.docs.map(doc => {
    const d = doc.data();
    let dateVal;
    if (d.lastSeen && typeof d.lastSeen.toDate === 'function') {
      dateVal = d.lastSeen.toDate();
    } else {
      dateVal = new Date(d.lastSeen);
    }
    return {
      uid: doc.id,
      token: d.token,
      lastSeen: dateVal.toISOString(),
      pageViews: d.pageViews || 0,
      totalClicks: d.totalClicks || 0,
      lastPage: d.lastPage || null
    };
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastDoc
    ? (() => {
        const val = lastDoc.data().lastSeen;
        return typeof val.toDate === 'function'
          ? val.toDate().toISOString()
          : new Date(val).toISOString();
      })()
    : null;

  const response = { data, nextCursor };
  if (cache) cache.set(cacheKey, response, CACHE_TTL);
  return response;
};
