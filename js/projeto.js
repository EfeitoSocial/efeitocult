import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const potentialValueSpan = document.querySelector('.potential-value span');
const investmentForm = document.querySelector('.investment-form');
const investmentValueInput = document.getElementById('investment-value');
const logoutButton = document.getElementById('logout-button');

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
investmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawValue = investmentValueInput.value.replace(/\D/g, '');
    const investmentAmount = parseFloat(rawValue) / 100;

    if (isNaN(investmentAmount) || investmentAmount <= 0) {
        alert('Por favor, insira um valor de investimento válido.');
        return;
    }

    const user = auth.currentUser;
    if (user) {
        try {
            const investmentsColRef = collection(db, "users", user.uid, "investments");
            await addDoc(investmentsColRef, {
                amount: investmentAmount,
                date: new Date().toISOString(),
                status: 'pending_receipt',
                receiptUrl: null,
                projectName: 'Museu InterativaMENTE'
            });
            alert('Investimento realizado com sucesso! Você pode enviar o comprovante no dashboard.');
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error("Error saving investment: ", error);
            alert('Ocorreu um erro ao salvar seu investimento.');
        }
    }
});

investmentValueInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    e.target.value = value === 'NaN' ? '' : 'R$ ' + value;
});
