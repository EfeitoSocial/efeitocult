import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        // Standardized check for isAdmin field
        if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('id');
            if (projectId) {
                loadProjectDetails(projectId);
                loadDonations(projectId);

                document.getElementById('edit-project-button').addEventListener('click', () => {
                    window.location.href = `cadastro-projeto.html?id=${projectId}`;
                });

            } else {
                window.location.href = 'admin.html';
            }
        } else {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

async function loadProjectDetails(projectId) {
    const projectTitle = document.querySelector('.main-header h1');
    const goalAmountCard = document.getElementById('goal-amount-card');
    const bannerSection = document.getElementById('project-banner-section');
    const bannerImage = document.getElementById('project-banner-image');
    const descriptionText = document.getElementById('project-description-text');
    
    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const project = docSnap.data();
            projectTitle.textContent = project.name;
            
            // Format and display the goal amount
            if (project.goalAmount) {
                goalAmountCard.textContent = project.goalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            // Display banner if URL exists
            if (project.bannerUrl) {
                bannerImage.src = project.bannerUrl;
                bannerSection.style.display = 'block';
            }

            // Display description
            descriptionText.textContent = project.description || 'Nenhuma descrição fornecida.';

            // Atualizar os outros cards de resumo (validado, etc.)
        } else {
            console.log("Nenhum projeto encontrado!");
            projectTitle.textContent = "Projeto não encontrado";
        }
    } catch (error) {
        console.error("Erro ao carregar detalhes do projeto: ", error);
    }
}

async function loadDonations(projectId) {
    const donationsTableBody = document.querySelector('.donations-table tbody');
    const validatedAmountCard = document.getElementById('validated-amount-card');
    const pendingAmountCard = document.getElementById('pending-amount-card');
    donationsTableBody.innerHTML = '';

    let totalValidated = 0;
    let totalPending = 0;

    try {
        const q = query(collection(db, "donations"), where("projectId", "==", projectId));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
            const donation = doc.data();

            // Calculate totals based on proofStatus
            if (donation.proofStatus === 'validated') {
                totalValidated += donation.value;
            } else { // Assuming other statuses are pending
                totalPending += donation.value;
            }

            const tableRow = document.createElement('tr');
            tableRow.dataset.id = doc.id;

            // Simplificando a formatação da data
            const date = donation.date.toDate().toLocaleDateString('pt-BR');

            tableRow.innerHTML = `
                <td>${donation.donorName}</td>
                <td>${date}</td>
                <td>R$ ${donation.value.toFixed(2).replace('.', ',')}</td>
                <td><span class="status-icon ${donation.proofStatus}">${donation.proofStatus === 'validated' ? '&#10003;' : '!'}</span></td>
                <td><span class="status-icon ${donation.receiptStatus}">${donation.receiptStatus === 'sent' ? '&#10003;' : '!'}</span></td>
            `;

            tableRow.addEventListener('click', () => {
                window.location.href = `emissao-recibo.html?id=${doc.id}`;
            });

            donationsTableBody.appendChild(tableRow);
        });

        // Update the summary cards with the calculated totals
        const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        validatedAmountCard.textContent = formatCurrency(totalValidated);
        pendingAmountCard.textContent = formatCurrency(totalPending);

    } catch (error) {
        console.error("Erro ao carregar doações: ", error);
    }
}
