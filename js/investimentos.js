import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- ELEMENTOS DO DOM ---
const userNameSpan = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-button');
const potentialValueSpan = document.getElementById('potential-value');
const investmentsList = document.getElementById('investments-list');
const yearFilter = document.getElementById('year-filter');
const notificationBadge = document.querySelector('.notification-badge');
const adminLink = document.getElementById('admin-link');
const crmLink = document.getElementById('crm-link');

// Modal de Exclusão
const deleteModal = document.getElementById('delete-modal');
const closeModalButton = deleteModal.querySelector('.close-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
let investmentIdToDelete = null;

// --- HELPERS ---
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ de/g, '').replace('.', '');

// --- RENDERIZAÇÃO ---
const renderInvestments = (investments, selectedYear) => {
    investmentsList.innerHTML = '';
    let pendingNotifications = 0;

    const filteredInvestments = investments.filter(inv => new Date(inv.date).getFullYear().toString() === selectedYear);

    if (filteredInvestments == 0) {
        investmentsList.innerHTML = '<p>Nenhum investimento encontrado para este ano.</p>';
        return;
    }
    
    filteredInvestments.forEach(inv => {
        if (inv.status === 'pending_receipt') {
            pendingNotifications++;
        }

        const card = document.createElement('div');
        card.className = 'investment-card';
        card.dataset.id = inv.id; 

        let actionButtons = '';
        switch (inv.status) {
            case 'pending_receipt':
                actionButtons = `
                    <button class="btn btn-send">Enviar comprovante</button>
                    <input type="file" class="file-input" style="display: none;">
                    <button class="btn btn-delete">Excluir</button>
                `;
                break;
            case 'receipt_uploaded':
                actionButtons = `<a href="${inv.receiptUrl}" target="_blank" class="btn btn-view">Ver comprovante</a>`;
                break;
            case 'receipt_approved':
                actionButtons = `
                    <a href="${inv.receiptUrl}" target="_blank" class="btn btn-view">Ver comprovante</a>
                    <a href="${inv.finalReceiptUrl}" target="_blank" class="btn btn-view">Ver recibo</a>
                `;
                break;
        }
        card.innerHTML = `
            <div class="investment-info">
                <span class="project-name">${inv.projectName || 'Investimento Social'}</span>
                <span class="investment-date">${formatDate(inv.date)}</span>
                <span class="investment-amount">${formatCurrency(inv.amount)}</span>
            </div>
            <div class="investment-actions">
                ${actionButtons}
            </div>
        `;
        investmentsList.appendChild(card);
    });


    if (pendingNotifications > 0) {
        notificationBadge.textContent = pendingNotifications;
        notificationBadge.style.display = 'inline-block';
    } else {
        notificationBadge.style.display = 'none';
    }
    
};

// --- BUSCA DE DADOS ---
const fetchUserData = async (uid) => {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userNameSpan) userNameSpan.textContent = userData.firstName || "Usuário";
            if (userData.isAdmin) {
                adminLink.style.display = 'block';
                crmLink.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
    }

    try {
        const investmentsColRef = collection(db, "users", uid, "investments");
        const investmentsSnapshot = await getDocs(investmentsColRef);
        const investments = investmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderInvestments(investments, yearFilter.value);

        const potentialColRef = collection(db, "users", uid, "potential");
        const potentialSnapshot = await getDocs(potentialColRef);
        const potential = potentialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalPotential = potential.sort((a, b) => new Date(b.date) - new Date(a.date));
        potentialValueSpan.textContent = formatCurrency(totalPotential[0].amount);

        yearFilter.addEventListener('change', () => {
            renderInvestments(investments, yearFilter.value);
        });

    } catch (error) {
        console.error("Erro ao buscar investimentos:", error);
    }
};

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).catch((error) => console.error('Erro ao sair:', error));
    });
}

// --- MODAL ---
const openModal = (id) => {
    investmentIdToDelete = id;
    deleteModal.style.display = 'flex';
};

const closeModal = () => {
    investmentIdToDelete = null;
    deleteModal.style.display = 'none';
};

closeModalButton.addEventListener('click', closeModal);
cancelDeleteButton.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target == deleteModal) {
        closeModal();
    }
});

// --- EVENT LISTENERS ---
investmentsList.addEventListener('click', async (e) => {
    const user = auth.currentUser;
    if (!user) return;

    const card = e.target.closest('.investment-card');
    if (!card) return;
    const investmentId = card.dataset.id;

    if (e.target.classList.contains('btn-delete')) {
        openModal(investmentId);
    }

    if (e.target.classList.contains('btn-send')) {
        const fileInput = card.querySelector('.file-input');
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
                fetchUserData(user.uid);
            } catch (error) {
                console.error("Falha no upload:", error);
            }
        };
    }
});

confirmDeleteButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user || !investmentIdToDelete) return;

    try {
        await deleteDoc(doc(db, "users", user.uid, "investments", investmentIdToDelete));
        fetchUserData(user.uid);
        closeModal();
    } catch (error) {
        console.error("Erro ao excluir investimento:", error);
    }
});
