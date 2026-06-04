// --- LOGIQUE PROFESSEUR ---

function ouvrirSession() {

    const rawCours =
        document.getElementById('p-cours').value.trim();

    const promo =
        document.getElementById('p-class').value;

    if (!rawCours)
        return alert("Nom du cours requis");

    // Nettoyage Firebase
    const cours =
        rawCours.replace(/[.#$[\]/]/g, '_');

    document.getElementById('dash-title')
        .innerText = rawCours;

    console.log('[Session] ouvrirSession', { cours, promo });

    showView('view-prof-dash');

    // QR initial
    refreshQR(cours, promo);

    // Ne pas tourner le QR automatiquement : le token doit rester valide pendant la validation.
    qrInterval = null;

    // Présences temps réel
    const presencesPath = 'presences/' + cours;
    console.log('[Firebase] lecture temps réel presences', presencesPath);
    db.ref(presencesPath)
        .on('value', snap => {

            const body =
                document.getElementById('presence-body');

            body.innerHTML = "";

            snap.forEach(child => {

                const s = child.val();

                // Protection XSS
                const tr =
                    document.createElement('tr');

                const tdInfo =
                    document.createElement('td');

                const nom =
                    document.createElement('b');

                nom.textContent = s.nom;

                const br =
                    document.createElement('br');

                const mat =
                    document.createElement('small');

                mat.textContent = s.matricule;

                tdInfo.appendChild(nom);
                tdInfo.appendChild(br);
                tdInfo.appendChild(mat);

                const tdHeure =
                    document.createElement('td');

                tdHeure.style.textAlign = 'right';
                tdHeure.textContent = s.heure;

                tr.appendChild(tdInfo);
                tr.appendChild(tdHeure);

                body.appendChild(tr);
            });
        });
}


function refreshQR(cours, promo) {

    const token =
        Math.random()
            .toString(36)
            .substr(2, 6)
            .toUpperCase();

    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = "";

    const availableWidth = qrcodeContainer.clientWidth || Math.min(window.innerWidth * 0.8, 700);
    const size = Math.max(220, Math.min(availableWidth, 700));

    new QRCode(
        qrcodeContainer,
        {
            text: token,
            width: size,
            height: size,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        }
    );

    document.getElementById('qr-info')
        .innerText =
        "TOKEN ACTIF : " + token;

    const activeSessionPath = 'active_session/' + cours;
    const sessionPayload = { token: token, promo: promo };

    console.log('[Firebase] écriture active_session', { path: activeSessionPath, payload: sessionPayload });

    db.ref(activeSessionPath)
        .set(sessionPayload)
        .then(() => {
            console.log('[Firebase] session active créée', { cours, promo, token });
        })
        .catch(err => {
            console.error('[Firebase] impossible de créer la session active', err, { cours, promo, token });
            alert('Impossible de créer la session. Vérifiez les règles de sécurité.');
        });
}


function telechargerExcel() {

    const rawCours =
        document.getElementById('dash-title')
            .innerText;

    const cours =
        rawCours.replace(/[.#$[\]/]/g, '_');

    const presencesPath = 'presences/' + cours;
    console.log('[Firebase] lecture export Excel', presencesPath);
    db.ref(presencesPath)
        .once('value', snap => {

            let data = [];

            snap.forEach(c =>
                data.push(c.val())
            );

            const ws =
                XLSX.utils.json_to_sheet(data);

            const wb =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                wb,
                ws,
                "Présences"
            );

            XLSX.writeFile(
                wb,
                `Liste_${rawCours}.xlsx`
            );
        });
}


function fermerSession() {

    if (!confirm(
        "Clôturer et effacer les données de cette séance ?"
    )) return;

    const rawCours =
        document.getElementById('dash-title')
            .innerText;

    const cours =
        rawCours.replace(/[.#$[\]/]/g, '_');

    clearInterval(qrInterval);

    const activeSessionPath = 'active_session/' + cours;
    const presencesPath = 'presences/' + cours;
    console.log('[Firebase] suppression session active', activeSessionPath);
    db.ref(activeSessionPath)
        .remove();

    console.log('[Firebase] suppression presences', presencesPath);
    db.ref(presencesPath)
        .remove();

    location.reload();
}