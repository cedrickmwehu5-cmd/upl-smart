// --- LOGIQUE ETUDIANT ---

let currentFacingMode = 'environment';
let currentCameraId = null;

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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

function loadStudentPromotions() {
    console.log('[PROMOS] Chargement...');

    const select = document.getElementById('s-class');
    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Chargement…</option>';

    db.ref('enseignants')
        .once('value')
        .then(snapshot => {
            const promotions = [];

            if (snapshot && snapshot.exists()) {
                snapshot.forEach(child => {
                    const teacherData = child.val() || {};
                    promotions.push(...normalizeList(teacherData.promotions));
                });
            }

            console.log('[PROMOS] Promotions trouvées :', promotions);

            const uniquePromotions = promotions
                .map(item => String(item).trim())
                .filter(Boolean)
                .filter((promo, index, list) => list.findIndex(item => item.toLowerCase() === promo.toLowerCase()) === index);

            console.log('[PROMOS] Liste finale :', uniquePromotions);

            select.innerHTML = '';

            if (uniquePromotions.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Aucune promotion disponible';
                select.appendChild(option);
                return;
            }

            uniquePromotions.forEach(promo => {
                const option = document.createElement('option');
                option.value = promo;
                option.textContent = promo;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('[PROMOS] Erreur de chargement des promotions', error);
            select.innerHTML = '<option value="">Aucune promotion disponible</option>';
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

function getOrCreateDeviceId() {
    const DEVICE_ID_KEY = 'upl-smart-device-id';

    try {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);

        if (!deviceId) {
            deviceId = 'upl-' + (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'device-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }

        console.log('[SECURITY] deviceId', deviceId);
        return deviceId;
    } catch (err) {
        const fallbackDeviceId = 'upl-device-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        console.warn('[SECURITY] localStorage indisponible, fallback deviceId', fallbackDeviceId, err);
        return fallbackDeviceId;
    }
}

function getSessionDeviceStorageKey(coursId, sessionToken) {
    return 'upl-smart-session-used:' + String(coursId || 'cours') + ':' + String(sessionToken || 'token');
}

function hasDeviceAlreadyBeenUsedForSession(coursId, sessionToken) {
    try {
        return localStorage.getItem(getSessionDeviceStorageKey(coursId, sessionToken)) === '1';
    } catch (err) {
        console.warn('[SECURITY] impossible de lire le marqueur local', err);
        return false;
    }
}

function markDeviceAsUsedForSession(coursId, sessionToken) {
    try {
        localStorage.setItem(getSessionDeviceStorageKey(coursId, sessionToken), '1');
    } catch (err) {
        console.warn('[SECURITY] impossible d’écrire le marqueur local', err);
    }
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
            } else if (err.message === 'device_conflict') {
                setScanStatus('Cet appareil a déjà été utilisé pour une présence durant cette session.', true);
                alert('Cet appareil a déjà été utilisé pour une présence durant cette session.');
            } else if (err.message === 'device_already_used') {
                setScanStatus('Une présence a déjà été enregistrée depuis cet appareil pour cette session.', true);
                alert('Une présence a déjà été enregistrée depuis cet appareil pour cette session.');
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
    const dateJour = getTodayDate();
    const deviceId = getOrCreateDeviceId();

    console.log('[Presence] Date active :', dateJour);
    console.log('[Firebase] validatePresence démarrée', { token, promoEtudiant, matricule });
    console.log('[SECURITY] deviceId', deviceId);
    console.log('[SECURITY] matricule', matricule);
    console.log('[SECURITY] sessionToken', token);

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

            if (hasDeviceAlreadyBeenUsedForSession(coursTrouve, token)) {
                console.warn('[SECURITY] présence refusée (marqueur local)', { deviceId, matricule, sessionToken: token, cours: coursTrouve });
                throw new Error('device_already_used');
            }

            return { coursTrouve, sessionType, dateJour, sessionData, deviceId };
        })
        .then(({ coursTrouve, sessionType, dateJour, sessionData, deviceId }) => {
            const sessionDevicesPath = 'session_devices/' + coursTrouve + '/' + token;
            console.log('[Firebase] Lecture sécurité :', sessionDevicesPath);

            return db.ref(sessionDevicesPath)
                .once('value')
                .then(sessionDeviceSnap => {
                    const existingRecord = sessionDeviceSnap.child(deviceId).val();

                    if (existingRecord) {
                        console.warn('[SECURITY] présence refusée (enregistrement existant)', {
                            deviceId,
                            matricule,
                            storedMatricule: existingRecord.matricule,
                            sessionToken: token,
                            cours: coursTrouve
                        });

                        if (String(existingRecord.matricule).toLowerCase() !== String(matricule).toLowerCase()) {
                            throw new Error('device_conflict');
                        }

                        throw new Error('device_already_used');
                    }

                    return { coursTrouve, sessionType, dateJour, sessionData, deviceId };
                });
        })
        .then(({ coursTrouve, sessionType, dateJour, deviceId }) => {
            const presencesPath = 'presences/' + coursTrouve + '/' + dateJour;
            console.log('[Firebase] Lecture :', presencesPath);
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

                    return { coursTrouve, sessionType, deviceId, token };
                });
        })
        .then(({ coursTrouve, sessionType, deviceId, token: sessionToken }) => {
            console.log('[SECURITY] présence autorisée', { deviceId, matricule, sessionToken, cours: coursTrouve });
            return valider(coursTrouve, nom, matricule, promoEtudiant, sessionType, sessionToken, deviceId);
        });
}

function valider(coursId, nom, matricule, promo, type, sessionToken, deviceId) {
    const dateJour = getTodayDate();
    const presencesPath = 'presences/' + coursId + '/' + dateJour;
    const securityPath = 'session_devices/' + coursId + '/' + sessionToken + '/' + deviceId;
    const payload = {
        nom: nom,
        matricule: matricule,
        promo: promo,
        date: dateJour,
        type: type,
        heure: new Date().toLocaleTimeString('fr-FR')
    };
    const securityPayload = {
        deviceId: deviceId,
        matricule: matricule,
        sessionToken: sessionToken,
        cours: coursId,
        heure: new Date().toLocaleTimeString('fr-FR')
    };

    console.log('[Firebase] Écriture :', presencesPath, payload);
    console.log('[SECURITY] session device record', securityPath, securityPayload);

    return withTimeout(
        db.ref(presencesPath)
            .push(payload)
            .then(ref => db.ref(securityPath).set(securityPayload).then(() => ref))
            .then(ref => {
                markDeviceAsUsedForSession(coursId, sessionToken);
                console.log('[Firebase] présence enregistrée', { coursId, key: ref.key, type: type });
                console.log('[SECURITY] présence autorisée', { deviceId, matricule, sessionToken, cours: coursId });
                return ref;
            }),
        4000
    );
}