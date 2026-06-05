// --- LOGIQUE PROFESSEUR ---

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function ouvrirSession() {

    const rawCours =
        document.getElementById('p-cours').value.trim();

    const promo =
        document.getElementById('p-class').value;

    const type =
        document.getElementById('p-type').value;

    if (!rawCours)
        return alert("Nom du cours requis");

    // Nettoyage Firebase
    const cours =
        rawCours.replace(/[.#$[\]/]/g, '_');

    document.getElementById('dash-title')
        .innerText = rawCours;

    const dateJour = getTodayDate();
    console.log('[Presence] Date active :', dateJour);
    console.log('[Session] ouvrirSession', { cours, promo, type, dateJour });

    showView('view-prof-dash');

    // QR initial
    refreshQR(cours, promo, type);

    // Régénération automatique toutes les 15 secondes
    if (qrInterval) {
        clearInterval(qrInterval);
    }
    qrInterval = setInterval(() => {
        console.log('[QR] refreshQR interval déclenché', { cours, promo, type });
        refreshQR(cours, promo, type);
    }, 15000);
    console.log('[QR] setInterval lancé pour régénérer le QR toutes les 15 secondes', { intervalId: qrInterval, type });

    // Présences temps réel
    const presencesPath = 'presences/' + cours + '/' + dateJour;
    console.log('[Firebase] Lecture :', presencesPath);
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

                const tdType =
                    document.createElement('td');

                tdType.style.textAlign = 'center';
                tdType.textContent = s.type || 'ENTREE';

                const tdHeure =
                    document.createElement('td');

                tdHeure.style.textAlign = 'right';
                tdHeure.textContent = s.heure;

                tr.appendChild(tdInfo);
                tr.appendChild(tdType);
                tr.appendChild(tdHeure);

                body.appendChild(tr);
            });
        });
}


function refreshQR(cours, promo, type = 'ENTREE') {

    const token =
        Math.random()
            .toString(36)
            .substr(2, 6)
            .toUpperCase();

    console.log('[QR] refreshQR appelée', { cours, promo, type });
    console.log('[QR] Nouveau token :', token);

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
    const sessionPayload = { token: token, promo: promo, type: type };

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

    const dateJour = getTodayDate();
    console.log('[Presence] Date active :', dateJour);
    const presencesPath = 'presences/' + cours + '/' + dateJour;
    console.log('[Firebase] Lecture :', presencesPath);
    db.ref(presencesPath)
        .once('value', snap => {

            let data = [];

            snap.forEach(c => {
                const item = c.val();
                data.push({
                    nom: item.nom,
                    matricule: item.matricule,
                    promo: item.promo,
                    date: item.date || dateJour,
                    heure: item.heure,
                    type: item.type || 'ENTREE'
                });
            });

            const ws =
                XLSX.utils.json_to_sheet(data, {
                    header: ['nom', 'matricule', 'promo', 'date', 'heure', 'type']
                });

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
        "Clôturer cette session ? Les présences enregistrées resteront conservées."
    )) return;

    const rawCours =
        document.getElementById('dash-title')
            .innerText;

    const cours =
        rawCours.replace(/[.#$[\]/]/g, '_');

    if (qrInterval) {
        clearInterval(qrInterval);
        console.log('[QR] setInterval arrêté lors de la fermeture de session', { intervalId: qrInterval });
        qrInterval = null;
    }

    const activeSessionPath = 'active_session/' + cours;
    console.log('[Firebase] suppression session active', activeSessionPath);
    db.ref(activeSessionPath)
        .remove()
        .then(() => {
            console.log('[Firebase] session active supprimée', { cours });
            location.reload();
        })
        .catch(err => {
            console.error('[Firebase] impossible de supprimer la session active', err, { cours });
            alert('Impossible de clôturer la session. Vérifiez les règles de sécurité.');
        });
}