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

    document.getElementById('qrcode')
        .innerHTML = "";

    new QRCode(
        document.getElementById("qrcode"),
        {
            text: token,
            width: 200,
            height: 200
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