import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Signed in 
        const user = userCredential.user;
        console.log('User logged in:', user.uid);
        window.location.href = 'dashboard.html';
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Login error:', errorCode, errorMessage);

        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
            alert('E-mail ou senha inválidos.');
        } else {
            alert('Ocorreu um erro ao tentar fazer login: ' + errorMessage);
        }
    }
});

const eye = document.getElementById('passEye');
eye.addEventListener('click', (e) => {
    if(document.getElementById('password').type == 'password'){
        document.getElementById('password').type = 'text';
    }else{
        document.getElementById('password').type = 'password';
    }
});
