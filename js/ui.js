// Gestion des vues
function showView(id) {
    document.querySelectorAll('.card > div')
        .forEach(v => v.classList.add('hidden'));

    document.getElementById(id)
        .classList.remove('hidden');
}