const btnCadastrar = document.getElementById('btnCadastrar');
const btnEntrar = document.getElementById('btnEntrar');
const container = document.getElementById('container');
const formularioLogin = document.getElementById('formularioLogin');
const formularioCadastro = document.getElementById('formularioCadastro');

// Função para exibir mensagens
function exibirMensagem(elemento, texto, ehErro) {
    elemento.textContent = texto;
    elemento.className = 'mensagem ' + (ehErro ? 'erro' : 'sucesso');
    elemento.style.display = 'block';
}

// Lógica de Animação
btnCadastrar.addEventListener('click', () => container.classList.add("painel-direito-ativo"));
btnEntrar.addEventListener('click', () => container.classList.remove("painel-direito-ativo"));

// Abrir painel de cadastro se a URL tiver #register
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#register') {
        container.classList.add("painel-direito-ativo");
    }
});

// Lógica de Login
formularioLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailOuCpf = document.getElementById('loginEmailCpf').value;
    const senha = document.getElementById('loginSenha').value;
    const elMensagem = document.getElementById('mensagemLogin');
    exibirMensagem(elMensagem, 'Entrando...', false);

    try {
        const resposta = await fetch('http://localhost:7071/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOuCpf, senha })
        });
        const dados = await resposta.json();
        if (dados.success) {
            sessionStorage.setItem('medControlUser', JSON.stringify(dados.user));
            const perfil = dados.user.perfil;
            window.location.href = (perfil === 'usuario') ? 'TelaUsuario.html' : 'Admin.html';
        } else {
            exibirMensagem(elMensagem, dados.message, true);
        }
    } catch (erro) {
        console.error("Erro no login:", erro);
        exibirMensagem(elMensagem, 'Erro de conexão com o servidor.', true);
    }
});


function limparErrosCadastro() {
    document.querySelectorAll('#formularioCadastro input').forEach(input => {
        input.classList.remove('input-error');
    });
    document.querySelectorAll('#formularioCadastro .error-message').forEach(p => {
        p.textContent = '';
    });
    const mensagemGeral = document.getElementById('mensagemCadastro');
    mensagemGeral.style.display = 'none';
}

function destacarErroDeCampoDuplicado(campo) {
    let elementoInput, elementoErro;
    if (campo === 'email') {
        elementoInput = document.getElementById('cadastroEmail');
        elementoErro = document.getElementById('erroCadastroEmail');
    } else if (campo === 'cpf_cns') {
        elementoInput = document.getElementById('cadastroCpfCns');
        elementoErro = document.getElementById('erroCadastroCpfCns');
    }

    if (elementoInput && elementoErro) {
        elementoInput.classList.add('input-error');
        elementoErro.textContent = `Este ${campo === 'email' ? 'e-mail' : 'CPF/CNS'} já está cadastrado.`;
    }
}

function isMaisDe18(dataNasc) {
    if (!dataNasc) return true; // Se não for obrigatório, não valida
    const hoje = new Date();
    const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
    const dataNascimento = new Date(dataNasc);
    const dataNascimentoUTC = new Date(dataNascimento.getUTCFullYear(), dataNascimento.getUTCMonth(), dataNascimento.getUTCDate());
    return dataNascimentoUTC <= dezoitoAnosAtras;
}


function validarCadastro() {
    limparErrosCadastro();
    let isValid = true;
    
    const fieldsToValidate = [
        { id: 'cadastroNome', errorId: 'erroCadastroNome', message: 'O nome completo é obrigatório.' },
        { id: 'cadastroEmail', errorId: 'erroCadastroEmail', message: 'O e-mail é obrigatório.' },
        { id: 'cadastroCpfCns', errorId: 'erroCadastroCpfCns', message: 'O CPF ou CNS é obrigatório.' },
        { id: 'cadastroCep', errorId: 'erroCadastroCep', message: 'O CEP é obrigatório.' },
        { id: 'cadastroSenha', errorId: 'erroCadastroSenha', message: 'A senha é obrigatória.' }
    ];

    fieldsToValidate.forEach(field => {
        const input = document.getElementById(field.id);
        const errorEl = document.getElementById(field.errorId);
        if (!input.value.trim()) {
            input.classList.add('input-error');
            errorEl.textContent = field.message;
            isValid = false;
        }
    });

    const senhaInput = document.getElementById('cadastroSenha');
    const erroSenhaEl = document.getElementById('erroCadastroSenha');
    if (senhaInput.value.trim() && senhaInput.value.length < 6) {
        senhaInput.classList.add('input-error');
        erroSenhaEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
        isValid = false;
    }

    const nascimentoInput = document.getElementById('cadastroNascimento');
    const erroNascimentoEl = document.getElementById('erroCadastroNascimento');
    if (nascimentoInput.value && !isMaisDe18(nascimentoInput.value)) {
        nascimentoInput.classList.add('input-error');
        erroNascimentoEl.textContent = 'Você deve ter 18 anos ou mais para se cadastrar.';
        isValid = false;
    }


    return isValid;
}


