import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const userNameSpan = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-button');
const calculatorForm = document.getElementById('calculator-form');
const taxDueInput = document.getElementById('tax-due');
const potentialValueSpan = document.getElementById('potential-value');
const investmentPotentialResult = document.getElementById('investment-potential-result');
const receiptsSection = document.getElementById('receipts-section');
const receiptsList = document.getElementById('receipts-list');

// --- HELPERS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
    }).replace(/ de/g, '').replace('.', '');
};

// --- RENDER FUNCTION ---
const renderInvestments = (investments) => {
    receiptsList.innerHTML = ''; // Clear the list before rendering

    // Calculate the total investment potential
    const totalPotential = investments.reduce((sum, inv) => sum + inv.amount, 0);
    potentialValueSpan.textContent = formatCurrency(totalPotential);

    if (investments.length === 0) {
        receiptsSection.style.display = 'none'; // Hide if no investments
        return;
    }
    
    receiptsSection.style.display = 'block'; // Show if there are investments

    investments.sort((a, b) => new Date(b.date) - new Date(a.date)); // Show newest first

    investments.forEach(inv => {
        const item = document.createElement('div');
        item.className = 'receipt-item';
        item.dataset.id = inv.id;

        const actionButtons = inv.receiptUrl
            ? `<a href="${inv.receiptUrl}" target="_blank" class="btn-view">Ver comprovante</a>`
            : `<button class="btn-upload">Enviar comprovante</button><input type="file" class="file-input" style="display: none;">`;

        const projectName = inv.projectName || 'Investimento Social';

        item.innerHTML = `
            <div class="receipt-info">
                <span class="project-name">${projectName}</span>
                <span class="receipt-date">${formatDate(inv.date)}</span>
                <span class="receipt-amount">${formatCurrency(inv.amount)}</span>
            </div>
            <div class="receipt-actions">
                ${actionButtons}
                <button class="btn-delete">Excluir</button>
            </div>
        `;
        receiptsList.appendChild(item);
    });
};

// --- DATA FETCHING ---
const fetchUserData = async (uid) => {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            userNameSpan.textContent = docSnap.data().firstName;
        } else {
            userNameSpan.textContent = "Usuário";
        }

        const investmentsColRef = collection(db, "users", uid, "investments");
        const investmentsSnapshot = await getDocs(investmentsColRef);
        const investments = investmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderInvestments(investments);

    } catch (error) {
        console.error("Error fetching user data:", error);
        userNameSpan.textContent = "Usuário";
    }
};

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        userNameSpan.textContent = "Carregando...";
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
calculatorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawValue = taxDueInput.value.replace(/\D/g, '');
    const taxDue = parseFloat(rawValue) / 100;

    if (isNaN(taxDue) || taxDue <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }

    const investmentPotential = taxDue * 0.06;
    investmentPotentialResult.textContent = formatCurrency(investmentPotential);

    const user = auth.currentUser;
    if (user) {
        try {
            const investmentsColRef = collection(db, "users", user.uid, "investments");
            await addDoc(investmentsColRef, {
                amount: investmentPotential,
                date: new Date().toISOString(),
                status: 'pending_receipt',
                receiptUrl: null
            });
            fetchUserData(user.uid); // Refresh the list
        } catch (error) {
            console.error("Error saving investment: ", error);
        }
    }
});

receiptsList.addEventListener('click', async (e) => {
    const user = auth.currentUser;
    if (!user) return;

    const investmentItem = e.target.closest('.receipt-item');
    if (!investmentItem) return;
    const investmentId = investmentItem.dataset.id;

    // Handle Delete
    if (e.target.classList.contains('btn-delete')) {
        if (confirm('Tem certeza que deseja excluir este investimento?')) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "investments", investmentId));
                fetchUserData(user.uid); // Refresh the list
            } catch (error) {
                console.error("Error deleting investment: ", error);
            }
        }
    }

    // Handle Upload
    if (e.target.classList.contains('btn-upload')) {
        const fileInput = investmentItem.querySelector('.file-input');
        fileInput.click();
        fileInput.onchange = async () => {
            const file = fileInput.files[0];
            if (!file) return;
            
            const storageRef = ref(storage, `receipts/${user.uid}/${investmentId}/${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                await updateDoc(doc(db, "users", user.uid, "investments", investmentId), {
                    receiptUrl: downloadURL,
                    status: 'receipt_uploaded'
                });
                alert('Comprovante enviado com sucesso!');
                fetchUserData(user.uid); // Refresh the list
            } catch (error) {
                console.error("Upload failed:", error);
            }
        };
    }
});

taxDueInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    e.target.value = value === 'NaN' ? '' : 'R$ ' + value;
});
