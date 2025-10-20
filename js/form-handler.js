import { db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leadForm = document.getElementById('lead-form');

leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const surname = document.getElementById('surname').value;
    const cpf = document.getElementById('cpf').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const cep = document.getElementById('cep').value;
    const address = document.getElementById('address').value;
    const project = document.getElementById('project').value;
    const amount = document.getElementById('amount').value;
    const upload = document.getElementById('upload').value;
    const terms = document.getElementById('terms').value;

    try {
        await addDoc(collection(db, "leads"), {
            name: name,
            surname: surname,
            cpf: cpf,
            phone: phone,
            email: email,
            cep: cep,
            address: address,
            project: project,
            amount: amount,
            upload: upload,
            terms: terms,
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
