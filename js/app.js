// Variables globales
let qrInterval = null;
let html5QrScanner = null;
let scanLock = false;

// Démarrage application
document.addEventListener('DOMContentLoaded', () => {
    showView('view-home');
    loadStudentPromotions();
});