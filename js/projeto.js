import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM ELEMENTS ---
const logoutButton = document.getElementById('logout-button');
const adminLink = document.getElementById('admin-link');
const crmLink = document.getElementById('crm-link');

// --- HELPERS ---
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Data inválida';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

// --- AUTHENTICATION & USER DATA ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
        if (isAdmin) {
            adminLink.style.display = 'block';
            crmLink.style.display = 'block';
        }
        loadActiveProjects(isAdmin);
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});
