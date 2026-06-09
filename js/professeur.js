// --- LOGIQUE PROFESSEUR ---

function ajouterLignePresence(body, item) {
    if (!item || typeof item !== 'object') {
        return;
    }

    const tr = document.createElement('tr');

    const tdNom = document.createElement('td');
    tdNom.textContent = item.nom || '—';

    const tdMatricule = document.createElement('td');
    tdMatricule.textContent = item.matricule || '';

    const tdType = document.createElement('td');
    tdType.style.textAlign = 'center';
    tdType.textContent = item.type || 'ENTREE';

    const tdHeure = document.createElement('td');
    tdHeure.style.textAlign = 'right';
    tdHeure.textContent = item.heure || '';

    tr.appendChild(tdNom);
    tr.appendChild(tdMatricule);
    tr.appendChild(tdType);
    tr.appendChild(tdHeure);

    body.appendChild(tr);
}

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

            if (!snap || !snap.exists()) {
                console.log('[DEBUG] Aucune présence trouvée pour', presencesPath);
                return;
            }

            snap.forEach(child => {
                console.log('[DEBUG] child.key =', child.key);
                console.log('[DEBUG] child.val() =', child.val());

                const item = child.val();

                if (!item || typeof item !== 'object') {
                    return;
                }

                const isPresenceRecord =
                    item.nom !== undefined ||
                    item.matricule !== undefined ||
                    item.type !== undefined ||
                    item.heure !== undefined;

                if (isPresenceRecord) {
                    ajouterLignePresence(body, item);
                    return;
                }

                Object.keys(item).forEach(key => {
                    const nestedItem = item[key];
                    if (nestedItem && typeof nestedItem === 'object') {
                        console.log('[DEBUG] nested item =', nestedItem);
                        ajouterLignePresence(body, nestedItem);
                    }
                });
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