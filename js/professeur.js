// --- LOGIQUE PROFESSEUR ---

let currentTeacher = null;
let selectedHistoryCourse = null;
let selectedHistoryDate = null;

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    return [];
}

function sanitizeFirebaseKey(value) {
    return String(value || '')
        .trim()
        .replace(/[.#$[\]/]/g, '_');
}

function updateTeacherList(fieldName, values) {
    if (!currentTeacher || !currentTeacher.uid) {
        return Promise.reject(new Error('Aucun enseignant connecté.'));
    }

    const cleaned = normalizeList(values)
        .filter((item, index, list) => list.findIndex(current => current.toLowerCase() === item.toLowerCase()) === index);

    console.log('[AUTH] UID :', currentTeacher.uid);

    return db.ref('enseignants/' + currentTeacher.uid + '/' + fieldName)
        .set(cleaned)
        .then(() => {
            currentTeacher[fieldName] = cleaned;
            fillTeacherSelects(currentTeacher);
            return cleaned;
        });
}

function renderTeacherPersonalSpace(teacherData) {
    const courseList = document.getElementById('teacher-courses');
    const promoList = document.getElementById('teacher-promotions');
    const historyLabel = document.getElementById('history-course-label');

    const courses = normalizeList(teacherData && teacherData.cours);
    const promotions = normalizeList(teacherData && teacherData.promotions);

    console.log('[COURS] Chargés :', courses);
    console.log('[PROMOS] Chargées :', promotions);

    if (courseList) {
        courseList.innerHTML = '';

        if (courses.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'panel-note';
            empty.textContent = 'Aucun cours enregistré pour le moment.';
            courseList.appendChild(empty);
        } else {
            courses.forEach(course => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'chip-item';
                chip.textContent = course;
                chip.title = 'Consulter l’historique de ' + course;
                chip.addEventListener('click', () => {
                    selectedHistoryCourse = course;
                    selectedHistoryDate = '';
                    document.getElementById('dash-title').textContent = course;
                    showView('view-prof-dash');
                    chargerHistoriqueCours(course);
                });

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'chip-remove';
                removeBtn.textContent = '×';
                removeBtn.title = 'Supprimer ' + course;
                removeBtn.addEventListener('click', event => {
                    event.stopPropagation();
                    supprimerCours(course);
                });

                chip.appendChild(removeBtn);
                courseList.appendChild(chip);
            });
        }
    }

    if (promoList) {
        promoList.innerHTML = '';

        if (promotions.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'panel-note';
            empty.textContent = 'Aucune promotion enregistrée.';
            promoList.appendChild(empty);
        } else {
            promotions.forEach(promo => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'chip-item';
                chip.textContent = promo;
                chip.title = 'Promotion ' + promo;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'chip-remove';
                removeBtn.textContent = '×';
                removeBtn.title = 'Supprimer ' + promo;
                removeBtn.addEventListener('click', event => {
                    event.stopPropagation();
                    supprimerPromotion(promo);
                });

                chip.appendChild(removeBtn);
                promoList.appendChild(chip);
            });
        }
    }

    if (historyLabel) {
        historyLabel.textContent = courses.length
            ? 'Cliquez sur un cours pour voir ses dates et ses présences.'
            : 'Ajoutez un cours pour alimenter votre espace personnel.';
    }
}

function ajouterCours() {
    const courseInput = document.getElementById('course-name');
    if (!courseInput) return;

    const value = courseInput.value.trim();
    if (!value) return alert('Nom du cours requis.');

    const existing = normalizeList(currentTeacher && currentTeacher.cours);
    const nextList = [...new Set([ ...existing, value ].map(item => item.trim()).filter(Boolean))];

    updateTeacherList('cours', nextList)
        .then(() => {
            courseInput.value = '';
            fillTeacherSelects(currentTeacher);
            console.log('[COURS] Ajouté :', value);
        })
        .catch(error => {
            console.error('[COURS] Impossible d’ajouter le cours', error);
            alert('Impossible d’ajouter le cours.');
        });
}

