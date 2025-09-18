import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const potentialValueSpan = document.querySelector('.potential-value span');
const investmentForm = document.querySelector('.investment-form');
const investmentValueInput = document.getElementById('investment-value');
const investButton = document.querySelector('.btn-invest');
const logoutButton = document.getElementById('logout-button');

// Modal Elements
const paymentModal = document.getElementById('payment-modal');
const closeModalButton = document.querySelector('.close-button');
const modalProjectName = document.getElementById('modal-project-name');
const modalInvestmentValue = document.getElementById('modal-investment-value');
const pixCodeSpan = document.getElementById('pix-code');
const copyCodeButton = document.querySelector('.btn-copy-code');
const confirmInvestmentButton = document.querySelector('.btn-confirm-investment');


// --- HELPERS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- DATA FETCHING ---
const fetchUserData = async (uid) => {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists() && docSnap.data().investmentPotential) {
            const potential = docSnap.data().investmentPotential;
            potentialValueSpan.textContent = formatCurrency(potential);
        } else {
            potentialValueSpan.textContent = formatCurrency(0);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});

// --- EVENT LISTENERS ---
investButton.addEventListener('click', (e) => {
    e.preventDefault();
    const rawValue = investmentValueInput.value.replace(/\D/g, '');
    const investmentAmount = parseFloat(rawValue) / 100;

    if (isNaN(investmentAmount) || investmentAmount <= 0) {
        alert('Por favor, insira um valor de investimento válido.');
        return;
    }

    // Preenche os dados do modal e o exibe
    modalInvestmentValue.textContent = formatCurrency(investmentAmount);
    paymentModal.style.display = 'flex';
});

// --- MODAL LOGIC ---
closeModalButton.addEventListener('click', () => {
    paymentModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
        paymentModal.style.display = 'none';
    }
});

copyCodeButton.addEventListener('click', () => {
    navigator.clipboard.writeText(pixCodeSpan.textContent)
        .then(() => alert('Código PIX copiado com sucesso!'))
        .catch(err => console.error('Erro ao copiar código: ', err));
});

confirmInvestmentButton.addEventListener('click', async () => {
    const rawValue = investmentValueInput.value.replace(/\D/g, '');
    const investmentAmount = parseFloat(rawValue) / 100;
    const user = auth.currentUser;

    if (user && !isNaN(investmentAmount) && investmentAmount > 0) {
        try {
            const investmentsColRef = collection(db, "users", user.uid, "investments");
            await addDoc(investmentsColRef, {
                amount: investmentAmount,
                date: new Date().toISOString(),
                status: 'pending_receipt',
                receiptUrl: null,
                projectName: 'Museu InterativaMENTE'
            });
            alert('Seu investimento foi registrado. Por favor, envie o comprovante no dashboard.');
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error("Error saving investment: ", error);
            alert('Ocorreu um erro ao salvar seu investimento.');
        }
    } else {
        alert('Ocorreu um erro. Verifique o valor do investimento e tente novamente.');
    }
});


investmentValueInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    e.target.value = value === 'NaN' ? '' : 'R$ ' + value;
});
