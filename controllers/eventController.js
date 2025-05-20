// controllers/eventController.js

const { db, admin } = require('../services/firebase');
const COLLECTION_EVENTS = 'nfc_events';
const COLLECTION_STATS  = 'stats_web';
const BATCH_LIMIT       = 500; // máximo por batch

/**
 * Inserta un lote de eventos y actualiza estadísticas en stats_web.
 * @param {Array<Object>} events - Array de eventos con { id, uid, eventType, timestamp, page?, metadata?, source?, sessionId? }
 * @returns {Object} - { insertedCount: number }
 * @throws {Error} - Error con status y message
 */
exports.batchInsert = async (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    const err = new Error('No hay eventos para procesar');
    err.status = 400;
    throw err;
  }
  if (events.length > BATCH_LIMIT) {
    const err = new Error(`Batch excede el límite de ${BATCH_LIMIT} eventos`);
    err.status = 400;
    throw err;
  }

  // Preparar batch de Firestore
  const batch = db.batch();
  events.forEach(evt => {
    if (!evt.id) return; // omitimos si falta id
    const ref = db.collection(COLLECTION_EVENTS).doc(evt.id);
    batch.set(ref, {
      ...evt,
      receivedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  // Ejecutar batch
  await batch.commit();

  // Actualizar stats_web en paralelo
  const updates = events
    .filter(evt => evt.uid)
    .map(evt => {
      const statsRef = db.collection(COLLECTION_STATS).doc(evt.uid);
      const isPV = evt.eventType === 'pageView';
      const isBC = evt.eventType === 'buttonClick';
      const data = {
        lastSeen:      admin.firestore.Timestamp.fromDate(new Date(evt.timestamp)),
        lastPage:      evt.page || evt.url || null,
        platform:      evt.metadata?.platform || 'unknown',
        source:        evt.source || 'NFC',
        lastSessionId: evt.sessionId || null,
        history:       admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.fromDate(new Date(evt.timestamp)))
      };
      if (isPV) data.pageViews = admin.firestore.FieldValue.increment(1);
      if (isBC) data.totalClicks = admin.firestore.FieldValue.increment(1);
      // merge para no sobreescribir
      return statsRef.set(data, { merge: true });
    });

  // No bloqueamos si algún update falla
  await Promise.allSettled(updates);

  return { insertedCount: events.length };
};
