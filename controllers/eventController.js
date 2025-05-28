// controllers/eventController.js

const { db, admin } = require('../services/firebase');
const COLLECTION_EVENTS = 'nfc_events';
const COLLECTION_STATS  = 'stats_web';
const BATCH_LIMIT       = 500; // máximo por batch
const SAMPLE_RATE       = 0.1; // 10% de muestreo

/**
 * Inserta un lote de eventos con sampling inteligente y actualiza estadísticas agregadas.
 * @param {Array<Object>} events - Array de eventos con { id, uid, eventType, timestamp, page?, metadata?, source?, sessionId? }
 * @returns {Object} - { insertedCount: number }
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

  // 1) Guardar en nfc_events sólo los eventos críticos + muestra del resto
  const batch = db.batch();
  const recordedIds = new Set();

  events.forEach(evt => {
    if (!evt.id) return;
    const isCritical = evt.metadata?.critical === true;
    const passesSample = Math.random() < SAMPLE_RATE;

    if (isCritical || passesSample) {
      const ref = db.collection(COLLECTION_EVENTS).doc(evt.id);
      batch.set(ref, {
        ...evt,
        receivedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      recordedIds.add(evt.id);
    }
  });

  await batch.commit();

  // 2) Calcular estadísticas sólo de los eventos realmente guardados
  const statsMap = {};
  events.forEach(evt => {
    if (!evt.uid || !recordedIds.has(evt.id)) return;

    const { uid, eventType, timestamp, page, url, metadata, source = 'NFC', sessionId } = evt;
    if (!statsMap[uid]) {
      statsMap[uid] = {
        pageViews: 0,
        buttonClicks: 0,
        lastSeen: new Date(timestamp),
        lastPage: page || url || null,
        platform: metadata?.platform || 'unknown',
        source,
        lastSessionId: sessionId || null,
      };
    }

    if (eventType === 'pageView')  statsMap[uid].pageViews++;
    if (eventType === 'buttonClick') statsMap[uid].buttonClicks++;

    const evtTime = new Date(timestamp);
    if (evtTime > statsMap[uid].lastSeen) {
      statsMap[uid].lastSeen = evtTime;
      statsMap[uid].lastPage = page || url || statsMap[uid].lastPage;
      statsMap[uid].lastSessionId = sessionId || statsMap[uid].lastSessionId;
    }
  });

  // 3) Actualizar stats_web con incrementos y merge
  const updates = Object.entries(statsMap).map(([uid, agg]) => {
    const statsRef = db.collection(COLLECTION_STATS).doc(uid);
    const data = {
      lastSeen:      admin.firestore.Timestamp.fromDate(agg.lastSeen),
      lastPage:      agg.lastPage,
      platform:      agg.platform,
      source:        agg.source,
      lastSessionId: agg.lastSessionId,
      history:       admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.fromDate(agg.lastSeen))
    };
    if (agg.pageViews  > 0) data.pageViews   = admin.firestore.FieldValue.increment(agg.pageViews);
    if (agg.buttonClicks > 0) data.totalClicks = admin.firestore.FieldValue.increment(agg.buttonClicks);
    return statsRef.set(data, { merge: true });
  });

  await Promise.allSettled(updates);
  return { insertedCount: events.length };
};