function supprimerCours(course) {
    if (!confirm('Supprimer ce cours de votre espace personnel ?')) return;

    const nextList = normalizeList(currentTeacher && currentTeacher.cours)
        .filter(item => item.toLowerCase() !== String(course).toLowerCase());

    updateTeacherList('cours', nextList)
        .then(() => {
            if (selectedHistoryCourse && selectedHistoryCourse.toLowerCase() === String(course).toLowerCase()) {
                selectedHistoryCourse = null;
                selectedHistoryDate = null;
                document.getElementById('history-date').innerHTML = '<option value="">Aucune date</option>';
                document.getElementById('history-body').innerHTML = '';
                document.getElementById('stat-total').textContent = '0';
                document.getElementById('stat-entries').textContent = '0';
                document.getElementById('stat-exits').textContent = '0';
            }
            console.log('[COURS] Supprimé :', course);
        })
        .catch(error => {
            console.error('[COURS] Impossible de supprimer le cours', error);
            alert('Impossible de supprimer ce cours.');
        });
}

function ajouterPromotion() {
    const promoInput = document.getElementById('promotion-name');
    if (!promoInput) return;

    const value = promoInput.value.trim();
    if (!value) return alert('Nom de la promotion requis.');

    const existing = normalizeList(currentTeacher && currentTeacher.promotions);
    const nextList = [...new Set([ ...existing, value ].map(item => item.trim()).filter(Boolean))];

    updateTeacherList('promotions', nextList)
        .then(() => {
            promoInput.value = '';
            fillTeacherSelects(currentTeacher);
            console.log('[PROMOS] Ajoutée :', value);
        })
        .catch(error => {
            console.error('[PROMOS] Impossible d’ajouter la promotion', error);
            alert('Impossible d’ajouter la promotion.');
        });
}

function supprimerPromotion(promo) {
    if (!confirm('Supprimer cette promotion de votre espace personnel ?')) return;

    const nextList = normalizeList(currentTeacher && currentTeacher.promotions)
        .filter(item => item.toLowerCase() !== String(promo).toLowerCase());

    updateTeacherList('promotions', nextList)
        .then(() => {
            console.log('[PROMOS] Supprimée :', promo);
        })
        .catch(error => {
            console.error('[PROMOS] Impossible de supprimer la promotion', error);
            alert('Impossible de supprimer cette promotion.');
        });
}

function chargerHistoriqueCours(cours) {
    const rawCours = String(cours || '').trim();
    if (!rawCours) return;

    selectedHistoryCourse = rawCours;
    selectedHistoryDate = '';

    const historySelect = document.getElementById('history-date');
    if (historySelect) {
        historySelect.innerHTML = '<option value="">Chargement…</option>';
    }

    const path = 'presences/' + sanitizeFirebaseKey(rawCours);
    console.log('[HISTORIQUE] Lecture :', path);

    db.ref(path)
        .once('value', snap => {
            const dates = [];

            if (snap && snap.exists()) {
                snap.forEach(child => {
                    if (child.key) {
                        dates.push(child.key);
                    }
                });
            }

            dates.sort((a, b) => b.localeCompare(a));

            if (historySelect) {
                historySelect.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Choisir une date';
                historySelect.appendChild(defaultOption);

                dates.forEach(date => {
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = date;
                    historySelect.appendChild(option);
                });
            }

            console.log('[HISTORIQUE] Dates disponibles :', dates);

            if (dates.length > 0 && historySelect) {
                historySelect.value = dates[0];
                chargerHistoriqueDate(rawCours, dates[0]);
            } else {
                document.getElementById('history-body').innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune présence enregistrée pour ce cours.</td></tr>';
                document.getElementById('stat-total').textContent = '0';
                document.getElementById('stat-entries').textContent = '0';
                document.getElementById('stat-exits').textContent = '0';
            }
        });
}

function chargerHistoriqueDateSelection() {
    const select = document.getElementById('history-date');
    if (!select || !selectedHistoryCourse) return;

    selectedHistoryDate = select.value;
    if (selectedHistoryDate) {
        chargerHistoriqueDate(selectedHistoryCourse, selectedHistoryDate);
    }
}

