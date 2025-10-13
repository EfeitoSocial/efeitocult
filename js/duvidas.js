import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const logoutButton = document.getElementById('logout-button');
const accordionItems = document.querySelectorAll('.accordion-item');
const contactForm = document.getElementById('contact-form');
const adminLink = document.getElementById('admin-link');
const crmLink = document.getElementById('crm-link');

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

const fetchUserData = async (uid) => {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.isAdmin === true) {
                adminLink.style.display = 'block';
                crmLink.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error fetching user profile data:", error);
    }
};

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});

// --- ACCORDION LOGIC ---
accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    const content = item.querySelector('.accordion-content');

    header.addEventListener('click', () => {
        // Close other open items
        accordionItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('active')) {
                otherItem.classList.remove('active');
                otherItem.querySelector('.accordion-content').style.maxHeight = null;
            }
        });

        // Toggle current item
        item.classList.toggle('active');
        if (item.classList.contains('active')) {
            content.style.maxHeight = content.scrollHeight + "px";
        } else {
            content.style.maxHeight = null;
        }
    });
});

// --- CONTACT FORM LOGIC ---
contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        alert('Você precisa estar logado para enviar uma mensagem.');
        return;
    }

    const assunto = document.getElementById('assunto').value;
    const mensagem = document.getElementById('mensagem').value;

    try {
        await addDoc(collection(db, "contactMessages"), {
            userId: user.uid,
            email: user.email,
            subject: assunto,
            message: mensagem,
            createdAt: new Date()
        });
        alert('Mensagem enviada com sucesso!');
        contactForm.reset();
    } catch (error) {
        console.error("Error sending message: ", error);
        alert('Ocorreu um erro ao enviar sua mensagem. Tente novamente.');
    }
});
