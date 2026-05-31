// --- LOGIQUE ETUDIANT ---

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

    const config = {
        fps: 10,
        qrbox: {
            width: 250,
            height: 250
        }
    };

    setScanStatus('Recherche de la caméra…');

    Html5Qrcode.getCameras()
        .then(cameras => {
            const cameraConfig =
                cameras && cameras.length
                    ? cameras[0].id
                    : { facingMode: "environment" };

            return html5QrScanner.start(
                cameraConfig,
                config,
                onScanSuccess,
                onScanError
            );
        })
        .catch(err => {
            console.warn('Camera selection failed, fallback to facingMode', err);
            return html5QrScanner.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanError
            );
        })
        .catch(err => {
            setScanStatus('Impossible d’accéder à la caméra : ' + (err.message || err), true);
            document.getElementById('btn-camera')
                .classList.remove('hidden');
            document.getElementById('reader')
                .classList.add('hidden');
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