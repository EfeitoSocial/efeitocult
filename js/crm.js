import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentFunnel = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        const userData = userDocSnap.data();
        if (userDocSnap.exists() && (userData.isAdmin || userData.profile === 'Operacional' || userData.profile === 'Técnico')) {
            document.getElementById('crm-link').style.display = 'block';
            if (userData.isAdmin) {
                document.getElementById('admin-link').style.display = 'block';
            }
            initializeCRM(userData);
        } else {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

async function initializeCRM(userData) {
    setupEventListeners();
    if (userData.isAdmin) {
        await ensureDefaultFunnelExists();
    }
    await loadFunnels();

    if (!userData.isAdmin) {
        document.getElementById('new-funnel-button').style.display = 'none';
        document.getElementById('delete-funnel-button').style.display = 'none';
        document.querySelector('.admin-actions').style.display = 'none';
    }
}

function setupEventListeners() {
    document.getElementById('new-funnel-button').addEventListener('click', () => openFunnelModal());
    document.getElementById('delete-funnel-button').addEventListener('click', deleteFunnel);
    document.querySelector('#funnel-modal .close-button').addEventListener('click', () => closeFunnelModal());
    document.getElementById('funnel-form').addEventListener('submit', handleFunnelFormSubmit);
    document.getElementById('funnel-select').addEventListener('change', handleFunnelSelection);
    document.getElementById('apply-filters-button').addEventListener('click', applyFilters);
    document.getElementById('export-leads-button').addEventListener('click', exportLeads);
    document.getElementById('import-leads-button').addEventListener('click', () => alert('Funcionalidade de importação em desenvolvimento.'));
}

async function ensureDefaultFunnelExists() {
    const funnelsCol = collection(db, 'funnels');
    const q = query(funnelsCol, where("name", "==", "Leads do Site"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        try {
            await addDoc(funnelsCol, {
                name: "Leads do Site",
                columns: ["Novo", "Em Análise", "Contato Realizado", "Convertido", "Descartado"]
            });
        } catch (error) {
            console.error("Erro ao criar funil padrão:", error);
        }
    }
}

async function loadFunnels() {
    const funnelsCol = collection(db, 'funnels');
    const funnelSnapshot = await getDocs(funnelsCol);
    const funnelList = funnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const funnelSelect = document.getElementById('funnel-select');
    funnelSelect.innerHTML = '<option value="">Selecione um Funil</option>';
    funnelList.forEach(funnel => {
        const option = document.createElement('option');
        option.value = funnel.id;
        option.textContent = funnel.name;
        option.dataset.columns = JSON.stringify(funnel.columns);
        funnelSelect.appendChild(option);
    });
}

async function handleFunnelSelection(event) {
    const funnelId = event.target.value;
    if (!funnelId) {
        document.getElementById('kanban-board').innerHTML = '';
        currentFunnel = null;
        return;
    }
    const selectedOption = event.target.options[event.target.selectedIndex];
    const columns = JSON.parse(selectedOption.dataset.columns);
    currentFunnel = { id: funnelId, name: selectedOption.textContent, columns: columns };
    
    renderColumns(columns);
    const leads = await fetchLeads(funnelId);
    renderCards(leads);
    addDragAndDropHandlers();
}

function openFunnelModal() {
    document.getElementById('funnel-modal').style.display = 'flex';
}

function closeFunnelModal() {
    document.getElementById('funnel-modal').style.display = 'none';
    document.getElementById('funnel-form').reset();
}

async function handleFunnelFormSubmit(event) {
    event.preventDefault();
    const funnelName = document.getElementById('funnel-name').value;
    const columnsStr = document.getElementById('funnel-columns').value;
    const columns = columnsStr.split(',').map(s => s.trim()).filter(Boolean);

    if (funnelName && columns.length > 0) {
        try {
            await addDoc(collection(db, 'funnels'), {
                name: funnelName,
                columns: columns
            });
            closeFunnelModal();
            await loadFunnels();
        } catch (error) {
            console.error("Erro ao criar novo funil:", error);
        }
    }
}

async function deleteFunnel() {
    if (!currentFunnel) {
        alert("Por favor, selecione um funil para apagar.");
        return;
    }

    if (confirm(`Tem certeza que deseja apagar o funil "${currentFunnel.name}"? Esta ação não pode ser desfeita.`)) {
        try {
            // Note: This does not delete the leads within the funnel. 
            // A more robust implementation would handle associated leads.
            await deleteDoc(doc(db, 'funnels', currentFunnel.id));
            currentFunnel = null;
            document.getElementById('kanban-board').innerHTML = '';
            await loadFunnels();
        } catch (error) {
            console.error("Erro ao apagar funil:", error);
        }
    }
}

function renderColumns(columns) {
    const kanbanBoard = document.getElementById('kanban-board');
    kanbanBoard.innerHTML = '';
    for (const columnName of columns) {
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.dataset.columnName = columnName;
        column.innerHTML = `<h3>${columnName}</h3><div class="kanban-cards"></div>`;
        kanbanBoard.appendChild(column);
    }
}

async function fetchLeads(funnelId, filters = {}) {
    if (!funnelId) return [];
    
    let q = query(collection(db, 'leads'), where("funnelId", "==", funnelId));

    if (filters.startDate) {
        q = query(q, where("createdAt", ">=", new Date(filters.startDate)));
    }
    if (filters.endDate) {
        q = query(q, where("createdAt", "<=", new Date(filters.endDate)));
    }
    if (filters.region) {
        q = query(q, where("region", "==", filters.region));
    }

    const leadSnapshot = await getDocs(q);
    const leadList = leadSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return leadList;
}

async function applyFilters() {
    if (!currentFunnel) {
        alert("Por favor, selecione um funil primeiro.");
        return;
    }
    const filters = {
        startDate: document.getElementById('start-date-filter').value,
        endDate: document.getElementById('end-date-filter').value,
        region: document.getElementById('region-filter').value
    };
    const leads = await fetchLeads(currentFunnel.id, filters);
    renderCards(leads);
    addDragAndDropHandlers();
}

function exportLeads() {
    if (!currentFunnel) {
        alert("Por favor, selecione um funil para exportar.");
        return;
    }
    
    const cards = document.querySelectorAll('.kanban-card');
    if (cards.length === 0) {
        alert("Não há leads para exportar neste funil.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = ["ID", "Nome", "Email", "Telefone", "Status", "Anotações"];
    csvContent += headers.join(",") + "\r\n";

    cards.forEach(card => {
        const leadId = card.dataset.leadId;
        // This is a simplified approach. A real implementation would fetch lead data again to ensure completeness.
        const name = card.querySelector('h4').textContent;
        const email = card.querySelector('p:nth-of-type(1)').textContent;
        const phone = card.querySelector('p:nth-of-type(2)').textContent;
        const status = card.closest('.kanban-column').dataset.columnName;
        
        const row = [leadId, name, email, phone, status, ""]; // Notes would need to be fetched
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentFunnel.name}_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderCards(leads) {
    // Clear existing cards
    document.querySelectorAll('.kanban-cards').forEach(col => col.innerHTML = '');

    leads.forEach(lead => {
        const status = lead.status || (currentFunnel && currentFunnel.columns.length > 0 ? currentFunnel.columns[0] : '');
        const column = document.querySelector(`.kanban-column[data-column-name="${status}"] .kanban-cards`);
        if (column) {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.leadId = lead.id;
            card.innerHTML = `
                <div class="card-content">
                    <h4>${lead.name}</h4>
                    <p>${lead.email}</p>
                    <p>${lead.phone}</p>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${lead.phone}" target="_blank" class="whatsapp-button">
                        <img src="imgs/marista/whatsapp.png" alt="WhatsApp">
                    </a>
                </div>
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

async function openLeadModal(lead) {
    const modal = document.getElementById('lead-modal');
    const form = document.getElementById('lead-form');

    const funnelsCol = collection(db, 'funnels');
    const funnelSnapshot = await getDocs(funnelsCol);
    const funnelList = funnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    form.innerHTML = `
        <input type="hidden" id="leadId" value="${lead.id}">
        <p><strong>Nome:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Telefone:</strong> ${lead.phone}</p>
        <p><strong>Valor Destinado:</strong> ${lead.amount || 'N/A'}</p>
        <div class="form-group">
            <label for="lead-notes">Anotações</label>
            <textarea id="lead-notes" rows="4">${lead.notes || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="lead-funnel">Funil</label>
            <select id="lead-funnel">
                ${funnelList.map(funnel => `<option value="${funnel.id}" ${lead.funnelId === funnel.id ? 'selected' : ''}>${funnel.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="lead-status">Status</label>
            <select id="lead-status">
                ${currentFunnel.columns.map(col => `<option value="${col}" ${lead.status === col ? 'selected' : ''}>${col}</option>`).join('')}
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
        const leadId = document.getElementById('leadId').value;
        const newFunnelId = document.getElementById('lead-funnel').value;
        const newStatus = document.getElementById('lead-status').value;
        const notes = document.getElementById('lead-notes').value;
        
        try {
            const leadRef = doc(db, 'leads', leadId);
            await updateDoc(leadRef, { 
                funnelId: newFunnelId,
                status: newStatus,
                notes: notes 
            });
            closeLeadModal();
            const leads = await fetchLeads(currentFunnel.id);
            renderCards(leads);
            addDragAndDropHandlers();
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
                const leads = await fetchLeads(currentFunnel.id);
                renderCards(leads);
                addDragAndDropHandlers();
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
