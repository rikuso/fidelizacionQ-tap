const admin = require('firebase-admin');
const serviceAccount = require('./../comida-736a2-firebase-adminsdk-jd3en-31dcd81178.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://comida-736a2.firebaseio.com"
});

const db = admin.firestore();
// Extraemos FieldValue
const FieldValue = admin.firestore.FieldValue;
module.exports = {
  db,
  FieldValue,
  admin
};
