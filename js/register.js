import { db, auth } from './firebase.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const registerForm = document.getElementById('registerForm');

function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g,'');
    if(cpf == '') return false;
    // Elimina CPFs invalidos conhecidos
    if (cpf.length != 11 ||
        cpf == "00000000000" ||
        cpf == "11111111111" ||
        cpf == "22222222222" ||
        cpf == "33333333333" ||
        cpf == "44444444444" ||
        cpf == "55555555555" ||
        cpf == "66666666666" ||
        cpf == "77777777777" ||
        cpf == "88888888888" ||
        cpf == "99999999999")
            return false;
    // Valida 1o digito
    let add = 0;
    for (let i=0; i < 9; i ++)
        add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev == 10 || rev == 11)
        rev = 0;
    if (rev != parseInt(cpf.charAt(9)))
        return false;
    // Valida 2o digito
    add = 0;
    for (let i = 0; i < 10; i ++)
        add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11)
        rev = 0;
    if (rev != parseInt(cpf.charAt(10)))
        return false;
    return true;
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const cpf = document.getElementById('cpf').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;

    if (!validateCPF(cpf)) {
        alert('CPF inválido.');
        return;
    }

    if (phone.trim() === '') {
        alert('Por favor, preencha o seu número de celular.');
        return;
    }

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

        // Step 2: Update the user's profile with their first name
        await updateProfile(user, {
            displayName: firstName
        });

        // Step 3: Save additional user info in Firestore
        // We use the user's UID from Authentication as the document ID in Firestore
        await setDoc(doc(db, "users", user.uid), {
            firstName: firstName,
            lastName: lastName,
            email: email,
            cpf: cpf,
            phone: phone,
            address: {bairro: "", cep: "", cidade: "", complemento:"", estado: "", numero:"", rua: ""},
            professional: {cargo: "", empresa: "", faixaSalarial: ""},
            acceptsUpdates: false,
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
