import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM ELEMENTS ---
const logoutButton = document.getElementById('logout-button');
const projectsAccordion = document.getElementById('projects-accordion');

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
async function loadActiveProjects(isAdmin) {
    try {
        const q = query(collection(db, "projects"), where("status", "==", "Ativo"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            projectsAccordion.innerHTML = '<p>Nenhum projeto ativo no momento.</p>';
            return;
        }

        projectsAccordion.innerHTML = ''; // Limpa antes de adicionar
        for (const projectDoc of querySnapshot.docs) {
            const project = projectDoc.data();
            project.id = projectDoc.id;
            await createProjectAccordionItem(project, isAdmin);
        }

        initializeAccordion();

    } catch (error) {
        console.error("Erro ao carregar projetos: ", error);
    }
}

async function createProjectAccordionItem(project, isAdmin) {
    const item = document.createElement('div');
    item.classList.add('accordion-item');

    const editButtonHTML = isAdmin ? `<a href="cadastro-projeto.html?id=${project.id}" class="btn btn-outline">Editar Projeto</a>` : '';

    const contentHTML = `
        <div class="project-header">
            <h1>${project.name}</h1>
            ${editButtonHTML}
        </div>
        <div class="project-banner-container">
            <img src="${project.bannerUrl || 'https://placehold.co/1200x400/cccccc/999999?text=Banner'}" alt="Banner do Projeto">
        </div>
        <section class="project-section">
            <h2>Sobre o Projeto</h2>
            <p class="project-description">${project.description || 'Descrição não disponível.'}</p>
            <div class="about-grid">
                <div class="about-item">
                    <label>Meta de Arrecadação</label>
                    <strong>${formatCurrency(project.goalAmount)}</strong>
                </div>
                <div class="value-card validated">
                    <label>Valor Validado</label>
                    <strong id="validated-${project.id}">R$ 0,00</strong>
                </div>
                <div class="value-card pending">
                    <label>Aguardando Validação</label>
                    <strong id="pending-${project.id}">R$ 0,00</strong>
                </div>
            </div>
        </section>
        <section class="donations-section">
            <div class="donations-header">
                <h2>Doações Recebidas</h2>
                <button class="btn-filter">Filtrar</button>
            </div>
            <div class="table-container">
                <table class="donations-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Comprovante</th>
                            <th>Recibo</th>
                        </tr>
                    </thead>
                    <tbody id="table-body-${project.id}">
                        <tr><td colspan="5">Carregando doações...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;

    item.innerHTML = `
        <button class="accordion-header">${project.name}</button>
        <div class="accordion-content">
            ${contentHTML}
        </div>
    `;

    projectsAccordion.appendChild(item);
    // Após adicionar o item ao DOM, carregue os dados das doações
    loadDonationDetailsForProject(project.id);
}

async function loadDonationDetailsForProject(projectId) {
    const donationsQuery = query(collection(db, "donations"), where("projectId", "==", projectId));
    const donationsSnapshot = await getDocs(donationsQuery);

    let validatedAmount = 0;
    let pendingAmount = 0;
    const tableBody = document.getElementById(`table-body-${projectId}`);
    tableBody.innerHTML = '';

    if (donationsSnapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="5">Nenhuma doação recebida para este projeto ainda.</td></tr>';
    } else {
        for (const donationDoc of donationsSnapshot.docs) {
            const donation = donationDoc.data();
            const userSnap = await getDoc(doc(db, "users", donation.userId));
            const userName = userSnap.exists() ? userSnap.data().name : "Doador Anônimo";

            if (donation.proofStatus === 'validated') {
                validatedAmount += donation.value;
            } else {
                pendingAmount += donation.value;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userName}</td>
                <td>${formatDate(donation.donationDate)}</td>
                <td>${formatCurrency(donation.value)}</td>
                <td><a href="${donation.proofUrl}" target="_blank">Ver</a></td>
                <td>${donation.receiptStatus === 'issued' ? '<a href="...">Ver</a>' : 'Pendente'}</td>
            `;
            tableBody.appendChild(row);
        }
    }

    document.getElementById(`validated-${projectId}`).textContent = formatCurrency(validatedAmount);
    document.getElementById(`pending-${projectId}`).textContent = formatCurrency(pendingAmount);
}

function initializeAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;

            item.classList.toggle('active');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }

            // Ajusta o maxHeight de outros itens abertos quando um novo é aberto/fechado
            document.querySelectorAll('.accordion-item.active').forEach(activeItem => {
                if (activeItem !== item) {
                    const activeContent = activeItem.querySelector('.accordion-content');
                    activeContent.style.maxHeight = activeContent.scrollHeight + "px";
                }
            });
        });
    });
}
