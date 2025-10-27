import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentFunnel = null;
let activeChatLead = null; // Variável para guardar o lead do chat ativo

document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('edit-funnel-button').addEventListener('click', () => openFunnelModal(true));
    document.getElementById('delete-funnel-button').addEventListener('click', deleteFunnel);
    document.querySelector('#funnel-modal .close-button').addEventListener('click', () => closeFunnelModal());
    document.querySelector('#whatsapp-chat-modal .close-button').addEventListener('click', closeWhatsAppChatModal);
    document.getElementById('funnel-form').addEventListener('submit', handleFunnelFormSubmit);
    document.getElementById('funnel-select').addEventListener('change', handleFunnelSelection);
    document.getElementById('apply-filters-button').addEventListener('click', applyFilters);
    document.getElementById('export-leads-button').addEventListener('click', exportLeads);
    document.getElementById('import-leads-button').addEventListener('click', importLeads);
}

async function ensureDefaultFunnelExists() {
    const funnelsCol = collection(db, 'funnels');
    const funnelSnapshot = await getDocs(funnelsCol);
    const funnelList = funnelSnapshot.docs.map(doc => doc.data());

    const defaultFunnelExists = funnelList.some(funnel => funnel.name === "Leads do Site");

    if (!defaultFunnelExists) {
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

function openFunnelModal(isEdit = false) {
    const modal = document.getElementById('funnel-modal');
    const form = document.getElementById('funnel-form');
    const modalTitle = modal.querySelector('h2');

    form.reset();
    document.getElementById('funnel-id').value = '';

    if (isEdit) {
        if (!currentFunnel) {
            alert("Por favor, selecione um funil para editar.");
            return;
        }
        modalTitle.textContent = 'Editar Funil';
        document.getElementById('funnel-id').value = currentFunnel.id;
        document.getElementById('funnel-name').value = currentFunnel.name;
        document.getElementById('funnel-columns').value = currentFunnel.columns.join(', ');
    } else {
        modalTitle.textContent = 'Novo Funil';
    }

    modal.style.display = 'flex';
}

function closeFunnelModal() {
    document.getElementById('funnel-modal').style.display = 'none';
    document.getElementById('funnel-form').reset();
}

async function handleFunnelFormSubmit(event) {
    event.preventDefault();
    const funnelId = document.getElementById('funnel-id').value;
    const funnelName = document.getElementById('funnel-name').value;
    const columnsStr = document.getElementById('funnel-columns').value;
    const columns = columnsStr.split(',').map(s => s.trim()).filter(Boolean);

    if (funnelName && columns.length > 0) {
        const funnelData = {
            name: funnelName,
            columns: columns
        };

        try {
            if (funnelId) {
                // Atualiza um funil existente
                const funnelRef = doc(db, 'funnels', funnelId);
                await updateDoc(funnelRef, funnelData);
            } else {
                // Cria um novo funil
                await addDoc(collection(db, 'funnels'), funnelData);
            }
            closeFunnelModal();
            await loadFunnels();
            // Recarrega o funil atual se ele foi o editado
            if (currentFunnel && currentFunnel.id === funnelId) {
                currentFunnel = { ...currentFunnel, ...funnelData };
                renderColumns(currentFunnel.columns);
                const leads = await fetchLeads(currentFunnel.id);
                renderCards(leads);
                addDragAndDropHandlers();
            }
        } catch (error) {
            console.error("Erro ao salvar funil:", error);
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

async function exportLeads() {
    if (!currentFunnel) {
        alert("Por favor, selecione um funil para exportar.");
        return;
    }

    const leadsToExport = await fetchLeads(currentFunnel.id);

    if (leadsToExport.length === 0) {
        alert("Não há leads para exportar neste funil.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = ["ID", "Nome", "E-mail", "Telefone", "Endereço", "Cidade", "Estado", "CEP", "Escola", "CPF", "Status", "Valor Destinado", "Anotações", "Data de Criação"];
    csvContent += headers.join(",") + "\r\n";

    leadsToExport.forEach(lead => {
        const createdAt = lead.createdAt && lead.createdAt.toDate ? lead.createdAt.toDate().toLocaleString('pt-BR') : 'N/A';
        const row = [
            `"${lead.id || ''}"`,
            `"${lead.name || ''}"`,
            `"${lead.email || ''}"`,
            `"${lead.phone || ''}"`,
            `"${lead.address || ''}"`,
            `"${lead.city || ''}"`,
            `"${lead.state || ''}"`,
            `"${lead.zip || ''}"`,
            `"${lead.school || ''}"`,
            `"${lead.cpf || ''}"`,
            `"${lead.status || ''}"`,
            `"${lead.amount || ''}"`,
            `"${(lead.notes || '').replace(/"/g, '""')}"`,
            `"${createdAt}"`
        ];
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

function importLeads() {
    if (!currentFunnel) {
        alert("Por favor, selecione um funil para importar os leads.");
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            // Remove BOM character if present
            const cleanText = text.startsWith('\uFEFF') ? text.substring(1) : text;
            const lines = cleanText.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length <= 1) {
                alert("Arquivo CSV vazio ou com apenas cabeçalho.");
                return;
            }

            const headerLine = lines[0];
            const delimiter = headerLine.includes(';') ? ';' : ',';
            const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, '').toLowerCase());
            
            console.log('Delimitador detectado:', delimiter);
            console.log('Cabeçalhos processados:', headers);

            const nameIndex = headers.indexOf('nome');
            const lastNameIndex = headers.indexOf('sobrenome');
            let emailIndex = headers.indexOf('e-mail');
            if (emailIndex === -1) {
                emailIndex = headers.indexOf('email');
            }
            const cityIndex = headers.indexOf('cidade');
            const stateIndex = headers.indexOf('estado');
            const schoolIndex = headers.indexOf('escola');
            const cpfIndex = headers.indexOf('cpf');

            if (nameIndex === -1 || emailIndex === -1) {
                alert("O CSV deve conter as colunas 'Nome' e 'Email'. Verifique o nome das colunas e o separador do arquivo (vírgula ou ponto e vírgula).");
                console.error("Colunas obrigatórias 'Nome' ou 'Email' não encontradas nos cabeçalhos:", headers);
                return;
            }

            const leadsToImport = [];
            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(delimiter);
                
                const firstName = data[nameIndex]?.trim().replace(/"/g, '') || '';
                const lastName = lastNameIndex > -1 ? data[lastNameIndex]?.trim().replace(/"/g, '') || '' : '';
                const fullName = `${firstName} ${lastName}`.trim();

                const lead = {
                    name: fullName,
                    email: data[emailIndex]?.trim().replace(/"/g, '') || '',
                    city: cityIndex > -1 ? data[cityIndex]?.trim().replace(/"/g, '') || '' : '',
                    state: stateIndex > -1 ? data[stateIndex]?.trim().replace(/"/g, '') || '' : '',
                    school: schoolIndex > -1 ? data[schoolIndex]?.trim().replace(/"/g, '') || '' : '',
                    cpf: cpfIndex > -1 ? data[cpfIndex]?.trim().replace(/"/g, '') || '' : '',
                    funnelId: currentFunnel.id,
                    status: currentFunnel.columns[0] || 'Novo', // Status inicial
                    createdAt: new Date(),
                    notes: 'Importado via CSV'
                };
                leadsToImport.push(lead);
            }

            try {
                for (const lead of leadsToImport) {
                    await addDoc(collection(db, 'leads'), lead);
                }
                alert(`${leadsToImport.length} leads importados com sucesso!`);
                const leads = await fetchLeads(currentFunnel.id);
                renderCards(leads);
                addDragAndDropHandlers();
            } catch (error) {
                console.error("Erro ao importar leads:", error);
                alert("Ocorreu um erro ao importar os leads.");
            }
        };
        reader.readAsText(file, 'UTF-8'); // Specify encoding
    };
    input.click();
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
        <div class="form-group">
            <label for="lead-name">Nome</label>
            <input type="text" id="lead-name" value="${lead.name || ''}" class="form-control">
        </div>
        <div class="form-group">
            <label for="lead-email">Email</label>
            <input type="email" id="lead-email" value="${lead.email || ''}" class="form-control">
        </div>
        <div class="form-group">
            <label for="lead-phone">Telefone</label>
            <input type="tel" id="lead-phone" value="${lead.phone || ''}" class="form-control">
        </div>
        <div class="form-group">
            <label for="lead-amount">Valor Destinado</label>
            <input type="text" id="lead-amount" value="${lead.amount || ''}" class="form-control">
        </div>
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
            <button type="button" id="open-chat-button" class="btn-secondary">Abrir Chat WhatsApp</button>
            <button type="submit">Salvar</button>
            <button type="button" id="delete-lead-button" class="btn-danger">Excluir</button>
        </div>
    `;
    modal.style.display = 'flex';

    document.getElementById('open-chat-button').onclick = () => openWhatsAppChatModal(lead);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const leadId = document.getElementById('leadId').value;
        const name = document.getElementById('lead-name').value;
        const email = document.getElementById('lead-email').value;
        const phone = document.getElementById('lead-phone').value;
        const amount = document.getElementById('lead-amount').value;
        const notes = document.getElementById('lead-notes').value;
        const newFunnelId = document.getElementById('lead-funnel').value;
        const newStatus = document.getElementById('lead-status').value;
        
        try {
            const leadRef = doc(db, 'leads', leadId);
            await updateDoc(leadRef, { 
                name,
                email,
                phone,
                amount,
                notes,
                funnelId: newFunnelId,
                status: newStatus
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

function openWhatsAppChatModal(lead) {
    activeChatLead = lead;
    const modal = document.getElementById('whatsapp-chat-modal');
    document.getElementById('chat-modal-title').textContent = `Conversa com ${lead.name}`;
    
    // Limpa a mensagem anterior e o histórico
    document.getElementById('whatsapp-message').value = '';
    document.getElementById('whatsapp-history').innerHTML = '';

    modal.style.display = 'flex';
    fetchMessageHistory(lead.phone);
    
    // Garante que o listener de envio seja associado ao modal correto
    document.getElementById('send-whatsapp-button').onclick = sendWhatsAppMessage;
}

function closeWhatsAppChatModal() {
    const modal = document.getElementById('whatsapp-chat-modal');
    modal.style.display = 'none';
    activeChatLead = null; // Limpa o lead ativo ao fechar
}

document.querySelector('#lead-modal .close-button').addEventListener('click', closeLeadModal);

async function sendWhatsAppMessage() {
    if (!activeChatLead) return;

    const phone = activeChatLead.phone;
    const messageInput = document.querySelector('#whatsapp-chat-modal #whatsapp-message');
    const message = messageInput.value;

    if (!phone || !message) {
        alert('Por favor, digite uma mensagem.');
        return;
    }

    // Normaliza o número de telefone: remove caracteres não numéricos
    let normalizedPhone = phone.replace(/\D/g, '');

    // Adiciona o código do país (55) se não estiver presente e for um número brasileiro válido
    if (normalizedPhone.length >= 10 && !normalizedPhone.startsWith('55')) {
        normalizedPhone = '55' + normalizedPhone;
    }

    // Converte o número de telefone para o formato Chat ID
    const chatId = `${normalizedPhone}@s.whatsapp.net`;

    const apiUrl = 'https://gate.whapi.cloud/messages/text';
    const token = 'FAfQSQor2bpEvTgfZW2d3aKpW8LYbeRa';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to: chatId,
                body: message
            })
        });

        const responseData = await response.json(); // Lê o corpo da resposta em todos os casos

        if (response.ok) {
            // Adiciona a mensagem enviada ao histórico localmente para feedback instantâneo
            const historyContainer = document.querySelector('#whatsapp-chat-modal #whatsapp-history');
            const messageElement = document.createElement('div');
            messageElement.classList.add('whatsapp-message', 'sent');
            messageElement.innerHTML = `<p>${message}</p><span>Agora</span>`;
            historyContainer.appendChild(messageElement);
            historyContainer.scrollTop = historyContainer.scrollHeight;

            messageInput.value = ''; // Limpa o campo
        } else {
            console.error('Erro da API Whapi:', responseData);
            // Acessa a mensagem de erro que pode estar aninhada
            const errorMessage = responseData.error?.message || responseData.message || 'Erro desconhecido.';
            alert(`Erro ao enviar mensagem: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Erro na requisição para a API do WhatsApp:', error);
        alert('Ocorreu um erro ao tentar enviar a mensagem. Verifique o console para mais detalhes (pressione F12).');
    }
}

async function fetchMessageHistory(phone) {
    const historyContainer = document.getElementById('whatsapp-history');
    historyContainer.innerHTML = '<p class="loading-history">Carregando histórico...</p>';

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length >= 10 && !normalizedPhone.startsWith('55')) {
        normalizedPhone = '55' + normalizedPhone;
    }

    // O Chat ID precisa ser codificado para ser usado na URL de forma segura.
    const chatId = `${normalizedPhone}@s.whatsapp.net`;
    const encodedChatId = encodeURIComponent(chatId);
    const apiUrl = `https://gate.whapi.cloud/messages/list/${encodedChatId}`;
    const token = 'FAfQSQor2bpEvTgfZW2d3aKpW8LYbeRa';

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            historyContainer.innerHTML = '<p class="history-error">Não foi possível carregar o histórico.</p>';
            return;
        }

        const data = await response.json();
        displayMessages(data.messages);

    } catch (error) {
        console.error('Erro ao buscar histórico de mensagens:', error);
        historyContainer.innerHTML = '<p class="history-error">Ocorreu um erro ao carregar o histórico.</p>';
    }
}

function displayMessages(messages) {
    const historyContainer = document.getElementById('whatsapp-history');
    historyContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">Nenhuma mensagem encontrada.</p>';
        return;
    }

    // As mensagens vêm da mais nova para a mais antiga, então invertemos para exibir corretamente
    messages.reverse().forEach(msg => {
        if (msg.text) { // Apenas exibe mensagens de texto
            const messageElement = document.createElement('div');
            messageElement.classList.add('whatsapp-message');
            messageElement.classList.add(msg.from_me ? 'sent' : 'received');
            
            const textElement = document.createElement('p');
            textElement.textContent = msg.text.body;
            
            const timeElement = document.createElement('span');
            timeElement.textContent = new Date(msg.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            messageElement.appendChild(textElement);
            messageElement.appendChild(timeElement);
            historyContainer.appendChild(messageElement);
        }
    });

    // Rola para a mensagem mais recente
    historyContainer.scrollTop = historyContainer.scrollHeight;
}
