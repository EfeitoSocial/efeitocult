import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leadForm = document.getElementById('lead-form');

leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const cpf = document.getElementById('cpf').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const amount = document.getElementById('amount').value;

    try {
        const funnelId = await getDefaultFunnelId();
        await addDoc(collection(db, "leads"), {
            name: name,
            cpf: cpf,
            phone: phone,
            email: email,
            amount: amount,
            status: 'Novo',
            funnelId: funnelId,
            createdAt: new Date()
        });
        alert('Obrigado por seu interesse! Entraremos em contato em breve.');
        leadForm.reset();
    } catch (error) {
        console.error("Erro ao enviar lead: ", error);
        alert('Ocorreu um erro ao enviar suas informações. Tente novamente.');
    }
});

async function getDefaultFunnelId() {
    const funnelsCol = collection(db, 'funnels');
    const q = query(funnelsCol, where("name", "==", "Leads do Site"));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Funnel padrão já existe
        return querySnapshot.docs[0].id;
    } else {
        // Cria o funil padrão se ele não existir
        try {
            const newFunnel = await addDoc(funnelsCol, {
                name: "Leads do Site",
                columns: ["Novo", "Em Análise", "Contato Realizado", "Convertido", "Descartado"]
            });
            return newFunnel.id;
        } catch (error) {
            console.error("Erro ao criar funil padrão:", error);
            return null;
        }
    }
}
