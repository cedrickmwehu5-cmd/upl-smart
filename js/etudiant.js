// --- LOGIQUE ETUDIANT ---

let currentFacingMode = 'environment';
let currentCameraId = null;
const scanConfig = {
    fps: 10,
    qrbox: {
        width: 250,
        height: 250
    }
};

function activerCamera() {

    const name =
        document.getElementById('s-name').value.trim();

    const mat =
        document.getElementById('s-mat').value.trim();

    if (!name || !mat)
        return alert("Remplis tes infos avant !");

    document.getElementById('btn-camera')
        .classList.add('hidden');

    document.getElementById('reader')
        .classList.remove('hidden');

    html5QrScanner =
        new Html5Qrcode("reader");

    setScanStatus('Recherche de la caméra…');

    Html5Qrcode.getCameras()
        .then(cameras => {
            currentCameraId = null;
            const cameraConfig = pickCameraConfig(cameras, currentFacingMode);
            if (typeof cameraConfig === 'string') {
                currentCameraId = cameraConfig;
            }
            return html5QrScanner.start(
                cameraConfig,
                scanConfig,
                onScanSuccess,
                onScanError
            );
        })
        .catch(err => {
            console.warn('Camera selection failed, fallback to facingMode', err);
            currentCameraId = null;
            return html5QrScanner.start(
                { facingMode: currentFacingMode },
                scanConfig,
                onScanSuccess,
                onScanError
            );
        })
        .then(() => {
            showCameraToggle(true);
        })
        .catch(err => {
            setScanStatus('Impossible d’accéder à la caméra : ' + (err.message || err), true);
            document.getElementById('btn-camera')
                .classList.remove('hidden');
            document.getElementById('reader')
                .classList.add('hidden');
            showCameraToggle(false);
        });
}

function pickCameraConfig(cameras, facingMode) {
    const fallback = { facingMode };

    if (!cameras || !cameras.length) {
        return fallback;
    }

    const isBack = facingMode === 'environment';
    const preferredRegex = isBack
        ? /back|rear|arrière|environment/i
        : /front|user|selfie|avant/i;

    const match = cameras.find(c => preferredRegex.test(c.label || c.id || ''));
    if (match && match.id) {
        return match.id;
    }

    if (isBack) {
        return cameras[cameras.length - 1].id || fallback;
    }

    return cameras[0].id || fallback;
}

function showCameraToggle(show) {
    const toggle = document.getElementById('btn-toggle-camera');
    if (!toggle) return;

    if (show) {
        toggle.classList.remove('hidden');
        updateToggleButtonText();
    } else {
        toggle.classList.add('hidden');
    }
}

function updateToggleButtonText() {
    const toggle = document.getElementById('btn-toggle-camera');
    if (!toggle) return;

    toggle.innerHTML = currentFacingMode === 'environment'
        ? '<i class="fas fa-camera"></i> Caméra arrière'
        : '<i class="fas fa-camera"></i> Caméra avant';
}


function toggleCameraFacing() {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    updateToggleButtonText();

    if (!html5QrScanner) return;

    setScanStatus('Changement de caméra…');
    html5QrScanner.stop()
        .then(() => html5QrScanner.clear())
        .then(() => Html5Qrcode.getCameras())
        .then(cameras => {
            currentCameraId = null;
            const cameraConfig = pickCameraConfig(cameras, currentFacingMode);
            if (typeof cameraConfig === 'string') {
                currentCameraId = cameraConfig;
            }
            return html5QrScanner.start(
                cameraConfig,
                scanConfig,
                onScanSuccess,
                onScanError
            );
        })
        .then(() => setScanStatus('Caméra changée, scannez le QR code...'))
        .catch(err => {
            console.warn('Erreur de bascule caméra', err);
            setScanStatus('Impossible de changer de caméra.', true);
        });
}

function setScanStatus(message, isError = false) {
    const status = document.getElementById('scan-status');
    status.textContent = message;
    status.classList.remove('hidden', 'error');
    if (isError) {
        status.classList.add('error');
    }
}


function clearScanStatus() {
    const status = document.getElementById('scan-status');
    status.textContent = '';
    status.classList.add('hidden');
}


function onScanError(errorMessage) {
    console.debug('QR scan error:', errorMessage);
    setScanStatus('Lecture impossible, oriente mieux l’appareil vers le QR code.', true);
}


function onScanSuccess(decodedText) {
    const token = decodedText.trim();

    if (scanLock) return;

    setScanStatus('QR détecté, validation en cours...');
    scanLock = true;

    db.ref('active_session')
        .once('value', snap => {

            let coursTrouve = null;
            let sessionData = null;

            snap.forEach(child => {

                if (
                    child.val().token === token
                ) {
                    coursTrouve = child.key;
                    sessionData = child.val();
                }
            });

            if (!coursTrouve) {
                setScanStatus("QR Code expiré ou incorrect.", true);
                alert("QR Code expiré ou incorrect.");
                scanLock = false;
                return;
            }

            const promoEtudiant =
                document.getElementById('s-class').value;

            // Vérification promotion
            if (
                sessionData.promo !== promoEtudiant
            ) {
                alert(
                    "Ce QR ne correspond pas à ta promotion."
                );

                scanLock = false;
                return;
            }

            const matricule =
                document.getElementById('s-mat')
                    .value.trim();

            // Vérifier doublon
            db.ref(
                'presences/' + coursTrouve
            )
            .orderByChild('matricule')
            .equalTo(matricule)
            .once('value', check => {

                if (check.exists()) {

                    alert(
                        "Tu es déjà inscrit sur la liste !"
                    );

                    location.reload();

                } else {

                    valider(coursTrouve);
                }
            });
        });
}


function valider(coursId) {

    db.ref(
        'presences/' + coursId
    )
    .push({

        nom:
            document.getElementById('s-name').value,

        matricule:
            document.getElementById('s-mat').value,

        promo:
            document.getElementById('s-class').value,

        heure:
            new Date()
                .toLocaleTimeString('fr-FR')

    })
    .then(() => {

        html5QrScanner
            .stop()
            .then(() => {

                html5QrScanner.clear();

                alert(
                    "✅ Présence validée !"
                );

                location.reload();

            })
            .catch(() =>
                location.reload()
            );
    });
}