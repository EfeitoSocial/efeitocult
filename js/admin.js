import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
            document.getElementById('crm-link').style.display = 'block';
            
            // Initialize the panel once the user is confirmed as an admin
            setupTabNavigation();
            loadProjects(); 
            loadProjectsIntoFilter();
            
            document.getElementById('filter-date').addEventListener('change', loadDonations);
            document.getElementById('filter-project').addEventListener('change', loadDonations);
        } else {
            console.error("Access denied. User is not an administrator.");
            alert("You do not have permission to access this page.");
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

function setupTabNavigation() {
    const tabsContainer = document.querySelector('.tabs');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabs = document.querySelectorAll('.tab-link');

    if (!tabsContainer) {
        console.error("Tabs container not found!");
        return;
    }

    tabsContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab-link');
        if (!clickedTab) return;

        // Deactivate all tabs and content
        tabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Activate the clicked tab and corresponding content
        const tabId = clickedTab.dataset.tab;
        clickedTab.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Load data for the active tab
        switch (tabId) {
            case 'projects':
                loadProjects();
                break;
            case 'donations':
                loadDonations();
                break;
            case 'users':
                loadUsers();
                break;
            case 'messages':
                loadMessages();
                break;
        }
    });
}

async function loadProjects() {
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = ''; 

    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        if (querySnapshot.empty) {
            projectsList.innerHTML = '<p>Nenhum projeto cadastrado.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const project = doc.data();
            const projectCard = document.createElement('div');
            projectCard.classList.add('project-card');
            projectCard.dataset.id = doc.id;

            let statusClass = '';
            switch (project.status) {
                case 'Ativo': statusClass = 'active'; break;
                case 'Inativo': statusClass = 'inactive'; break;
                case 'Finalizado': statusClass = 'finished'; break;
            }

            projectCard.innerHTML = `
                <div class="project-info">
                    <h3>${project.name}</h3>
                    <span class="status ${statusClass}">${project.status}</span>
                </div>
                <div class="project-actions">
                    <a href="captacao.html?id=${doc.id}" class="btn-action">Gerenciar</a>
                    <a href="cadastro-projeto.html?id=${doc.id}" class="btn-action">Editar</a>
                    <button class="btn-action btn-delete">Excluir</button>
                </div>
            `;
            projectsList.appendChild(projectCard);
        });

        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const card = e.target.closest('.project-card');
                const projectId = card.dataset.id;
                if (confirm('Tem certeza que deseja excluir este projeto?')) {
                    await deleteDoc(doc(db, "projects", projectId));
                    card.remove();
                }
            });
        });
    } catch (error) {
        console.error("Erro ao carregar projetos: ", error);
        projectsList.innerHTML = '<p>Ocorreu um erro ao carregar os projetos.</p>';
    }
}

async function loadProjectsIntoFilter() {
    const projectFilter = document.getElementById('filter-project');
    // Clear previous options except the first one
    projectFilter.innerHTML = '<option value="">Todos os Projetos</option>';
    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        querySnapshot.forEach((doc) => {
            const project = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar projetos no filtro: ", error);
    }
}

async function loadDonations() {
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';

    const filterDate = document.getElementById('filter-date').value;
    const filterProject = document.getElementById('filter-project').value;

    try {
        let donationsQuery = collection(db, "donations");
        
        if (filterProject) {
            donationsQuery = query(donationsQuery, where("projectId", "==", filterProject));
        }

        const querySnapshot = await getDocs(donationsQuery);
        if (querySnapshot.empty) {
            donationsList.innerHTML = '<tr><td colspan="6">Nenhuma doação encontrada.</td></tr>';
            return;
        }

        let donations = [];
        querySnapshot.forEach(doc => donations.push({ id: doc.id, ...doc.data() }));

        if (filterDate) {
            donations = donations.filter(d => {
                if (!d.date || typeof d.date.toDate !== 'function') {
                    return false;
                }
                const donationDate = d.date.toDate().toISOString().split('T')[0];
                return donationDate === filterDate;
            });
        }
        
        if (donations.length === 0) {
            donationsList.innerHTML = '<tr><td colspan="6">Nenhuma doação encontrada para os filtros selecionados.</td></tr>';
            return;
        }

        for (const donation of donations) {
            const projectDoc = await getDoc(doc(db, "projects", donation.projectId));
            const projectName = projectDoc.exists() ? projectDoc.data().name : "Projeto não encontrado";
            
            const row = document.createElement('tr');
            const donationDate = donation.date && donation.date.toDate ? donation.date.toDate().toLocaleDateString('pt-BR') : 'N/A';
            row.innerHTML = `
                <td>${donation.donorName || 'Anônimo'}</td>
                <td>${donationDate}</td>
                <td>R$ ${donation.value.toFixed(2).replace('.', ',')}</td>
                <td>${projectName}</td>
                <td><a href="${donation.proofUrl || '#'}" target="_blank" rel="noopener noreferrer">${donation.proofUrl ? 'Ver' : 'N/A'}</a></td>
                <td><a href="${donation.receiptUrl || '#'}" target="_blank" rel="noopener noreferrer">${donation.receiptUrl ? 'Ver' : 'N/A'}</a></td>
            `;
            donationsList.appendChild(row);
        }
    } catch (error) {
        console.error("Erro ao carregar doações: ", error);
        donationsList.innerHTML = '<tr><td colspan="6">Ocorreu um erro ao carregar as doações.</td></tr>';
    }
}

async function loadUsers() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        if (querySnapshot.empty) {
            usersList.innerHTML = '<tr><td colspan="3">Nenhum usuário cadastrado.</td></tr>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const row = document.createElement('tr');
            const registrationDate = user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A';
            row.innerHTML = `
                <td>${user.name || 'Não informado'}</td>
                <td>${user.email}</td>
                <td>${registrationDate}</td>
            `;
            usersList.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar usuários: ", error);
        usersList.innerHTML = '<tr><td colspan="3">Ocorreu um erro ao carregar os usuários.</td></tr>';
    }
}

async function loadMessages() {
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, "contactMessages"));
        if (querySnapshot.empty) {
            messagesList.innerHTML = '<p>Nenhuma mensagem encontrada.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const msg = doc.data();
            const messageItem = document.createElement('div');
            messageItem.classList.add('message-item');
            messageItem.innerHTML = `
                <div class="message-item-header">
                    <h4>${msg.subject}</h4>
                    <span>${msg.createdAt.toDate().toLocaleString('pt-BR')}</span>
                </div>
                <p><strong>De:</strong> ${msg.email}</p>
                <p>${msg.message}</p>
            `;
            messagesList.appendChild(messageItem);
        });
    } catch (error) {
        console.error("Erro ao carregar mensagens: ", error);
        messagesList.innerHTML = '<p>Ocorreu um erro ao carregar as mensagens.</p>';
    }
}
