import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const logoutButton = document.getElementById('logout-button');
const userGreeting = document.getElementById('user-greeting');
const userEmailDisplay = document.getElementById('user-email-display');

// Form Elements
const profileForm = document.getElementById('profile-form');
const nomeInput = document.getElementById('nome');
const sobrenomeInput = document.getElementById('sobrenome');
const cpfInput = document.getElementById('cpf');
const emailInput = document.getElementById('email');
const celularInput = document.getElementById('celular');
const cepInput = document.getElementById('cep');
const buscarCepButton = document.getElementById('buscar-cep');
const ruaInput = document.getElementById('rua');
const numeroInput = document.getElementById('numero');
const complementoInput = document.getElementById('complemento');
const bairroInput = document.getElementById('bairro');
const cidadeInput = document.getElementById('cidade');
const estadoInput = document.getElementById('estado');
const updatesCheckbox = document.getElementById('aceito-receber-atualizacoes');
const empresaInput = document.getElementById('empresa');
const faixaSalarialInput = document.getElementById('faixa-salarial');
const cargoInput = document.getElementById('cargo');
const generoMusicalInput = document.getElementById('genero-musical');
const eventosCulturaisInput = document.getElementById('eventos-culturais');

let currentUserRef;

// --- DATA HANDLING ---
const loadUserData = async (uid) => {
    currentUserRef = doc(db, "users", uid);
    try {
        const docSnap = await getDoc(currentUserRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            userGreeting.textContent = data.firstName || 'Olá';
            userEmailDisplay.textContent = data.email || '';
            
            // Personal
            nomeInput.value = data.firstName || '';
            sobrenomeInput.value = data.lastName || '';
            cpfInput.value = data.cpf || '';
            cpfInput.disabled = true;
            emailInput.value = data.email || '';
            celularInput.value = data.phone || '';
            updatesCheckbox.checked = data.acceptsUpdates || false;

            // Address
            cepInput.value = data.address?.cep || '';
            ruaInput.value = data.address?.rua || '';
            numeroInput.value = data.address?.numero || '';
            complementoInput.value = data.address?.complemento || '';
            bairroInput.value = data.address?.bairro || '';
            cidadeInput.value = data.address?.cidade || '';
            estadoInput.value = data.address?.estado || '';

            // Professional
            empresaInput.value = data.professional?.empresa || '';
            faixaSalarialInput.value = data.professional?.faixaSalarial || '';
            cargoInput.value = data.professional?.cargo || '';

            // Cultural
            generoMusicalInput.value = data.cultural?.generoMusical || '';
            eventosCulturaisInput.value = data.cultural?.eventosCulturais || '';
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
};

const saveFormData = async (formData) => {
    if (!currentUserRef) return;
    try {
        await updateDoc(currentUserRef, formData, { merge: true });
        alert('Dados salvos com sucesso!');
    } catch (error) {
        console.error("Error saving data:", error);
        alert('Erro ao salvar os dados.');
    }
};

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});

// --- EVENT LISTENERS ---
profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const dataToSave = {
        // Personal Data
        firstName: nomeInput.value,
        lastName: sobrenomeInput.value,
        email: emailInput.value,
        phone: celularInput.value,
        acceptsUpdates: updatesCheckbox.checked,
        // Address Data
        address: {
            cep: cepInput.value,
            rua: ruaInput.value,
            numero: numeroInput.value,
            complemento: complementoInput.value,
            bairro: bairroInput.value,
            cidade: cidadeInput.value,
            estado: estadoInput.value,
        },
        // Professional Data
        professional: {
            empresa: empresaInput.value,
            faixaSalarial: faixaSalarialInput.value,
            cargo: cargoInput.value,
        },
        // Cultural Preferences
        cultural: {
            generoMusical: generoMusicalInput.value,
            eventosCulturais: eventosCulturaisInput.value,
        }
    };

    saveFormData(dataToSave);
});

buscarCepButton.addEventListener('click', async () => {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        alert('CEP inválido.');
        return;
    }
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
            alert('CEP não encontrado.');
        } else {
            ruaInput.value = data.logradouro;
            bairroInput.value = data.bairro;
            cidadeInput.value = data.localidade;
            estadoInput.value = data.uf;
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Não foi possível buscar o CEP.');
    }
});
