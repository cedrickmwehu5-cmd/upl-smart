// --- LOGIQUE ETUDIANT ---

let currentFacingMode = 'environment';
let currentCameraId = null;

function getScanConfig() {
    return {
        fps: 10,
        qrbox: {
            width: 260,
            height: 260
        },
        aspectRatio: 1.333,
        disableFlip: false,
        videoConstraints: {
            facingMode: {
                exact: currentFacingMode
            }
        }
    };
}

async function resolvePreferredCameraId() {
    try {
        const cameras = await Html5Qrcode.getCameras();
        console.log('[QR] getCameras()', cameras);
        if (!cameras || cameras.length === 0) {
            return null;
        }
        const preferred = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[0];
        return preferred.deviceId || null;
    } catch (err) {
        console.warn('[QR] getCameras() failed', err);
        return null;
    }
}

function getCameraConfig() {
    if (currentCameraId) {
        return { deviceId: { exact: currentCameraId } };
    }

    return {
        facingMode: {
            exact: currentFacingMode
        }
    };
}

async function activerCamera() {

    const name =
        document.getElementById('s-name').value.trim();

    const mat =
        document.getElementById('s-mat').value.trim();

    if (!name || !mat)
        return alert("Remplis tes infos avant !");

    const readerElement = document.getElementById('reader');
    if (!readerElement) {
        console.error('[QR] Element reader introuvable');
        return alert('Erreur interne : élément de scan non trouvé.');
    }

    document.getElementById('btn-camera')
        .classList.add('hidden');

    readerElement.classList.remove('hidden');
    readerElement.style.minHeight = '260px';

    clearScanStatus();

    html5QrScanner =
        new Html5Qrcode("reader", true);

    setScanStatus('Recherche de la caméra…');
    console.log('[QR] activerCamera() currentFacingMode=', currentFacingMode);

    currentCameraId = await resolvePreferredCameraId();
    const cameraConfig = getCameraConfig();
    const scanConfig = getScanConfig();

    console.log('[QR] cameraConfig=', cameraConfig, 'scanConfig=', scanConfig, 'currentCameraId=', currentCameraId);

    html5QrScanner.start(
        cameraConfig,
        scanConfig,
        onScanSuccess,
        onScanError
    )
        .then(() => {
            showCameraToggle(true);
            setScanStatus('Caméra active, place le QR code dans le cadre.');
            console.log('[QR] Html5Qrcode.start() succeeded');
        })
        .catch(err => {
            console.error('[QR] Camera start failed', err);
            setScanStatus('Impossible d’accéder à la caméra : ' + (err.message || err), true);
            document.getElementById('btn-camera')
                .classList.remove('hidden');
            readerElement.classList.add('hidden');
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
    currentCameraId = null;
    updateToggleButtonText();

    if (!html5QrScanner) return;

    setScanStatus('Changement de caméra…');
    html5QrScanner.stop()
        .then(() => html5QrScanner.clear())
        .then(async () => {
            currentCameraId = await resolvePreferredCameraId();
            const cameraConfig = getCameraConfig();
            console.log('[QR] toggleCameraFacing() new config', cameraConfig, getScanConfig());
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
    console.warn('[QR] onScanError', errorMessage);
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


async function onScanSuccess(decodedText) {
    console.log('[QR] onScanSuccess', decodedText);
    const token = decodedText.trim();

    if (scanLock) {
        console.log('[QR] scanLock active, ignoring duplicate scan');
        return;
    }
    scanLock = true;

    if (html5QrScanner) {
        try {
            await html5QrScanner.stop();
        } catch (err) {
            console.warn('[QR] stop() failed after success', err);
        }
        try {
            await html5QrScanner.clear();
        } catch (err) {
            console.warn('[QR] clear() failed after success', err);
        }
    }

    setScanStatus('Validation en cours…');

    const promoEtudiant = document.getElementById('s-class').value;
    const matricule = document.getElementById('s-mat').value.trim();
    const nom = document.getElementById('s-name').value.trim();

    validatePresence(token, promoEtudiant, matricule, nom)
        .then(() => {
            setScanStatus('✅ Présence validée !');
            setTimeout(() => location.reload(), 1400);
        })
        .catch(err => {
            console.error('[QR] validatePresence failed', err);
            if (err.message === 'invalid_qr') {
                setScanStatus('QR Code expiré ou incorrect.', true);
                alert('QR Code expiré ou incorrect.');
            } else if (err.message === 'invalid_promo') {
                setScanStatus('Ce QR ne correspond pas à ta promotion.', true);
                alert('Ce QR ne correspond pas à ta promotion.');
            } else if (err.message === 'duplicate') {
                setScanStatus('Tu es déjà inscrit sur la liste.', true);
                alert('Tu es déjà inscrit sur la liste !');
            } else if (err.message === 'timeout') {
                setScanStatus('Temps dépassé. Réessaie, le réseau est lent.', true);
                alert('La validation a pris trop de temps. Réessaie.');
            } else {
                setScanStatus('Échec de l’inscription, vérifie ta connexion.', true);
                alert('Erreur de validation : vérifie ta connexion et réessaye.');
            }
            scanLock = false;
        });
}

function validatePresence(token, promoEtudiant, matricule, nom) {
    return db.ref('active_session')
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

            return coursTrouve;
        })
        .then(coursTrouve => {
            return db.ref('presences/' + coursTrouve)
                .orderByChild('matricule')
                .equalTo(matricule)
                .once('value')
                .then(check => {
                    if (check.exists()) {
                        throw new Error('duplicate');
                    }
                    return coursTrouve;
                });
        })
        .then(coursTrouve => valider(coursTrouve, nom, matricule, promoEtudiant));
}

function valider(coursId, nom, matricule, promo) {
    return withTimeout(
        db.ref('presences/' + coursId).push({
            nom: nom,
            matricule: matricule,
            promo: promo,
            heure: new Date().toLocaleTimeString('fr-FR')
        }),
        4000
    );
}