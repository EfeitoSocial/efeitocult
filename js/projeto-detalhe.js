import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM ELEMENTS ---
const logoutButton = document.getElementById('logout-button');
const adminLink = document.getElementById('admin-link');
const projectName = document.getElementById('project-name');
const projectCategory = document.querySelector('.project-category-detail');
const projectLocation = document.getElementById('project-location');
const projectSummary = document.getElementById('project-summary');
const projectImpact = document.getElementById('project-impact');
const projectLocationsList = document.getElementById('project-locations-list');
const projectObjectivesList = document.getElementById('project-objectives-list');
const goalAmount = document.getElementById('goal-amount');
const raisedAmount = document.getElementById('raised-amount');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentage = document.getElementById('progress-percentage');
const userPotential = document.getElementById('user-potential');
const investButton = document.getElementById('invest-button');
const investmentAmountInput = document.getElementById('investment-amount');

// --- HELPERS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- AUTH & DATA FETCHING ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchPageData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});

async function fetchPageData(uid) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        document.querySelector('.project-main-content').innerHTML = '<h1>Projeto não encontrado.</h1>';
        return;
    }

    try {
        // Fetch user data (for admin check and potential)
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.isAdmin) {
                adminLink.style.display = 'block';
            }
            // You might want to display the user's investment potential here
            // userPotential.textContent = formatCurrency(userData.investmentPotential || 0);
        }

        // Fetch project data
        const projectDocRef = doc(db, "projects", projectId);
        const projectDocSnap = await getDoc(projectDocRef);

        if (projectDocSnap.exists()) {
            const projectData = projectDocSnap.data();
            renderProjectDetails(projectData);
        } else {
            document.querySelector('.project-main-content').innerHTML = '<h1>Projeto não encontrado.</h1>';
        }

    } catch (error) {
        console.error("Error fetching page data:", error);
    }
}

function renderProjectDetails(project) {
    projectName.textContent = project.name;
    projectCategory.textContent = project.category || 'Categoria';
    projectLocation.textContent = project.location || 'Localização';
    projectSummary.textContent = project.summary || 'Resumo não disponível.';
    projectImpact.textContent = project.impact || 'Impacto não disponível.';
    goalAmount.textContent = formatCurrency(project.goalAmount || 0);

    // Render lists
    projectLocationsList.innerHTML = (project.benefitedLocations || []).map(item => `<li>${item}</li>`).join('');
    projectObjectivesList.innerHTML = (project.objectives || []).map(item => `<li>${item}</li>`).join('');

    // Handle investment logic here (this is a simplified example)
    const currentlyRaised = 0; // This should be calculated from actual donations
    const percentage = project.goalAmount ? (currentlyRaised / project.goalAmount) * 100 : 0;
    raisedAmount.textContent = formatCurrency(currentlyRaised);
    progressBarFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage.toFixed(0)}%`;
}

investButton.addEventListener('click', async () => {
    const amountValue = parseFloat(investmentAmountInput.value.replace(/[^0-9,-]+/g,"").replace(",","."));
    if (isNaN(amountValue) || amountValue <= 0) {
        alert('Por favor, insira um valor de investimento válido.');
        return;
    }

    const user = auth.currentUser;
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (user && projectId) {
        try {
            await addDoc(collection(db, "donations"), {
                userId: user.uid,
                projectId: projectId,
                value: amountValue,
                donationDate: new Date(),
                proofUrl: null,
                proofStatus: 'pending',
                receiptStatus: 'pending'
            });
            alert('Investimento registrado com sucesso! Por favor, envie o comprovante na página "Meus Investimentos".');
            window.location.href = 'investimentos.html';
        } catch (error) {
            console.error("Erro ao registrar investimento: ", error);
            alert('Ocorreu um erro ao registrar seu investimento.');
        }
    }
});
