// --- LOGIQUE ETUDIANT ---

let currentFacingMode = 'environment';
let currentCameraId = null;

function getScanConfig() {
    return {
        fps: 25,
        qrbox: {
            width: 300,
            height: 300
        },
        videoConstraints: {
            facingMode: currentFacingMode
        }
    };
}

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

    const cameraConfig = { facingMode: 'environment' };
    currentCameraId = null;

    html5QrScanner.start(
        cameraConfig,
        getScanConfig(),
        onScanSuccess,
        onScanError
    )
        .then(() => {
            showCameraToggle(true);
        })
        .catch(err => {
            console.warn('Camera start failed', err);
            setScanStatus('Impossible d’accéder à la caméra : ' + (err.message || err), true);
            document.getElementById('btn-camera')
                .classList.remove('hidden');
            document.getElementById('reader')
                .classList.add('hidden');
            showCameraToggle(false);
        });
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
        .then(() => {
            const cameraConfig = { facingMode: currentFacingMode };
            return html5QrScanner.start(
                cameraConfig,
                getScanConfig(),
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
}

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('timeout'));
        }, ms);

        promise
            .then(value => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}


function onScanSuccess(decodedText) {
    const token = decodedText.trim();

    if (scanLock) return;

    scanLock = true;
    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
    }
    setScanStatus('QR détecté, validation en cours...');

    const promoEtudiant = document.getElementById('s-class').value;
    const matricule = document.getElementById('s-mat').value.trim();

    db.ref('active_session')
        .once('value')
        .then(snap => {
            let coursTrouve = null;
            let sessionData = null;

            snap.forEach(child => {
                if (child.val().token === token) {
                    coursTrouve = child.key;
                    sessionData = child.val();
                }
            });

            if (!coursTrouve) {
                throw new Error('invalid_qr');
            }

            if (sessionData.promo !== promoEtudiant) {
                throw new Error('invalid_promo');
            }

            return db.ref('presences/' + coursTrouve)
                .orderByChild('matricule')
                .equalTo(matricule)
                .once('value')
                .then(check => ({ coursTrouve, check }));
        })
        .then(({ coursTrouve, check }) => {
            if (check.exists()) {
                throw new Error('duplicate');
            }
            return valider(coursTrouve);
        })
        .then(() => {
            setScanStatus('✅ Présence validée !');
            setTimeout(() => location.reload(), 1200);
        })
        .catch(err => {
            if (err.message === 'invalid_qr') {
                setScanStatus('QR Code expiré ou incorrect.', true);
                alert('QR Code expiré ou incorrect.');
            } else if (err.message === 'invalid_promo') {
                setScanStatus('Ce QR ne correspond pas à ta promotion.', true);
                alert('Ce QR ne correspond pas à ta promotion.');
            } else if (err.message === 'duplicate') {
                alert('Tu es déjà inscrit sur la liste !');
                location.reload();
                return;
            } else if (err.message === 'timeout') {
                setScanStatus('Temps dépassé. Réessaie, le réseau est lent.', true);
                alert('La validation a pris trop de temps. Réessaie.');
            } else {
                console.error('Validation failed:', err);
                setScanStatus('Échec de l’inscription, vérifie ta connexion.', true);
                alert('Erreur de validation : vérifie ta connexion et réessaye.');
            }
            scanLock = false;
        });
}


function valider(coursId) {
    return withTimeout(
        db.ref('presences/' + coursId).push({

        nom:
            document.getElementById('s-name').value,

        matricule:
            document.getElementById('s-mat').value,

        promo:
            document.getElementById('s-class').value,

        heure:
            new Date()
                .toLocaleTimeString('fr-FR')
        }),
        4000
    );
}