function chargerHistoriqueDate(cours, date) {
    if (!cours || !date) return;

    selectedHistoryDate = date;
    const path = 'presences/' + sanitizeFirebaseKey(cours) + '/' + date;
    console.log('[HISTORIQUE] Lecture :', path);

    db.ref(path)
        .once('value', snap => {
            const data = [];
            let total = 0;
            let entries = 0;
            let exits = 0;

            if (snap && snap.exists()) {
                snap.forEach(child => {
                    const item = child.val() || {};
                    data.push({
                        nom: item.nom || '—',
                        matricule: item.matricule || '',
                        promo: item.promo || '',
                        type: item.type || 'ENTREE',
                        heure: item.heure || ''
                    });

                    total += 1;
                    if (item.type === 'ENTREE') entries += 1;
                    if (item.type === 'SORTIE') exits += 1;
                });
            }

            renderHistoriqueTable(data);
            document.getElementById('stat-total').textContent = String(total);
            document.getElementById('stat-entries').textContent = String(entries);
            document.getElementById('stat-exits').textContent = String(exits);
            console.log('[PRESENCES] Données :', data);
        });
}

function renderHistoriqueTable(data) {
    const body = document.getElementById('history-body');
    if (!body) return;

    body.innerHTML = '';

    if (!data.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.style.textAlign = 'center';
        cell.textContent = 'Aucune présence pour cette date.';
        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        const nom = document.createElement('td');
        nom.textContent = item.nom;

        const matricule = document.createElement('td');
        matricule.textContent = item.matricule;

        const promo = document.createElement('td');
        promo.textContent = item.promo;

        const type = document.createElement('td');
        type.textContent = item.type;

        const heure = document.createElement('td');
        heure.textContent = item.heure;

        row.append(nom, matricule, promo, type, heure);
        body.appendChild(row);
    });
}

