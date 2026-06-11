let adminEtudiantEditMode = false;
let adminEtudiantEditingMatricule = null;

function sanitizeText(value) {
    return String(value || '').trim();
}

function showAdminMessage(message, isError = false) {
    const status = document.getElementById('admin-student-status');
    if (!status) return;
    status.textContent = message;
    status.className = isError ? 'scan-status error' : 'scan-status';
}

function clearAdminMessage() {
    const status = document.getElementById('admin-student-status');
    if (!status) return;
    status.textContent = '';
    status.className = 'scan-status hidden';
}

function resetAdminStudentForm() {
    const nom = document.getElementById('admin-student-name');
    const matricule = document.getElementById('admin-student-matricule');
    const promotion = document.getElementById('admin-student-promotion');
    const submit = document.getElementById('admin-student-submit');
    const cancel = document.getElementById('admin-student-cancel');

    if (nom) nom.value = '';
    if (matricule) matricule.value = '';
    if (promotion) promotion.value = '';

    adminEtudiantEditMode = false;
    adminEtudiantEditingMatricule = null;

    if (submit) submit.textContent = 'Ajouter étudiant';
    if (cancel) cancel.classList.add('hidden');
    clearAdminMessage();
}

function loadEtudiantsAutorises() {
    const list = document.getElementById('admin-students-list');
    const search = document.getElementById('admin-student-search');

    if (!list) return;

    list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chargement…</td></tr>';

    db.ref('etudiants_autorises')
        .once('value')
        .then(snapshot => {
            const rows = [];
            if (snapshot && snapshot.exists()) {
                snapshot.forEach(child => {
                    const value = child.val() || {};
                    rows.push({
                        key: child.key,
                        nom: String(value.nom || ''),
                        matricule: String(value.matricule || child.key || ''),
                        promotion: String(value.promotion || ''),
                        actif: Boolean(value.actif),
                        dateCreation: value.dateCreation || ''
                    });
                });
            }

            renderEtudiantsAutorises(rows, search ? search.value.trim().toLowerCase() : '');
        })
        .catch(error => {
            console.error('[ADMIN] Erreur chargement étudiants autorisés', error);
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Impossible de charger la liste.</td></tr>';
        });
}

function renderEtudiantsAutorises(rows, filter = '') {
    const list = document.getElementById('admin-students-list');
    if (!list) return;

    const filtered = rows.filter(item => {
        if (!filter) return true;
        return String(item.matricule || '').toLowerCase().includes(filter);
    });

    if (!filtered.length) {
        list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun étudiant autorisé.</td></tr>';
        return;
    }

    list.innerHTML = '';

    filtered.forEach(item => {
        const row = document.createElement('tr');

        const tdNom = document.createElement('td');
        tdNom.textContent = item.nom || '—';

        const tdMatricule = document.createElement('td');
        tdMatricule.textContent = item.matricule || '—';

        const tdPromotion = document.createElement('td');
        tdPromotion.textContent = item.promotion || '—';

        const tdActif = document.createElement('td');
        tdActif.textContent = item.actif ? 'Oui' : 'Non';

        const tdActions = document.createElement('td');
        tdActions.style.whiteSpace = 'nowrap';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-small btn-grey';
        editBtn.textContent = 'Modifier';
        editBtn.style.marginRight = '8px';
        editBtn.onclick = () => remplirFormulaireEtudiant(item);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-small btn-red';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.onclick = () => supprimerEtudiantAutorise(item);

        tdActions.appendChild(editBtn);
        tdActions.appendChild(deleteBtn);

        row.appendChild(tdNom);
        row.appendChild(tdMatricule);
        row.appendChild(tdPromotion);
        row.appendChild(tdActif);
        row.appendChild(tdActions);

        list.appendChild(row);
    });
}

function remplirFormulaireEtudiant(item) {
    const nom = document.getElementById('admin-student-name');
    const matricule = document.getElementById('admin-student-matricule');
    const promotion = document.getElementById('admin-student-promotion');
    const submit = document.getElementById('admin-student-submit');
    const cancel = document.getElementById('admin-student-cancel');

    if (!nom || !matricule || !promotion || !submit) return;

    adminEtudiantEditMode = true;
    adminEtudiantEditingMatricule = String(item.matricule || '');

    nom.value = item.nom || '';
    matricule.value = item.matricule || '';
    promotion.value = item.promotion || '';
    submit.textContent = 'Enregistrer les modifications';

    if (cancel) cancel.classList.remove('hidden');
    showAdminMessage('Modification en cours pour ' + item.matricule + '.', false);
}

