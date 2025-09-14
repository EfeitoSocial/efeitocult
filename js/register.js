import { db, auth } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const cpf = document.getElementById('cpf').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;

    if (password !== confirmPassword) {
        alert('As senhas não coincidem.');
        return;
    }

    if (!terms) {
        alert('Você precisa aceitar os Termos e Condições.');
        return;
    }

    try {
        // Step 1: Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Step 2: Save additional user info in Firestore
        // We use the user's UID from Authentication as the document ID in Firestore
        await setDoc(doc(db, "users", user.uid), {
            firstName: firstName,
            lastName: lastName,
            email: email,
            cpf: cpf,
            createdAt: new Date()
        });

        alert('Cadastro realizado com sucesso! Você será redirecionado para o login.');
        registerForm.reset();
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Error during registration: ", errorCode, errorMessage);

        if (errorCode === 'auth/email-already-in-use') {
            alert('Este e-mail já está em uso.');
        } else if (errorCode === 'auth/weak-password') {
            alert('A senha é muito fraca. Use pelo menos 6 caracteres.');
        } else {
            alert('Ocorreu um erro ao realizar o cadastro: ' + errorMessage);
        }
    }
});
