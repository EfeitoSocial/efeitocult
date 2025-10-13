import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLUMNS = ['Novo', 'Em Contato', 'Proposta Enviada', 'Negociação', 'Ganhos'];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
            document.getElementById('admin-link').style.display = 'block';
            document.getElementById('crm-link').style.display = 'block';
            initializeCRM();
        } else {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

async function initializeCRM() {
    renderColumns();
    const leads = await fetchLeads();
    renderCards(leads);
}

function renderColumns() {
    const kanbanBoard = document.getElementById('kanban-board');
    kanbanBoard.innerHTML = '';
    for (const columnName of COLUMNS) {
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.dataset.columnName = columnName;
        column.innerHTML = `<h3>${columnName}</h3><div class="kanban-cards"></div>`;
        kanbanBoard.appendChild(column);
    }
    addDragAndDropHandlers();
}

async function fetchLeads() {
    const leadsCol = collection(db, 'leads');
    const leadSnapshot = await getDocs(leadsCol);
    const leadList = leadSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return leadList;
}

function renderCards(leads) {
    // Clear existing cards
    document.querySelectorAll('.kanban-cards').forEach(col => col.innerHTML = '');

    leads.forEach(lead => {
        const status = lead.status || 'Novo';
        const column = document.querySelector(`.kanban-column[data-column-name="${status}"] .kanban-cards`);
        if (column) {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.leadId = lead.id;
            card.innerHTML = `
                <h4>${lead.name}</h4>
                <p>${lead.email}</p>
                <p>${lead.phone}</p>
            `;
            card.addEventListener('click', () => openLeadModal(lead));
            column.appendChild(card);
        }
    });
}

function addDragAndDropHandlers() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column .kanban-cards');

    cards.forEach(card => {
        card.addEventListener('dragstart', () => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
    });

    columns.forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            column.appendChild(dragging);
        });

        column.addEventListener('drop', async e => {
            e.preventDefault();
            const card = document.querySelector('.dragging');
            const newStatus = column.parentElement.dataset.columnName;
            const leadId = card.dataset.leadId;
            
            try {
                const leadRef = doc(db, 'leads', leadId);
                await updateDoc(leadRef, { status: newStatus });
            } catch (error) {
                console.error("Erro ao atualizar status do lead:", error);
            }
        });
    });
}

function openLeadModal(lead) {
    const modal = document.getElementById('lead-modal');
    const form = document.getElementById('lead-form');
    form.innerHTML = `
        <input type="hidden" id="leadId" value="${lead.id}">
        <p><strong>Nome:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Telefone:</strong> ${lead.phone}</p>
        <p><strong>Valor Destinado:</strong> ${lead.amount}</p>
        <div class="form-group">
            <label for="lead-status">Status</label>
            <select id="lead-status">
                ${COLUMNS.map(col => `<option value="${col}" ${lead.status === col ? 'selected' : ''}>${col}</option>`).join('')}
            </select>
        </div>
        <div class="modal-actions">
            <button type="submit">Salvar</button>
            <button type="button" id="delete-lead-button" class="btn-danger">Excluir</button>
        </div>
    `;
    modal.style.display = 'flex';

    form.onsubmit = async (e) => {
        e.preventDefault();
        const newStatus = document.getElementById('lead-status').value;
        const leadId = document.getElementById('leadId').value;
        try {
            const leadRef = doc(db, 'leads', leadId);
            await updateDoc(leadRef, { status: newStatus });
            closeLeadModal();
            const leads = await fetchLeads();
            renderCards(leads);
        } catch (error) {
            console.error("Erro ao atualizar lead:", error);
        }
    };

    document.getElementById('delete-lead-button').onclick = async () => {
        if (confirm('Tem certeza que deseja excluir este lead?')) {
            const leadId = document.getElementById('leadId').value;
            try {
                await deleteDoc(doc(db, 'leads', leadId));
                closeLeadModal();
                const leads = await fetchLeads();
                renderCards(leads);
            } catch (error) {
                console.error("Erro ao excluir lead:", error);
            }
        }
    };
}

function closeLeadModal() {
    const modal = document.getElementById('lead-modal');
    modal.style.display = 'none';
}

document.querySelector('#lead-modal .close-button').addEventListener('click', closeLeadModal);
