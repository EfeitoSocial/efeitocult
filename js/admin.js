import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if the user is an administrator via Firestore field
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
            // If admin, load the projects
            document.getElementById('admin-link').style.display = 'block';
            document.getElementById('crm-link').style.display = 'block';
            loadProjects();
        } else {
            // If not admin, show an error and redirect
            console.error("Access denied. User is not an administrator.");
            alert("You do not have permission to access this page.");
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

async function loadProjects() {
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = ''; // Limpa o conteúdo estático

    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        querySnapshot.forEach((doc) => {
            const project = doc.data();
            const projectCard = document.createElement('div');
            projectCard.classList.add('project-card');
            projectCard.dataset.id = doc.id;

            let statusClass = '';
            switch (project.status) {
                case 'Ativo':
                    statusClass = 'active';
                    break;
                case 'Inativo':
                    statusClass = 'inactive';
                    break;
                case 'Finalizado':
                    statusClass = 'finished';
                    break;
            }

            projectCard.innerHTML = `
                <div class="project-info">
                    <h3>${project.name}</h3>
                    <span class="status ${statusClass}">${project.status}</span>
                </div>
                <div class="project-actions">
                    <a href="captacao.html?id=${doc.id}" class="btn-action">Gerenciar</a>
                    <a href="cadastro-projeto.html?id=${doc.id}" class="btn-action">Editar</a>
                    <button class="btn-action btn-delete">Excluir</button>
                </div>
            `;

            projectsList.appendChild(projectCard);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent navigation
                const card = e.target.closest('.project-card');
                const projectId = card.dataset.id;
                if (confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
                    try {
                        await deleteDoc(doc(db, "projects", projectId));
                        card.remove();
                    } catch (error) {
                        console.error("Erro ao excluir projeto: ", error);
                        alert('Ocorreu um erro ao excluir o projeto.');
                    }
                }
            });
        });

    } catch (error) {
        console.error("Erro ao carregar projetos: ", error);
    }
}
