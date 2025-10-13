import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM ELEMENTS ---
const logoutButton = document.getElementById('logout-button');
const projectsGrid = document.getElementById('projects-grid');
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

// --- DATA FETCHING & RENDERING ---
async function loadActiveProjects() {
    try {
        const q = query(collection(db, "projects"), where("status", "==", "Ativo"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            projectsGrid.innerHTML = '<p>Nenhum projeto ativo no momento.</p>';
            return;
        }

        projectsGrid.innerHTML = ''; // Limpa antes de adicionar
        querySnapshot.forEach((doc) => {
            const project = { id: doc.id, ...doc.data() };
            createProjectCard(project);
        });

    } catch (error) {
        console.error("Erro ao carregar projetos: ", error);
        projectsGrid.innerHTML = '<p>Erro ao carregar projetos. Tente novamente mais tarde.</p>';
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    card.innerHTML = `
        <div class="project-card-image">
            <img src="${project.bannerUrl || 'https://placehold.co/600x400/cccccc/999999?text=Projeto'}" alt="Imagem do ${project.name}">
            <span class="project-tag">${project.type || 'PROJETO'}</span>
        </div>
        <div class="project-card-content">
            <span class="project-category">${project.category || 'Fundo da Infância e Adolescência'}</span>
            <h3>${project.name}</h3>
            <div class="project-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>
                <span>${project.location || 'Estado'}</span>
            </div>
            <a href="projeto-detalhe.html?id=${project.id}" class="btn-details">Conheça o Projeto</a>
        </div>
    `;

    projectsGrid.appendChild(card);
}
