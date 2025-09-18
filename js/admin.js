import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if the user is an administrator via Firestore field
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
            // If admin, load the projects
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
    const projectsSection = document.querySelector('.projects-section');
    projectsSection.innerHTML = ''; // Limpa o conteúdo estático

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
                <h3>${project.name}</h3>
                <span class="status ${statusClass}">${project.status}</span>
            `;

            projectCard.addEventListener('click', () => {
                window.location.href = `captacao.html?id=${doc.id}`;
            });

            projectsSection.appendChild(projectCard);
        });
    } catch (error) {
        console.error("Erro ao carregar projetos: ", error);
    }
}
