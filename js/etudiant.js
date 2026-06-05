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

    const promoEtudiant = document.getElementById('s-class').value;
    const matricule = document.getElementById('s-mat').value.trim();
    const nom = document.getElementById('s-name').value.trim();

    console.log('[QR] token scanné', { token, promoEtudiant, matricule, nom });

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

    console.log('[QR] préparation validation', { token, promoEtudiant, matricule, nom });

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
            } else if (err.message === 'duplicate_entry') {
                setScanStatus('Tu as déjà enregistré ton entrée.', true);
                alert('Tu as déjà enregistré ton entrée.');
            } else if (err.message === 'missing_entry') {
                setScanStatus('Vous devez d\'abord enregistrer votre présence d\'entrée.', true);
                alert('Vous devez d\'abord enregistrer votre présence d\'entrée.');
            } else if (err.message === 'duplicate_exit') {
                setScanStatus('Tu as déjà enregistré ta sortie.', true);
                alert('Tu as déjà enregistré ta sortie.');
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
    console.log('[Firebase] validatePresence démarrée', { token, promoEtudiant, matricule });
    const activeSessionPath = 'active_session';
    console.log('[Firebase] lecture active_session', activeSessionPath);
    return db.ref(activeSessionPath)
        .once('value')
        .then(snap => {
            console.log('[Firebase] active_session snapshot reçu', snap.exists());
            let coursTrouve = null;
            let sessionData = null;

            snap.forEach(child => {
                if (child.val().token === token) {
                    coursTrouve = child.key;
                    sessionData = child.val();
                }
            });

            if (!coursTrouve) {
                console.warn('[Firebase] token introuvable dans active_session', token);
                throw new Error('invalid_qr');
            }

            if (sessionData.promo !== promoEtudiant) {
                console.warn('[Firebase] promo incorrecte', { attendu: sessionData.promo, reçu: promoEtudiant });
                throw new Error('invalid_promo');
            }

            const sessionType = sessionData.type || 'ENTREE';
            console.log('[Firebase] type de session récupéré', sessionType);

            return { coursTrouve, sessionType };
        })
        .then(({ coursTrouve, sessionType }) => {
            const presencesPath = 'presences/' + coursTrouve;
            console.log('[Firebase] lecture presences', { path: presencesPath, matricule, sessionType });
            return db.ref(presencesPath)
                .orderByChild('matricule')
                .equalTo(matricule)
                .once('value')
                .then(check => {
                    let foundEntry = false;
                    let foundExit = false;

                    check.forEach(child => {
                        const item = child.val();
                        if (item.type === 'ENTREE') {
                            foundEntry = true;
                        }
                        if (item.type === 'SORTIE') {
                            foundExit = true;
                        }
                    });

                    if (sessionType === 'ENTREE') {
                        if (foundEntry) {
                            console.warn('[Firebase] tentative d\'entrée en double', matricule);
                            throw new Error('duplicate_entry');
                        }
                    } else if (sessionType === 'SORTIE') {
                        if (!foundEntry) {
                            console.warn('[Firebase] sortie sans entrée', matricule);
                            throw new Error('missing_entry');
                        }
                        if (foundExit) {
                            console.warn('[Firebase] tentative de sortie en double', matricule);
                            throw new Error('duplicate_exit');
                        }
                    }

                    return { coursTrouve, sessionType };
                });
        })
        .then(({ coursTrouve, sessionType }) => valider(coursTrouve, nom, matricule, promoEtudiant, sessionType));
}

function valider(coursId, nom, matricule, promo, type) {
    const presencesPath = 'presences/' + coursId;
    const payload = {
        nom: nom,
        matricule: matricule,
        promo: promo,
        type: type,
        heure: new Date().toLocaleTimeString('fr-FR')
    };
    console.log('[Firebase] écriture présence', { path: presencesPath, payload });
    return withTimeout(
        db.ref(presencesPath).push(payload).then(ref => {
            console.log('[Firebase] présence enregistrée', { coursId, key: ref.key, type: type });
            return ref;
        }),
        4000
    );
}