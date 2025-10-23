import { db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leadForm = document.getElementById('lead-form');

const formatText = (value) => value.replace(/[.|(|)|R$| |,|-]/g, '');

leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(emailValido === true && cpfValido === true){
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
    }else{
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
    //VIsual
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

    value = cpfInput.value.replace(/[a-z|A-Z]/g,'');
    if (value === 'NaN') {
        e.target.value = '';
    }else {
        e.target.value = value;
    }
});

    //Validação
let cpfValido = true;
function validacaoCPF(cpf){
    let cpfNum = formatText(cpf.value);
    /*
    var soma;
    var resto;
    soma = 0;
    if(cpfNum.length != 11 ||
        cpfNum == "00000000000" ||
        cpfNum == "11111111111" ||
        cpfNum == "22222222222" ||
        cpfNum == "33333333333" ||
        cpfNum == "44444444444" ||
        cpfNum == "55555555555" ||
        cpfNum == "66666666666" ||
        cpfNum == "77777777777" ||
        cpfNum == "88888888888" ||
        cpfNum == "99999999999"){
        document.getElementById("cpf").classList.add('warning-border');
        document.getElementById("warning-cpf").classList.remove('hidden');
        cpfValido = false;
        return false;
    }
        
    for (i=0; i<9; i++) soma = soma + parseInt(cpfNum.charAt(i)) * (10 - i);
    resto = 11 - (soma % 11);
    if((resto == 10) || (resto == 11)) resto = 0;
    if(resto != parseInt(cpfNum.charAt(9))){
        document.getElementById("cpf").classList.add('warning-border');
        document.getElementById("warning-cpf").classList.remove('hidden');
        cpfValido = false;
        return false;
    }
            
    soma = 0;
    for(i=0; i<10; i++) soma = soma + parseInt(cpfNum.charAt(i) * (11 - i));
    resto = 11 - (soma % 11);
    if((resto === 10) || (resto === 11)) resto = 0;
    if(resto != parseInt(cpfNum.charAt(10))){
        document.getElementById("cpf").classList.add('warning-border');
        document.getElementById("warning-cpf").classList.remove('hidden');
        cpfValido = false;
        return false;
    }
    document.getElementById("cpf").classList.remove('warning-border');
    document.getElementById("warning-cpf").classList.add('hidden');
    cpfValido = true;
    return true;
    */
}
cpfInput.onblur = function(){validacaoCPF(cpfInput)};



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


//Email field
    //Validação
const emailInput = document.getElementById('email');
let emailValido = false;
function validacaoEmail(email){
    const usuario = email.value.substring(0, email.value.indexOf("@"));
    const dominio = email.value.substring(email.value.indexOf("@")+1, email.value.length);
    if((usuario.length >= 1)&&
        (dominio.length >= 3)&&
        (usuario.search("@")==-1) &&
        (dominio.search("@")==-1) &&
        (usuario.search(" ")==-1) &&
        (dominio.search(" ")==-1) &&
        (dominio.search(".")!=-1) &&
        (dominio.indexOf(".") >=1)&&
        (dominio.lastIndexOf(".") < dominio.length - 1))
    {
        document.getElementById("email").classList.remove('warning-border');
        document.getElementById("warning-email").classList.add('hidden');
        emailValido = true;
    }else{
        document.getElementById("email").classList.add('warning-border');
        document.getElementById("warning-email").classList.remove('hidden');
        emailValido = false;
    }
}
emailInput.onblur = function(){validacaoEmail(emailInput)};


//CEP field
const cepInput = document.getElementById('cep');
cepInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    cepInput.addEventListener('keyup', function(e){
        if(event.key != 'Backspace' && cepInput.value.length === 5){
            cepInput.value += '-';
        }
    })
    value = cepInput.value.replace(/[a-z|A-Z]/g,'');
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