function fillTeacherSelects(teacherData) {
    const courseSelect = document.getElementById('p-cours');
    const promoSelect = document.getElementById('p-class');
    const welcomeLabel = document.getElementById('prof-welcome');

    if (courseSelect) {
        courseSelect.innerHTML = '';

        const courses = normalizeList(teacherData && teacherData.cours);
        if (courses.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Aucun cours attribué';
            option.value = '';
            courseSelect.appendChild(option);
        } else {
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course;
                option.textContent = course;
                courseSelect.appendChild(option);
            });
        }
    }

    if (promoSelect) {
        promoSelect.innerHTML = '';

        const promotions = normalizeList(teacherData && teacherData.promotions);
        if (promotions.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Aucune promotion attribuée';
            option.value = '';
            promoSelect.appendChild(option);
        } else {
            promotions.forEach(promo => {
                const option = document.createElement('option');
                option.value = promo;
                option.textContent = promo;
                promoSelect.appendChild(option);
            });
        }
    }

    if (welcomeLabel) {
        welcomeLabel.textContent = teacherData && teacherData.nom
            ? 'Connecté en tant que ' + teacherData.nom
            : 'Enseignant non connecté';
    }

    renderTeacherPersonalSpace(teacherData);
}

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

    selectedHistoryCourse = rawCours;
    selectedHistoryDate = getTodayDate();

    const dateJour = getTodayDate();
    console.log('[Presence] Date active :', dateJour);
    console.log('[Session] ouvrirSession', { cours, promo, type, dateJour });

    showView('view-prof-dash');

    const teacherId = currentTeacher && currentTeacher.uid ? currentTeacher.uid : '';
    const teacherNom = currentTeacher && currentTeacher.nom ? currentTeacher.nom : 'Enseignant';

    console.log('[SESSION] Créée par', teacherNom);

    // QR initial
    refreshQR(cours, promo, type, teacherId, teacherNom);

    // Régénération automatique toutes les 15 secondes
    if (qrInterval) {
        clearInterval(qrInterval);
    }
    qrInterval = setInterval(() => {
        console.log('[QR] refreshQR interval déclenché', { cours, promo, type });
        refreshQR(cours, promo, type, teacherId, teacherNom);
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


function refreshQR(cours, promo, type = 'ENTREE', teacherId = '', teacherNom = 'Enseignant') {

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
    const sessionPayload = {
        token: token,
        promo: promo,
        type: type,
        teacherId: teacherId,
        teacherNom: teacherNom
    };

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


async function loginProfesseur() {
    const email = document.getElementById('prof-email').value.trim();
    const password = document.getElementById('prof-password').value;

    if (!email || !password) {
        return alert('Email et mot de passe requis.');
    }

    const btn = document.getElementById('btn-login-prof');
    if (btn) btn.disabled = true;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('[AUTH] UID :', user.uid);
        console.log('[AUTH] Connexion réussie', user.uid);

        const snapshot = await db.ref('enseignants/' + user.uid).once('value');
        const teacherData = snapshot.exists() ? snapshot.val() : {};

        currentTeacher = {
            uid: user.uid,
            email: user.email || email,
            ...teacherData
        };

        console.log('[COURS] Chargés :', normalizeList(currentTeacher.cours));
        console.log('[PROMOS] Chargées :', normalizeList(currentTeacher.promotions));

        console.log('[AUTH] Enseignant chargé', currentTeacher);

        fillTeacherSelects(currentTeacher);
        document.getElementById('prof-welcome').textContent = 'Connecté en tant que ' + (currentTeacher.nom || currentTeacher.email);
        showView('view-prof-login');
    } catch (error) {
        console.error('[AUTH] Erreur de connexion', error);
        alert('Connexion impossible : ' + (error.message || 'Vérifiez vos identifiants.'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

function logoutProfesseur() {
    if (!auth) return;

    auth.signOut()
        .then(() => {
            currentTeacher = null;
            selectedHistoryCourse = null;
            selectedHistoryDate = null;
            fillTeacherSelects(null);
            document.getElementById('prof-welcome').textContent = 'Aucun enseignant connecté';
            showView('view-prof-auth');
            console.log('[AUTH] Déconnexion réussie');
        })
        .catch(error => {
            console.error('[AUTH] Erreur de déconnexion', error);
            alert('Impossible de se déconnecter.');
        });
}

if (auth) {
    auth.onAuthStateChanged(async user => {
        if (user) {
            const snapshot = await db.ref('enseignants/' + user.uid).once('value');
            const teacherData = snapshot.exists() ? snapshot.val() : {};

            currentTeacher = {
                uid: user.uid,
                email: user.email || '',
                ...teacherData
            };

            console.log('[AUTH] UID :', user.uid);
            console.log('[COURS] Chargés :', normalizeList(currentTeacher.cours));
            console.log('[PROMOS] Chargées :', normalizeList(currentTeacher.promotions));

            fillTeacherSelects(currentTeacher);
            console.log('[AUTH] Session restaurée', currentTeacher);
        } else {
            currentTeacher = null;
            fillTeacherSelects(null);
        }
    });
}

function telechargerExcel() {

    const rawCours = selectedHistoryCourse || document.getElementById('dash-title').innerText;
    const dateJour = selectedHistoryDate || getTodayDate();
    const cours = sanitizeFirebaseKey(rawCours);
    const presencesPath = 'presences/' + cours + '/' + dateJour;

    console.log('[HISTORIQUE] Lecture :', presencesPath);
    db.ref(presencesPath)
        .once('value', snap => {

            const data = [];

            snap.forEach(c => {
                const item = c.val() || {};
                data.push({
                    nom: item.nom || '—',
                    matricule: item.matricule || '',
                    promo: item.promo || '',
                    date: item.date || dateJour,
                    heure: item.heure || '',
                    type: item.type || 'ENTREE'
                });
            });

            const ws = XLSX.utils.json_to_sheet(data, {
                header: ['nom', 'matricule', 'promo', 'date', 'heure', 'type']
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Présences');

            XLSX.writeFile(wb, `Presences_${rawCours}_${dateJour}.xlsx`);
            console.log('[PRESENCES] Données :', data);
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