// Lógica de Cadastro
formularioCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validarCadastro()) {
        return;
    }
    
    const elMensagem = document.getElementById('mensagemCadastro');
    const dadosUsuario = {
        nome: document.getElementById('cadastroNome').value,
        email: document.getElementById('cadastroEmail').value,
        cpf_cns: document.getElementById('cadastroCpfCns').value,
        cep: document.getElementById('cadastroCep').value,
        data_nascimento: document.getElementById('cadastroNascimento').value,
        senha: document.getElementById('cadastroSenha').value
    };
    exibirMensagem(elMensagem, 'Cadastrando...', false);
    
    try {
        const resposta = await fetch('http://localhost:7071/api/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosUsuario)
        });
        
        const dados = await resposta.json();

        if (resposta.ok) {
            exibirMensagem(elMensagem, dados.message + ' Faça o login para continuar.', false);
            formularioCadastro.reset();
            setTimeout(() => container.classList.remove("painel-direito-ativo"), 2000);
        } else if (resposta.status === 409) {
            elMensagem.style.display = 'none'; // Oculta a mensagem geral
            destacarErroDeCampoDuplicado(dados.field);
        } else {
            exibirMensagem(elMensagem, dados.message || 'Ocorreu um erro desconhecido.', true);
        }
    } catch (erro) {
         console.error("Erro no cadastro:", erro);
         exibirMensagem(elMensagem, 'Erro de conexão com o servidor.', true);
    }
});


// Lógica para "Esqueci minha senha"
const modalEsqueceuSenha = document.getElementById('modalEsqueceuSenha');
const linkEsqueceuSenha = document.getElementById('linkEsqueceuSenha');
const btnFecharModal = document.getElementById('btnFecharModal');
const btnVerificarEmail = document.getElementById('btnVerificarEmail');
const btnAtualizarSenha = document.getElementById('btnAtualizarSenha');
const modalConfirmacaoSenha = document.getElementById('modalConfirmacaoSenha');

linkEsqueceuSenha.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('passo1Recuperacao').style.display = 'block';
    document.getElementById('passo2Recuperacao').style.display = 'none';
    document.getElementById('emailRecuperacao').value = '';
    document.getElementById('mensagemPasso1').style.display = 'none';
    document.getElementById('mensagemPasso2').style.display = 'none';
    modalEsqueceuSenha.style.display = 'flex';
});

btnFecharModal.addEventListener('click', () => {
    modalEsqueceuSenha.style.display = 'none';
});

document.getElementById('btnFecharConfirmacaoSenha').addEventListener('click', () => {
    modalConfirmacaoSenha.style.display = 'none';
});

window.addEventListener('click', (evento) => {
    if (evento.target == modalEsqueceuSenha) {
         modalEsqueceuSenha.style.display = "none";
    }
    if (evento.target == modalConfirmacaoSenha) {
        modalConfirmacaoSenha.style.display = "none";
   }
});

btnVerificarEmail.addEventListener('click', async () => {
    const email = document.getElementById('emailRecuperacao').value;
    const elMensagem = document.getElementById('mensagemPasso1');
    if (!email) {
        exibirMensagem(elMensagem, 'Por favor, insira um e-mail.', true);
        return;
    }
    try {
        const resposta = await fetch('http://localhost:7071/api/password-reset/check-email', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });
        const dados = await resposta.json();
        if (dados.exists) {
            document.getElementById('passo1Recuperacao').style.display = 'none';
            document.getElementById('passo2Recuperacao').style.display = 'block';
        } else {
            exibirMensagem(elMensagem, 'E-mail não encontrado em nosso sistema.', true);
        }
    } catch(e) {
        exibirMensagem(elMensagem, 'Erro de conexão com o servidor.', true);
    }
});

btnAtualizarSenha.addEventListener('click', async () => {
    const email = document.getElementById('emailRecuperacao').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarNovaSenha').value;
    const elMensagem = document.getElementById('mensagemPasso2');

    if (novaSenha !== confirmarSenha) {
        exibirMensagem(elMensagem, 'As senhas não coincidem.', true);
        return;
    }
    if (novaSenha.length < 6) { 
        exibirMensagem(elMensagem, 'A nova senha deve ter no mínimo 6 caracteres.', true);
        return;
    }

    try {
         const resposta = await fetch('http://localhost:7071/api/password-reset/update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword: novaSenha })
        });
        const dados = await resposta.json();
        if (dados.success) {
            modalEsqueceuSenha.style.display = 'none';
            modalConfirmacaoSenha.style.display = 'flex';
        } else {
             exibirMensagem(elMensagem, dados.message, true);
        }
    } catch(e) {
         exibirMensagem(elMensagem, 'Erro de conexão com o servidor.', true);
    }
});

