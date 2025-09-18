import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const logoutButton = document.getElementById('logout-button');
const projectsAccordion = document.getElementById('projects-accordion');
const potentialValueSpan = document.querySelector('.potential-value span'); // Mover para dentro do escopo do projeto

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadActiveProjects(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});

// --- DATA FETCHING & RENDERING ---
async function loadActiveProjects(userId) {
    try {
        const q = query(collection(db, "projects"), where("status", "==", "Ativo"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            projectsAccordion.innerHTML = '<p>Nenhum projeto ativo no momento.</p>';
            return;
        }

        querySnapshot.forEach(doc => {
            const project = doc.data();
            project.id = doc.id;
            createProjectAccordionItem(project, userId);
        });

        initializeAccordion();

    } catch (error) {
        console.error("Erro ao carregar projetos: ", error);
    }
}

function createProjectAccordionItem(project, userId) {
    const item = document.createElement('div');
    item.classList.add('accordion-item');

    // Conteúdo interno do projeto, similar ao antigo projeto.html
    const contentHTML = `
        <div class="project-layout">
            <div class="project-details">
                <h2>${project.name}</h2>
                <p class="location">📍 Localização a ser adicionada</p>
                <p>${project.description || 'Descrição do projeto a ser adicionada.'}</p>
            </div>
            <div class="investment-card">
                <div class="investment-goal">
                    <label>Meta de Arrecadação</label>
                    <strong>${formatCurrency(project.goal || 0)}</strong>
                </div>
                <div class="investment-raised">
                    <label>Arrecadado</label>
                    <span>${formatCurrency(project.raised || 0)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${((project.raised || 0) / (project.goal || 1)) * 100}%;"></div>
                </div>
                <form class="investment-form" data-project-id="${project.id}" data-project-name="${project.name}">
                    <label for="investment-value-${project.id}">Valor do Investimento Social</label>
                    <input type="text" id="investment-value-${project.id}" placeholder="R$ 0,00">
                    <div class="potential-value">
                        Potencial de Investimento <span id="potential-value-${project.id}">R$ 0,00</span>
                    </div>
                    <button type="submit" class="btn-invest">Fazer Investimento Social</button>
                </form>
            </div>
        </div>
    `;

    item.innerHTML = `
        <button class="accordion-header">${project.name}</button>
        <div class="accordion-content">
            ${contentHTML}
        </div>
    `;

    projectsAccordion.appendChild(item);

    // Carregar o potencial de investimento do usuário para este card
    fetchUserData(userId, project.id);
}

function initializeAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;

            // Fecha outros itens abertos
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                }
            });

            // Abre ou fecha o item clicado
            item.classList.toggle('active');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

async function fetchUserData(uid, projectId) {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);
        const potentialValueSpan = document.getElementById(`potential-value-${projectId}`);

        if (docSnap.exists() && docSnap.data().investmentPotential) {
            const potential = docSnap.data().investmentPotential;
            potentialValueSpan.textContent = formatCurrency(potential);
        } else {
            potentialValueSpan.textContent = formatCurrency(0);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// --- HELPERS ---
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- LÓGICA DE INVESTIMENTO (EVENT DELEGATION) ---
projectsAccordion.addEventListener('submit', (e) => {
    if (e.target.classList.contains('investment-form')) {
        e.preventDefault();
        const form = e.target;
        const projectId = form.dataset.projectId;
        const projectName = form.dataset.projectName;
        const input = form.querySelector('input');
        
        const rawValue = input.value.replace(/\D/g, '');
        const investmentAmount = parseFloat(rawValue) / 100;

        if (isNaN(investmentAmount) || investmentAmount <= 0) {
            alert('Por favor, insira um valor de investimento válido.');
            return;
        }
        
        openPaymentModal(projectName, investmentAmount);
    }
});

// --- MODAL LOGIC ---
const paymentModal = document.getElementById('payment-modal');
const closeModalButton = document.querySelector('.close-button');
const modalProjectName = document.getElementById('modal-project-name');
const modalInvestmentValue = document.getElementById('modal-investment-value');

function openPaymentModal(projectName, amount) {
    modalProjectName.textContent = projectName;
    modalInvestmentValue.textContent = formatCurrency(amount);
    paymentModal.style.display = 'flex';
}

closeModalButton.addEventListener('click', () => {
    paymentModal.style.display = 'none';
});

// ... (resto da lógica do modal, como copiar código PIX e confirmar investimento)
