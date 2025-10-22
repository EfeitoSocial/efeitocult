import { db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leadForm = document.getElementById('lead-form');

const formatText = (value) => value.replace(/[.|(|)|R$| |,|-]/g, '');

leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const surname = document.getElementById('surname').value;
    var cpf = document.getElementById('cpf').value;
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
            cpf: formatText(cpf),
            phone: formatText(phone),
            email: email,
            cep: formatText(cep),
            address: address,
            project: project,
            amount: formatText(amount),
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



// Form Formatting

// Upload field
const files = document.getElementById('files');
const fileInput = document.getElementById('upload');
const card = document.createElement('div');
card.className = 'form-group';

card.innerHTML = `
    <label for="upload" class="files"><img src="imgs/uploadicon.png"><span>Anexar Arquivo</span></label>
`;
fileInput.addEventListener("change", function(){
    if(fileInput.files.length == 0){
        card.innerHTML = `
        <label for="upload" class="files"><img src="imgs/uploadicon.png"><span>Anexar Arquivo</span></label>
        `;
    }else{
        card.innerHTML = `
        <label for="upload" class="files-done"><img src="imgs/uploadDoneicon.png"><span>Comprovante Anexado</span></label>
        `;
    }
});
files.appendChild(card);


// CPF field
const cpfInput = document.getElementById('cpf');
cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    cpfInput.addEventListener('keyup', function(e){
        if(event.key != 'Backspace'){
            if (cpfInput.value.length === 3){
                cpfInput.value += '.';
            }
            if (cpfInput.value.length === 7){
                cpfInput.value += '.';
            }
            if(cpfInput.value.length === 11){
                cpfInput.value += '-';
            }
        }
    });

    value = cpfInput.value;
    if (value === 'NaN') {
        e.target.value = '';
    }else {
        e.target.value = value;
    }
});


//Phone field
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (e) => {
let value = e.target.value.replace(/\D/g, '');

    phoneInput.addEventListener('keyup', function(e){
        if(e.key != 'Backspace'){
            if (phoneInput.value.length === 2){
                phoneInput.value = '(' + phoneInput.value;
            }
            if (phoneInput.value.length === 3){
                phoneInput.value += ') ';
            }
            if(phoneInput.value.length === 9){
                phoneInput.value += '-';
            }
            if(phoneInput.value.length === 15){
                let input = phoneInput.value.slice(0,11) + '-' + phoneInput.value.slice(11);
                phoneInput.value = input.replace('-','');
            }
        }
    });

    value = phoneInput.value.replace(/[a-z|A-Z]/g,'');
    if (value === 'NaN') {
        e.target.value = '';
    }else {
        e.target.value = value;
    }
});



//CEP field
const cepInput = document.getElementById('cep');
cepInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    cepInput.addEventListener('keyup', function(e){
        if(event.key != 'Backspace' && cepInput.value.length === 5){
            cepInput.value += '-';
        }
    })
    value = cepInput.value;
    if (value === 'NaN') {
        e.target.value = '';
    }else {
        e.target.value = value;
    }
});

// Amount field
const investmentInput = document.getElementById('amount');
investmentInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    e.target.value = value === 'NaN' ? '' : 'R$ ' + value;
});
