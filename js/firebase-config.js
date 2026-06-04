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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Vérification de la connexion à Realtime Database
if (db && db.ref) {
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
