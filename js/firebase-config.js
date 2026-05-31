// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDPWfmUGOHOXA7MECD_DpvrSTrGAKhMW5E",
    databaseURL: "https://ijc-impact-default-rtdb.firebaseio.com",
    projectId: "ijc-impact",
    appId: "1:617988549247:web:8851febad9bcdb416ced4a"
};

// Initialisation
firebase.initializeApp(firebaseConfig);
const db = firebase.database();