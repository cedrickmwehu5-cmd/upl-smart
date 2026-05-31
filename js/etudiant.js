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

    html5QrScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => {}
    )
    .catch(err =>
        alert("Erreur Caméra : " + err)
    );
}


function onScanSuccess(decodedText) {

    if (scanLock) return;

    scanLock = true;

    db.ref('active_session')
        .once('value', snap => {

            let coursTrouve = null;
            let sessionData = null;

            snap.forEach(child => {

                if (
                    child.val().token === decodedText
                ) {
                    coursTrouve = child.key;
                    sessionData = child.val();
                }
            });

            if (!coursTrouve) {
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