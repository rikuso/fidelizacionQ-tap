// controllers/advancedStatsController.js

const { db, admin } = require('../services/firebase');
const COLLECTION_EVENTS = 'nfc_events';
const COLLECTION_STATS  = 'stats_web';
const COLLECTION_CLIENTS = 'clientes';

/**
 * Formatea una fecha ISO para obtener YYYY-MM-DD
 */
const formatDay = (ts) => {
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toISOString().split('T')[0];
};

/**
 * 1. Conteo de escaneos NFC diarios (eventType === 'nfcScan')
 */
exports.getDailyScans = async () => {
  const snapshot = await db.collection(COLLECTION_EVENTS)
    .where('eventType', '==', 'nfcScan')
    .get();

  const counts = {};
  snapshot.forEach(doc => {
    const { timestamp } = doc.data();
    const day = formatDay(timestamp);
    counts[day] = (counts[day] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([date, scans]) => ({ date, scans }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * 2. Página vistas y clicks diarios en últimos `days` días
 * @param {number} days
 */
exports.getDailyWeb = async (days = 30) => {
  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - days * 24 * 3600 * 1000)
  );
  const snapshot = await db.collection(COLLECTION_EVENTS)
    .where('timestamp', '>=', cutoff)
    .get();

  const counts = {};
  snapshot.forEach(doc => {
    const { eventType, timestamp } = doc.data();
    const day = formatDay(timestamp);
    counts[day] = counts[day] || { pageViews: 0, clicks: 0 };
    if (eventType === 'pageView') counts[day].pageViews++;
    if (eventType === 'buttonClick') counts[day].clicks++;
  });

  return Object.entries(counts)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * 3. Distribución horaria de eventos web en últimos `days` días
 */
exports.getHourlyDistribution = async (days = 30) => {
  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - days * 24 * 3600 * 1000)
  );
  const snapshot = await db.collection(COLLECTION_EVENTS)
    .where('timestamp', '>=', cutoff)
    .get();

  const hours = Array(24).fill(0);
  snapshot.forEach(doc => {
    const date = doc.data().timestamp.toDate();
    hours[date.getHours()]++;
  });

  return hours.map((count, hour) => ({ hour, count }));
};

/**
 * 4. Tasa de conversión: registros / pageViews
 */
exports.getConversionRate = async () => {
  const snapStats = await db.collection(COLLECTION_STATS).get();
  const totalPageViews = snapStats.docs.reduce(
    (sum, d) => sum + (d.data().pageViews || 0), 0
  );

  const snapClients = await db.collection(COLLECTION_CLIENTS)
    .where('activo', '==', true)
    .get();
  const registrations = snapClients.size;

  const rate = totalPageViews ? registrations / totalPageViews : 0;
  return { pageViews: totalPageViews, registrations, rate };
};

/**
 * 5. Retención: días desde firstSeen agrupados
 */
exports.getRetention = async () => {
  const snap = await db.collection(COLLECTION_STATS).get();
  const today = Date.now();
  const counts = {};

  snap.forEach(d => {
    const first = d.data().firstSeen?.toDate?.().getTime();
    if (first) {
      const daysSince = Math.floor((today - first) / (86400000));
      counts[daysSince] = (counts[daysSince] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([days, users]) => ({ daysSinceFirst: Number(days), users }))
    .sort((a, b) => a.daysSinceFirst - b.daysSinceFirst);
};

/**
 * 6. Ubicaciones (metadata.city) más frecuentes
 */
exports.getLocations = async (limit = 10) => {
  const snap = await db.collection(COLLECTION_EVENTS).get();
  const counts = {};
  snap.forEach(d => {
    const city = d.data().metadata?.city || 'unknown';
    counts[city] = (counts[city] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * 7. Funnel de conversión simple
 */
exports.getFunnel = async () => {
  const snap = await db.collection(COLLECTION_EVENTS).get();
  const steps = { pageView: 0, formSubmit: 0, signup: 0 };
  snap.forEach(d => {
    const et = d.data().eventType;
    if (steps[et] !== undefined) steps[et]++;
  });
  return Object.entries(steps).map(([step, count]) => ({ step, count }));
};

/**
 * 8. Historial de un usuario (últimos `limit` eventos)
 */
exports.getUserHistory = async (uid, limit = 50) => {
  if (!uid) throw new Error('UID es requerido');
  const snap = await db.collection(COLLECTION_EVENTS)
    .where('uid', '==', uid)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => d.data());
};

/**
 * 9. Eventos recientes (últimos `limit`)
 */
exports.getRecentEvents = async (limit = 50) => {
  const snap = await db.collection(COLLECTION_EVENTS)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => d.data());
};

/**
 * 10. Usuarios web activos en últimos `days` días
 */
exports.getActiveUsers = async (days = 7) => {
  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - days * 24 * 3600 * 1000)
  );
  const snap = await db.collection(COLLECTION_STATS)
    .where('lastSeen', '>', cutoff)
    .get();
  return { days, activeUsers: snap.size };
};
