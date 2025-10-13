import { db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leadForm = document.getElementById('lead-form');

leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const cpf = document.getElementById('cpf').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const amount = document.getElementById('amount').value;

    try {
        await addDoc(collection(db, "leads"), {
            name: name,
            cpf: cpf,
            phone: phone,
            email: email,
            amount: amount,
            status: 'Novo',
            createdAt: new Date()
        });
        alert('Obrigado por seu interesse! Entraremos em contato em breve.');
        leadForm.reset();
    } catch (error) {
        console.error("Erro ao enviar lead: ", error);
        alert('Ocorreu um erro ao enviar suas informações. Tente novamente.');
    }
});
