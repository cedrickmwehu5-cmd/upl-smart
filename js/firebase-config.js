// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyALvtLVCcbGwHR7-9uPitfJ5AJLCb787tc",
    authDomain: "upl-smart.firebaseapp.com",
    databaseURL: "https://upl-smart-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "upl-smart",
    storageBucket: "upl-smart.firebasestorage.app",
    messagingSenderId: "898358584868",
    appId: "1:898358584868:web:dcb7597cb638c56c0dab1"
};

// Initialisation
console.log('[Firebase] Configuration détectée :', firebaseConfig);
console.log('[Firebase] Démarrage de firebase.initializeApp()');
firebase.initializeApp(firebaseConfig);
console.log('[Firebase] firebase.initializeApp() appelé avec succès');

const db = firebase.database();
console.log('[Firebase] Instance Realtime Database créée :', db ? 'OK' : 'KO');

// Test d'écriture simple pour vérifier la connexion et l'autorisation
if (db && db.ref) {
  db.ref('test').set({
      message: 'Connexion OK'
    })
    .then(() => {
      console.log('✅ Écriture Firebase OK');
    })
    .catch((error) => {
      console.error('❌ Erreur Firebase :', error);
    });

  // Vérification de la connexion à Realtime Database
  db.ref('.info/connected').once('value')
    .then(snapshot => {
      console.log('[Firebase] Realtime Database connectée :', snapshot.val());
    })
    .catch(err => {
      console.error('[Firebase] Erreur de connexion Realtime Database :', err);
    });
} else {
  console.error('[Firebase] Impossible d\'initialiser Realtime Database.');
}
