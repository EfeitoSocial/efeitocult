import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- DOM ELEMENTS ---
const logoutButton = document.getElementById('logout-button');
const adminLink = document.getElementById('admin-link');
const crmLink = document.getElementById('crm-link');
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
const userPotentialSpan = document.getElementById('user-potential');
const investButton = document.getElementById('invest-button');
const doneButton = document.getElementById('done');


// --- HELPERS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- AUTH & DATA FETCHING ---
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

investButton.addEventListener('click', async () => {
    const value = parseFloat(investmentAmountInput.value.replace(/[^0-9,-]+/g,"").replace(",","."));
    if (isNaN(value) || value <= 0) {
        alert('Por favor, insira um valor de investimento válido.');
        return;
    }
});

doneButton.addEventListener('click', async () => {
    const amountValue = parseFloat(investmentAmountInput.value.replace(/[^0-9,-]+/g,"").replace(",","."));
    const user = auth.currentUser;
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    let projectNm = '';
    if(projectId == 'ifyrRrQLUs0a9VZAUmtm'){
        projectNm = 'O futuro é para todos - Ano 2 (Estado do Paraná)';
    }else if(projectId == 'AU62y1EDDjNh7YlGQpPS'){
        projectNm = 'O futuro é para todos - Ano 3 (Estado de São Paulo)';
    }

    if (user && projectId){
        try {
            
            await addDoc(collection(db, "donations"), {
                userId: user.uid,
                projectId: projectId,
                projectName: projectNm,
                amount: amountValue,
                date: new Date().toISOString(),
                receiptUrl: null,
                status: 'pending_receipt'
            });
            
            await addDoc(collection(db, "users", user.uid, "investments"), {
                projectId: projectId,
                projectName: projectNm,
                amount: amountValue,
                date: new Date().toISOString(),
                receiptUrl: null,
                status: 'pending_receipt'
            });
            alert('Investimento registrado com sucesso! Por favor, envie o comprovante na página "Meus Investimentos".');
            window.location.href = 'investimentos.html';
        } catch (error) {
            console.error("Erro ao registrar investimento: ", error);
            alert('Ocorreu um erro ao registrar seu investimento.');
        }
    }
});


// --- USER POTENCIAL ---
const fetchUserData = async (uid) => {
    try {
        const potentialColRef = collection(db, "users", uid, "potential");
        const potentialSnapshot = await getDocs(potentialColRef);
        const potential = potentialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const totalPotential = potential.sort((a, b) => new Date(b.date) - new Date(a.date));
        userPotentialSpan.textContent = formatCurrency(totalPotential[0].amount);

    } catch (error) {
        console.error("Erro ao buscar investimentos:", error);
    }
};
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// --- INVESTMENT AMOUNT ON POPUP ---
let investmentAmountSpan = document.getElementById('donation-amount');
const investmentAmountInput = document.getElementById('investment-amount');
investmentAmountSpan.textContent = "R$ 0,00";
investmentAmountInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    e.target.value = value === 'NaN' ? '' : 'R$' + value;
    investmentAmountSpan.textContent = value === 'NaN' ? '' : 'R$ ' + value;
});