function validerEtudiantAutorise(nom, matricule, promotion) {
    const cleanNom = sanitizeText(nom);
    const cleanMatricule = sanitizeText(matricule);
    const cleanPromotion = sanitizeText(promotion);

    if (!cleanNom) {
        return { ok: false, message: 'Le nom complet est requis.' };
    }

    if (!cleanMatricule) {
        return { ok: false, message: 'Le matricule est requis.' };
    }

    if (!cleanPromotion) {
        return { ok: false, message: 'La promotion est requise.' };
    }

    return { ok: true, nom: cleanNom, matricule: cleanMatricule, promotion: cleanPromotion };
}

function ajouterOuModifierEtudiantAutorise(event) {
    event.preventDefault();

    const nom = document.getElementById('admin-student-name');
    const matricule = document.getElementById('admin-student-matricule');
    const promotion = document.getElementById('admin-student-promotion');

    if (!nom || !matricule || !promotion) return;

    const validation = validerEtudiantAutorise(nom.value, matricule.value, promotion.value);
    if (!validation.ok) {
        showAdminMessage(validation.message, true);
        return;
    }

    const payload = {
        nom: validation.nom,
        matricule: validation.matricule,
        promotion: validation.promotion,
        actif: false,
        dateCreation: new Date().toISOString()
    };

    if (adminEtudiantEditMode && adminEtudiantEditingMatricule) {
        const oldMatricule = adminEtudiantEditingMatricule;
        db.ref('etudiants_autorises/' + oldMatricule)
            .once('value')
            .then(snapshot => {
                const current = snapshot.exists() ? snapshot.val() : null;
                if (!current) {
                    showAdminMessage('Étudiant introuvable à modifier.', true);
                    return;
                }

                const updatedPayload = {
                    nom: validation.nom,
                    matricule: validation.matricule,
                    promotion: validation.promotion,
                    actif: Boolean(current.actif),
                    dateCreation: current.dateCreation || payload.dateCreation
                };

                if (oldMatricule !== validation.matricule) {
                    return db.ref('etudiants_autorises/' + oldMatricule).remove()
                        .then(() => db.ref('etudiants_autorises/' + validation.matricule).set(updatedPayload));
                }

                return db.ref('etudiants_autorises/' + validation.matricule).set(updatedPayload);
            })
            .then(() => {
                console.log('[ADMIN] Étudiant modifié');
                showAdminMessage('Étudiant modifié avec succès.', false);
                resetAdminStudentForm();
                loadEtudiantsAutorises();
            })
            .catch(error => {
                console.error('[ADMIN] Impossible de modifier l’étudiant', error);
                showAdminMessage('Impossible de modifier l’étudiant.', true);
            });
        return;
    }

    db.ref('etudiants_autorises/' + validation.matricule)
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                throw new Error('matricule_existant');
            }
            return db.ref('etudiants_autorises/' + validation.matricule).set(payload);
        })
        .then(() => {
            console.log('[ADMIN] Étudiant ajouté');
            showAdminMessage('Étudiant ajouté avec succès.', false);
            resetAdminStudentForm();
            loadEtudiantsAutorises();
        })
        .catch(error => {
            if (error && error.message === 'matricule_existant') {
                showAdminMessage('Ce matricule existe déjà.', true);
            } else {
                console.error('[ADMIN] Impossible d’ajouter l’étudiant', error);
                showAdminMessage('Impossible d’ajouter l’étudiant.', true);
            }
        });
}

function supprimerEtudiantAutorise(item) {
    if (!item || !item.matricule) return;

    const confirmed = confirm('Supprimer cet étudiant autorisé ?');
    if (!confirmed) return;

    db.ref('etudiants_autorises/' + String(item.matricule)).remove()
        .then(() => {
            console.log('[ADMIN] Étudiant supprimé');
            showAdminMessage('Étudiant supprimé.', false);
            loadEtudiantsAutorises();
        })
        .catch(error => {
            console.error('[ADMIN] Impossible de supprimer l’étudiant', error);
            showAdminMessage('Impossible de supprimer l’étudiant.', true);
        });
}

function filterAdminStudentList() {
    const search = document.getElementById('admin-student-search');
    if (!search) return;
    loadEtudiantsAutorises();
}

function initAdminEtudiantsModule() {
    const form = document.getElementById('admin-student-form');
    const search = document.getElementById('admin-student-search');
    const cancel = document.getElementById('admin-student-cancel');

    if (form) {
        form.addEventListener('submit', ajouterOuModifierEtudiantAutorise);
    }

    if (search) {
        search.addEventListener('input', filterAdminStudentList);
    }

    if (cancel) {
        cancel.addEventListener('click', resetAdminStudentForm);
    }

    loadEtudiantsAutorises();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminEtudiantsModule);
} else {
    initAdminEtudiantsModule();
}
