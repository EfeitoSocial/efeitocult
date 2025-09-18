import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { auth, db, storage } from './firebase.js';

let currentDonationId = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            const urlParams = new URLSearchParams(window.location.search);
            const donationId = urlParams.get('id');
            currentDonationId = donationId;
            if (donationId) {
                loadDonationDetails(donationId);
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

async function loadDonationDetails(donationId) {
    try {
        const docRef = doc(db, "donations", donationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const donation = docSnap.data();
            // Preencher o formulário com os dados da doação
            document.getElementById('donor-name').value = donation.donorName || '';
            document.getElementById('donor-cpf').value = donation.donorCpf || '';
            // ... preencher outros campos ...
            document.getElementById('donation-value').value = `R$ ${donation.value.toFixed(2).replace('.', ',')}`;

            // Carregar a imagem do comprovante
            if (donation.proofUrl) {
                const proofImage = document.querySelector('.proof-image-placeholder img');
                const proofPlaceholder = document.querySelector('.placeholder-icon');
                const downloadButton = document.querySelector('.download-proof-button');
                
                const proofRef = ref(storage, donation.proofUrl);
                getDownloadURL(proofRef).then((url) => {
                    proofImage.src = url;
                    proofImage.style.display = 'block';
                    proofPlaceholder.style.display = 'none';
                    downloadButton.onclick = () => window.open(url, '_blank');
                });
            }
        } else {
            console.log("Nenhuma doação encontrada!");
        }
    } catch (error) {
        console.error("Erro ao carregar detalhes da doação: ", error);
    }
}

// --- Lógica dos Modais ---

const rejectModal = document.getElementById('reject-modal');
const sendReceiptModal = document.getElementById('send-receipt-modal');
const successModal = document.getElementById('success-modal');

const btnReject = document.querySelector('.btn-reject');
const btnAccept = document.querySelector('.btn-accept');

// Abrir modais
btnReject.addEventListener('click', () => rejectModal.style.display = 'flex');
btnAccept.addEventListener('click', () => {
    // Preencher dados do modal de envio
    document.getElementById('investor-name').value = document.getElementById('donor-name').value;
    document.getElementById('receipt-value').value = document.getElementById('donation-value').value;
    sendReceiptModal.style.display = 'flex';
});

// Fechar modais
function closeModal(modal) {
    modal.style.display = 'none';
}

document.querySelectorAll('.close-button').forEach(button => {
    button.onclick = () => {
        closeModal(rejectModal);
        closeModal(sendReceiptModal);
        closeModal(successModal);
    }
});

document.querySelector('.btn-cancel').onclick = () => closeModal(rejectModal);
document.querySelector('.btn-close-modal').onclick = () => {
    closeModal(successModal);
    window.location.href = `captacao.html?id=${new URLSearchParams(window.location.search).get('projectId')}`; // Voltar para a captação
};

// Lógica do formulário de recusa
document.getElementById('reject-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('rejection-reason').value;
    if (!currentDonationId || !reason) return;

    try {
        const donationRef = doc(db, "donations", currentDonationId);
        await updateDoc(donationRef, {
            proofStatus: 'rejected',
            rejectionReason: reason,
            status: 'pending_resubmission'
        });
        // Adicionar notificação para o usuário aqui
        alert('Comprovante recusado. O doador será notificado.');
        closeModal(rejectModal);
    } catch (error) {
        console.error("Erro ao recusar comprovante: ", error);
    }
});

// Lógica do formulário de envio de recibo
const sendReceiptForm = document.getElementById('send-receipt-form');
const fileInput = document.getElementById('receipt-file-input');
const selectFileBtn = document.querySelector('.btn-select-file');
const submitReceiptBtn = document.querySelector('.btn-submit-receipt');
let selectedFile = null;

selectFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        // Mostrar preview do arquivo
        const filePreview = document.querySelector('.file-preview');
        filePreview.textContent = selectedFile.name;
        filePreview.style.display = 'block';
        submitReceiptBtn.disabled = false;
    }
});

sendReceiptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentDonationId || !selectedFile) return;

    try {
        // 1. Fazer upload do arquivo para o Storage
        const receiptRef = ref(storage, `receipts/${currentDonationId}/${selectedFile.name}`);
        await uploadBytes(receiptRef, selectedFile);
        const receiptUrl = await getDownloadURL(receiptRef);

        // 2. Atualizar o documento da doação no Firestore
        const donationRef = doc(db, "donations", currentDonationId);
        await updateDoc(donationRef, {
            receiptUrl: receiptUrl,
            receiptStatus: 'sent',
            status: 'completed'
        });

        closeModal(sendReceiptModal);
        successModal.style.display = 'flex';

    } catch (error) {
        console.error("Erro ao enviar recibo: ", error);
    }
});
