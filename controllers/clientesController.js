// controllers/clientesController.js

const { db, admin } = require('../services/firebase');
const COLLECTION = 'clientes';

/**
 * Crea o actualiza un cliente en Firestore.
 * @param {Object} data - { uid, nombre, telefono, email? }
 * @returns {Object} - Datos registrados del cliente
 * @throws {Error} - Error con status en caso de fallo
 */
exports.registrarCliente = async ({ uid, nombre, telefono, email = null }) => {
  if (!uid || !nombre || !telefono) {
    const err = new Error('Faltan datos obligatorios: uid, nombre o telefono');
    err.status = 400;
    throw err;
  }

  const now = admin.firestore.Timestamp.now();
  const docRef = db.collection(COLLECTION).doc(uid);

  const dataToSave = {
    uid,
    nombre,
    telefono,
    email,
    activo: true,
    actualizado: now,
    creado: admin.firestore.FieldValue.serverTimestamp()
  };

  await docRef.set(dataToSave, { merge: true });

  // Convertir timestamps a ISO
  return {
    uid,
    nombre,
    telefono,
    email,
    activo: true,
    actualizado: now.toDate().toISOString(),
    creado: now.toDate().toISOString()
  };
};

/**
 * Obtiene un cliente por UID.
 * @param {string} uid
 * @returns {Object|null} - Datos del cliente o null si no existe
 * @throws {Error} - Error con status 400 si falta uid
 */
exports.getCliente = async (uid) => {
  if (!uid) {
    const err = new Error('UID es requerido');
    err.status = 400;
    throw err;
  }

  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    ...data,
    actualizado: data.actualizado.toDate().toISOString(),
    creado:      data.creado.toDate().toISOString()
  };
};

/**
 * Lista todos los clientes con paginación.
 * @param {Object} params - { limit: number, startAfter: string (ISO) }
 * @returns {Object} - { data: Array, nextCursor: string|null }
 */
exports.getAllClientes = async ({ limit = 100, startAfter = null } = {}) => {
  limit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

  let query = db.collection(COLLECTION)
    .orderBy('actualizado', 'desc')
    .limit(limit);

  if (startAfter) {
    const cursor = new Date(startAfter);
    if (isNaN(cursor)) {
      const err = new Error('startAfter debe ser fecha ISO válida');
      err.status = 400;
      throw err;
    }
    query = query.startAfter(admin.firestore.Timestamp.fromDate(cursor));
  }

  const snapshot = await query.get();
  const clients = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      ...d,
      actualizado: d.actualizado.toDate().toISOString(),
      creado:      d.creado.toDate().toISOString()
    };
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastDoc
    ? lastDoc.data().actualizado.toDate().toISOString()
    : null;

  return { data: clients, nextCursor };
};
