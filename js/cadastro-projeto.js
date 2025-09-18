import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';

const projectForm = document.getElementById('project-form');
const pageTitle = document.querySelector('.main-header h1');
const submitButton = document.querySelector('.btn-submit-project');

let projectId = null;
let isEditMode = false;

// Function to load project data for editing
async function loadProjectForEdit(id) {
    try {
        const docRef = doc(db, "projects", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const project = docSnap.data();
            document.getElementById('project-name').value = project.name;
            document.getElementById('project-status').value = project.status;
            document.getElementById('goal-amount').value = project.goalAmount;
            document.getElementById('project-banner').value = project.bannerUrl || '';
            document.getElementById('project-description').value = project.description || '';

            // Update UI for edit mode
            pageTitle.textContent = "Editar Projeto";
            submitButton.textContent = "Atualizar Projeto";
        } else {
            alert("Projeto não encontrado.");
            window.location.href = 'admin.html';
        }
    } catch (error) {
        console.error("Erro ao carregar projeto para edição: ", error);
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists() || userDocSnap.data().isAdmin !== true) {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = 'dashboard.html';
            return;
        }

        // Check for project ID in URL for edit mode
        const urlParams = new URLSearchParams(window.location.search);
        projectId = urlParams.get('id');
        if (projectId) {
            isEditMode = true;
            loadProjectForEdit(projectId);
        }

    } else {
        window.location.href = 'login.html';
    }
});

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const projectName = document.getElementById('project-name').value;
    const projectStatus = document.getElementById('project-status').value;
    const goalAmount = parseFloat(document.getElementById('goal-amount').value);
    const bannerUrl = document.getElementById('project-banner').value;
    const description = document.getElementById('project-description').value;

    if (isNaN(goalAmount) || goalAmount <= 0) {
        alert('Por favor, insira uma meta de arrecadação válida.');
        return;
    }

    const projectData = {
        name: projectName,
        status: projectStatus,
        goalAmount: goalAmount,
        bannerUrl: bannerUrl,
        description: description,
    };

    try {
        if (isEditMode) {
            // Update existing project
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, projectData);
            alert('Projeto atualizado com sucesso!');
        } else {
            // Add new project
            await addDoc(collection(db, "projects"), projectData);
            alert('Projeto cadastrado com sucesso!');
        }
        window.location.href = 'admin.html';
    } catch (error) {
        console.error("Erro ao salvar projeto: ", error);
        alert('Ocorreu um erro ao salvar o projeto.');
    }
});
