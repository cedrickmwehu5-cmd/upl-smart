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

    showView('view-prof-dash');

    // QR initial
    refreshQR(cours, promo);

    // Rotation QR
    qrInterval =
        setInterval(() => refreshQR(cours, promo), 30000);

    // Présences temps réel
    db.ref('presences/' + cours)
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

    // Session active avec promo
    db.ref('active_session/' + cours)
        .set({
            token: token,
            promo: promo
        })
        .then(() => {
            console.log('[Firebase] session active créée', { cours, promo, token });
        })
        .catch(err => {
            console.error('[Firebase] impossible de créer la session active', err, { cours, promo, token });
            alert('Erreur Firebase lors de la création de la session.');
        });
}


function telechargerExcel() {

    const rawCours =
        document.getElementById('dash-title')
            .innerText;

    const cours =
        rawCours.replace(/[.#$[\]/]/g, '_');

    db.ref('presences/' + cours)
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

    db.ref('active_session/' + cours)
        .remove();

    db.ref('presences/' + cours)
        .remove();

    location.reload();
}