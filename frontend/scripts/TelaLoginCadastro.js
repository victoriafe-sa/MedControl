document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DOM ---
    const container = document.getElementById('container');
    const formularioLogin = document.getElementById('formularioLogin');
    const formularioCadastro = document.getElementById('formularioCadastro');
    const modalEsqueceuSenha = document.getElementById('modalEsqueceuSenha');
    const modalVerificacaoEmail = document.getElementById('modalVerificacaoEmail');
    const modalConfirmacaoSenha = document.getElementById('modalConfirmacaoSenha');
    const inputCepCadastro = document.getElementById('cadastroCep'); 

    // --- VARIÁVEIS DE ESTADO ---
    let dadosUsuarioTemporario = null;
    let emailParaRecuperar = null;
    let timerInterval = null;
    let fluxoAtual = 'cadastro'; // 'cadastro' ou 'recuperacao'

    // --- FUNÇÕES UTILITÁRIAS ---
    const fecharModais = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        clearInterval(timerInterval);
    };

    const exibirMensagem = (el, texto, isErro) => {
        el.textContent = texto;
        el.className = 'mensagem ' + (isErro ? 'erro' : 'sucesso');
        el.style.display = 'block';
    };

    const isValidEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };
    
    // --- LÓGICA DE ANIMAÇÃO ---
    document.getElementById('btnCadastrar').addEventListener('click', () => container.classList.add("painel-direito-ativo"));
    document.getElementById('btnEntrar').addEventListener('click', () => container.classList.remove("painel-direito-ativo"));
    if (window.location.hash === '#register') {
        container.classList.add("painel-direito-ativo");
    }

    // --- LOGIN ---
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
                window.location.href = (dados.user.perfil === 'usuario') ? 'TelaUsuario.html' : 'Admin.html';
            } else {
                exibirMensagem(elMensagem, dados.message, true);
            }
        } catch (erro) {
            exibirMensagem(elMensagem, 'Erro de conexão com o servidor.', true);
        }
    });

    // --- CADASTRO ---
    const limparErros = (formId) => {
        document.querySelectorAll(`#${formId} .input-error`).forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll(`#${formId} .error-message`).forEach(el => el.textContent = '');
    };
    
    const isMaisDe18 = (dataNasc) => {
        if (!dataNasc) return false;
        const hoje = new Date();
        const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
        const dataNascimentoUTC = new Date(new Date(dataNasc).toISOString().slice(0, 10));
        return dataNascimentoUTC <= dezoitoAnosAtras;
    };

    function validarCadastro() {
        limparErros('formularioCadastro');
        let isValid = true;
        const fields = [
            { id: 'cadastroNome', errorId: 'erroCadastroNome', message: 'O nome é obrigatório.' },
            { id: 'cadastroEmail', errorId: 'erroCadastroEmail', message: 'O e-mail é obrigatório.' },
            { id: 'cadastroCpfCns', errorId: 'erroCadastroCpfCns', message: 'O CPF/CNS é obrigatório.' },
            { id: 'cadastroCep', errorId: 'erroCadastroCep', message: 'O CEP é obrigatório.' },
            { id: 'cadastroSenha', errorId: 'erroCadastroSenha', message: 'A senha é obrigatória.' },
            { id: 'cadastroNascimento', errorId: 'erroCadastroNascimento', message: 'A data de nascimento é obrigatória.' }
        ];

        fields.forEach(f => {
            const input = document.getElementById(f.id);
            if (!input.value.trim()) {
                input.classList.add('input-error');
                document.getElementById(f.errorId).textContent = f.message;
                isValid = false;
            }
        });
        
        const emailInput = document.getElementById('cadastroEmail');
        if (emailInput.value.trim() && !isValidEmail(emailInput.value)) {
             emailInput.classList.add('input-error');
             document.getElementById('erroCadastroEmail').textContent = 'Formato de e-mail inválido.';
             isValid = false;
        }

        const nascInput = document.getElementById('cadastroNascimento');
        if (nascInput.value && !isMaisDe18(nascInput.value)) {
            nascInput.classList.add('input-error');
            document.getElementById('erroCadastroNascimento').textContent = 'Você deve ter 18 anos ou mais.';
            isValid = false;
        }
        
        const senhaInput = document.getElementById('cadastroSenha');
        if (senhaInput.value.trim() && senhaInput.value.length < 6) {
            senhaInput.classList.add('input-error');
            document.getElementById('erroCadastroSenha').textContent = 'A senha deve ter no mínimo 6 caracteres.';
            isValid = false;
        }

        // MODIFICADO: Verifica se o CEP foi validado com sucesso
        const cepInput = document.getElementById('cadastroCep');
        if (cepInput.value.trim() && !cepInput.classList.contains('input-success')) {
            cepInput.classList.add('input-error');
            document.getElementById('erroCadastroCep').textContent = 'Por favor, insira um CEP válido para continuar.';
            isValid = false;
        }

        return isValid;
    }

    formularioCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validarCadastro()) return;
        
        dadosUsuarioTemporario = {
            nome: document.getElementById('cadastroNome').value,
            email: document.getElementById('cadastroEmail').value,
            cpf_cns: document.getElementById('cadastroCpfCns').value,
            cep: document.getElementById('cadastroCep').value,
            data_nascimento: document.getElementById('cadastroNascimento').value,
            senha: document.getElementById('cadastroSenha').value
        };
        
        try {
            const res = await fetch('http://localhost:7071/api/usuarios/verificar-existencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: dadosUsuarioTemporario.email,
                    cpf_cns: dadosUsuarioTemporario.cpf_cns
                })
            });
            const data = await res.json();
            let hasError = false;
            if (data.email) {
                document.getElementById('cadastroEmail').classList.add('input-error');
                document.getElementById('erroCadastroEmail').textContent = 'Este e-mail já está cadastrado.';
                hasError = true;
            }
            if (data.cpf_cns) {
                document.getElementById('cadastroCpfCns').classList.add('input-error');
                document.getElementById('erroCadastroCpfCns').textContent = 'Este CPF/CNS já está cadastrado.';
                hasError = true;
            }
            if(hasError) return;

            fluxoAtual = 'cadastro';
            iniciarFluxoVerificacao(dadosUsuarioTemporario.email, 'cadastro');
        } catch (err) {
            alert('Erro de conexão ao verificar dados.');
        }
    });

    // --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO DE CEP ---
    const formatarCep = (inputElement) => {
        let cep = inputElement.value.replace(/\D/g, '');
        cep = cep.substring(0, 8);
        if (cep.length > 5) {
            cep = cep.slice(0, 5) + '-' + cep.slice(5);
        }
        inputElement.value = cep;
    };

    const validarCep = async (inputElement, validationElementId) => {
        const cep = inputElement.value.replace(/\D/g, ''); 
        const validationElement = document.getElementById(validationElementId);

        inputElement.classList.remove('input-success', 'input-error');
        validationElement.textContent = '';
        validationElement.className = 'validation-message';

        if (cep.length === 8) {
            try {
                const response = await fetch(`http://localhost:7071/api/cep/${cep}`);
                if (response.ok) {
                    inputElement.classList.add('input-success');
                    validationElement.textContent = 'CEP válido';
                    validationElement.classList.add('success');
                } else {
                    inputElement.classList.add('input-error');
                    validationElement.textContent = 'CEP inválido';
                    validationElement.classList.add('error');
                }
            } catch (error) {
                inputElement.classList.add('input-error');
                validationElement.textContent = 'Erro ao consultar CEP';
                validationElement.classList.add('error');
            }
        }
    };

    // Adiciona os listeners ao campo de CEP do cadastro
    inputCepCadastro.addEventListener('input', () => formatarCep(inputCepCadastro));
    inputCepCadastro.addEventListener('blur', () => validarCep(inputCepCadastro, 'validacaoCadastroCep'));


    // --- FLUXO DE VERIFICAÇÃO DE E-MAIL (UNIFICADO) ---
    async function iniciarFluxoVerificacao(email, motivo) {
        document.getElementById('emailParaVerificar').textContent = email;
        const msgEl = document.getElementById('mensagemVerificacao');
        exibirMensagem(msgEl, 'Enviando código...', false);
        
        if (motivo === 'cadastro') {
            document.getElementById('tituloModalVerificacao').textContent = 'Verifique seu E-mail';
            document.getElementById('btnVerificarCodigo').textContent = 'Verificar e Cadastrar';
        } else {
            document.getElementById('tituloModalVerificacao').textContent = 'Recuperar Senha';
            document.getElementById('btnVerificarCodigo').textContent = 'Verificar Código';
        }

        modalVerificacaoEmail.style.display = 'flex';

        try {
            const res = await fetch('http://localhost:7071/api/usuarios/enviar-codigo-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, motivo })
            });
            if (res.ok) {
                msgEl.style.display = 'none';
                iniciarTimer();
            } else {
                const dataErro = await res.json();
                const mensagem = dataErro.message || 'Falha ao enviar o código de verificação.';
                exibirMensagem(msgEl, mensagem, true);
            }
        } catch (e) {
            exibirMensagem(msgEl, 'Erro de conexão com o servidor.', true);
        }
    }
    
    function iniciarTimer() {
        clearInterval(timerInterval);
        let tempoRestante = 120;
        const timerEl = document.getElementById('timer');
        timerEl.textContent = "02:00";
        document.getElementById('btnReenviarCodigo').disabled = true;

        timerInterval = setInterval(() => {
            tempoRestante--;
            const minutos = Math.floor(tempoRestante / 60).toString().padStart(2, '0');
            const segundos = (tempoRestante % 60).toString().padStart(2, '0');
            timerEl.textContent = `${minutos}:${segundos}`;
            if (tempoRestante <= 0) {
                clearInterval(timerInterval);
                timerEl.textContent = "Expirado";
                document.getElementById('btnReenviarCodigo').disabled = false;
            }
        }, 1000);
    }

    document.getElementById('btnReenviarCodigo').addEventListener('click', () => {
        const email = (fluxoAtual === 'cadastro') ? dadosUsuarioTemporario.email : emailParaRecuperar;
        iniciarFluxoVerificacao(email, fluxoAtual);
    });

    document.getElementById('formularioVerificacao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('codigoVerificacao').value;
        const msgEl = document.getElementById('mensagemVerificacao');
        const email = (fluxoAtual === 'cadastro') ? dadosUsuarioTemporario.email : emailParaRecuperar;
        
        if (fluxoAtual === 'cadastro') {
            dadosUsuarioTemporario.codigoVerificacao = codigo;
            try {
                const res = await fetch('http://localhost:7071/api/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosUsuarioTemporario)
                });
                const data = await res.json();
                if (res.ok) {
                    exibirMensagem(msgEl, data.message + ' Faça o login para continuar.', false);
                    setTimeout(() => {
                        fecharModais();
                        container.classList.remove("painel-direito-ativo");
                        formularioCadastro.reset();
                    }, 3000);
                } else {
                    exibirMensagem(msgEl, data.message, true);
                }
            } catch (err) {
                exibirMensagem(msgEl, 'Erro de conexão.', true);
            }
        } else { // fluxoAtual === 'recuperacao'
            try {
                const res = await fetch('http://localhost:7071/api/usuarios/verificar-codigo', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, codigo })
                });
                const data = await res.json();
                if(res.ok) {
                    fecharModais();
                    document.getElementById('passo1Recuperacao').style.display = 'none';
                    document.getElementById('passo2Recuperacao').style.display = 'block';
                    modalEsqueceuSenha.style.display = 'flex';
                } else {
                    exibirMensagem(msgEl, data.message, true);
                }
            } catch (error) {
                exibirMensagem(msgEl, 'Erro de conexão.', true);
            }
        }
    });

    // --- RECUPERAÇÃO DE SENHA ---
    document.getElementById('linkEsqueceuSenha').addEventListener('click', (e) => {
        e.preventDefault();
        fecharModais();
        document.getElementById('passo1Recuperacao').style.display = 'block';
        document.getElementById('passo2Recuperacao').style.display = 'none';
        document.getElementById('emailRecuperacao').value = '';
        limparErros('modalEsqueceuSenha');
        modalEsqueceuSenha.style.display = 'flex';
    });

    document.getElementById('btnVerificarEmail').addEventListener('click', async () => {
        const email = document.getElementById('emailRecuperacao').value;
        const erroEl = document.getElementById('erroEmailRecuperacao');
        limparErros('modalEsqueceuSenha');

        if (!isValidEmail(email)) {
            erroEl.textContent = 'Por favor, insira um e-mail válido.';
            return;
        }

        try {
            const res = await fetch('http://localhost:7071/api/password-reset/check-email', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.exists) {
                emailParaRecuperar = email;
                fluxoAtual = 'recuperacao';
                fecharModais();
                iniciarFluxoVerificacao(email, 'recuperacao');
            } else {
                erroEl.textContent = 'E-mail não encontrado em nosso sistema.';
            }
        } catch(e) {
            erroEl.textContent = 'Erro de conexão com o servidor.';
        }
    });
    
    document.getElementById('btnAtualizarSenha').addEventListener('click', async () => {
        limparErros('passo2Recuperacao');
        const novaSenha = document.getElementById('novaSenha').value;
        const confirmarSenha = document.getElementById('confirmarNovaSenha').value;
        let isValid = true;
        
        if (novaSenha.length < 6) {
             document.getElementById('erroNovaSenha').textContent = 'A nova senha deve ter no mínimo 6 caracteres.';
             isValid = false;
        }
        if (novaSenha !== confirmarSenha) {
            document.getElementById('erroConfirmarNovaSenha').textContent = 'As senhas não coincidem.';
            isValid = false;
        }
        if (!isValid) return;

        try {
             const res = await fetch('http://localhost:7071/api/password-reset/update', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailParaRecuperar, newPassword: novaSenha })
            });
            const data = await res.json();
            if (data.success) {
                fecharModais();
                modalConfirmacaoSenha.style.display = 'flex';
            } else {
                 document.getElementById('erroConfirmarNovaSenha').textContent = data.message || 'Erro ao atualizar senha.';
            }
        } catch(e) {
             document.getElementById('erroConfirmarNovaSenha').textContent = 'Erro de conexão com o servidor.';
        }
    });

    // --- EVENTOS DE FECHAR MODAIS ---
    document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharModais));
    document.getElementById('btnFecharConfirmacaoSenha').addEventListener('click', fecharModais);
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            fecharModais();
        }
    });
});

