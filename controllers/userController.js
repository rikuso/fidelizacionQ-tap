// controllers/userController.js
const { db } = require('../services/firebase');

const COLLECTIONS = {
  TAGS: 'uids',
  STATS: 'stats_web',
  CLIENTS: 'clientes'
};

/**
 * Obtiene datos compuestos de un usuario/UID:
 * - Datos físicos (uids)
 * - Estadísticas web (stats_web)
 * - Información de cliente (clientes)
 *
 * @param {string} uid - Identificador hexadecimal de la tarjeta/usuario
 * @returns {Object} - Objeto con { uid, cliente, fisico, digital }
 * @throws {Error} - Error con status 404 si no existen datos
 */
exports.getUsuarioByUID = async (uid) => {
  if (!uid) {
    const err = new Error('UID es requerido');
    err.status = 400;
    throw err;
  }

  // Consultas paralelas a Firestore
  const [tagSnap, webSnap, clientSnap] = await Promise.all([
    db.collection(COLLECTIONS.TAGS).doc(uid).get(),
    db.collection(COLLECTIONS.STATS).doc(uid).get(),
    db.collection(COLLECTIONS.CLIENTS).doc(uid).get()
  ]);

  const fisico      = tagSnap.exists    ? tagSnap.data()    : null;
  const digital     = webSnap.exists    ? webSnap.data()    : null;
  const clienteInfo = clientSnap.exists ? clientSnap.data() : null;

  if (!fisico && !digital && !clienteInfo) {
    const err = new Error('UID no encontrado en ninguna colección');
    err.status = 404;
    throw err;
  }

  return {
    uid,
    cliente: clienteInfo || {},
    fisico:  fisico      || {},
    digital: digital     || {}
  };
};
