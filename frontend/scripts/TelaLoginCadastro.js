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
    // Armazena os dados do formulário de cadastro enquanto o usuário verifica o e-mail.
    let dadosUsuarioTemporario = null;
    let emailParaRecuperar = null;
    let timerInterval = null;
    let fluxoAtual = 'cadastro'; // Controla se o modal de verificação é para 'cadastro' ou 'recuperacao'

    // --- FUNÇÕES UTILITÁRIAS ---
    const fecharModais = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        clearInterval(timerInterval); // Garante que o timer pare ao fechar o modal.
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

    // --- LÓGICA DE ANIMAÇÃO DO PAINEL LOGIN/CADASTRO ---
    document.getElementById('btnCadastrar').addEventListener('click', () => container.classList.add("painel-direito-ativo"));
    document.getElementById('btnEntrar').addEventListener('click', () => container.classList.remove("painel-direito-ativo"));
    if (window.location.hash === '#register') {
        container.classList.add("painel-direito-ativo");
    }


    // --- LÓGICA DE LOGIN RF02.1 ---
    // A função dentro dele será executada sempre que o formulário for "enviado" (submit).
    formularioLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Pega os valores digitados pelo usuário nos campos de input.
        const emailOuCpf = document.getElementById('loginEmailCpf').value;
        const senha = document.getElementById('loginSenha').value;

        // Seleciona o elemento HTML onde as mensagens de feedback (como "Entrando..." ou "Senha incorreta") serão exibidas.
        const elMensagem = document.getElementById('mensagemLogin');

        // Mostra uma mensagem de "carregando" para o usuário saber que algo está acontecendo.
        exibirMensagem(elMensagem, 'Entrando...', false);

        // O bloco try...catch é usado para lidar com erros que podem acontecer
        // durante a comunicação com o servidor (ex: servidor offline).
        try {
            // Inicia a requisição de rede assíncrona (fetch) para a API de login.
            // 'await' pausa a execução da função até que a resposta do servidor chegue.
            const resposta = await fetch('http://localhost:7071/api/login', {
                method: 'POST', // Define o método HTTP como POST, usado para enviar dados.
                headers: {
                    // Informa ao servidor que os dados enviados no corpo (body) estão no formato JSON.
                    'Content-Type': 'application/json'
                },
                // Converte o objeto JavaScript {emailOuCpf, senha} em uma string JSON para enviar ao servidor.
                body: JSON.stringify({ emailOuCpf, senha })
            });

            // Converte a resposta do servidor (que vem como JSON) em um objeto JavaScript.
            const dados = await resposta.json();

            // Verifica se o login foi bem-sucedido, com base na propriedade 'success' enviada pelo servidor.
            if (dados.success) {
                // Se o login for bem-sucedido, armazena os dados do usuário no 'sessionStorage'.
                // Isso "mantém" o usuário logado enquanto a aba do navegador estiver aberta.
                sessionStorage.setItem('medControlUser', JSON.stringify(dados.user));

                // Redireciona o usuário para a página correta com base no seu perfil.
                // É um operador ternário: SE (dados.user.perfil === 'usuario') ENTÃO vai para 'TelaUsuario.html',
                // SENÃO (ex: admin) vai para 'Admin.html'.
                window.location.href = (dados.user.perfil === 'usuario') ? 'TelaUsuario.html' : 'Admin.html';
            } else {
                // Se 'dados.success' for falso, exibe a mensagem de erro vinda do servidor (ex: "Usuário ou senha inválidos").
                // O 'true' sinaliza que é uma mensagem de erro (controlando o estilo, ex: cor vermelha).
                exibirMensagem(elMensagem, dados.message, true);
            }
        } catch (erro) {
            // Este bloco 'catch' é executado se houver um erro de rede (ex: servidor não respondeu, sem internet).
            exibirMensagem(elMensagem, 'Erro de conexão com o servidor.', true);
        }
    });

    // --- LÓGICA DE CADASTRO E VERIFICAÇÃO ---
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
        // (Implementação da validação do formulário no lado do cliente)
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

        //Verifica se o CEP foi validado com sucesso
        const cepInput = document.getElementById('cadastroCep');
        if (cepInput.value.trim() && !cepInput.classList.contains('input-success')) {
            cepInput.classList.add('input-error');
            document.getElementById('erroCadastroCep').textContent = 'Por favor, insira um CEP válido para continuar.';
            isValid = false;
        }

        return isValid;
    }

    // --- ETAPA 1 e 2 (Fluxo) ---
    // Evento disparado quando o usuário clica em "Cadastrar".
    formularioCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validarCadastro()) return; // Validação client-side

        // Armazena os dados do formulário temporariamente.
        dadosUsuarioTemporario = {
            nome: document.getElementById('cadastroNome').value,
            email: document.getElementById('cadastroEmail').value,
            cpf_cns: document.getElementById('cadastroCpfCns').value,
            cep: document.getElementById('cadastroCep').value,
            data_nascimento: document.getElementById('cadastroNascimento').value,
            senha: document.getElementById('cadastroSenha').value
        };

        // --- ETAPA 3 (Fluxo) ---
        // Faz uma requisição ao backend para verificar se e-mail/CPF já existem.
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
            if (hasError) return;

            // Se os dados forem únicos, inicia o processo de envio do código de verificação.
            fluxoAtual = 'cadastro';
            await iniciarFluxoVerificacao(dadosUsuarioTemporario.email, 'cadastro');
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

    inputCepCadastro.addEventListener('focus', () => {
    // Limpa a mensagem de validação (Ex: "CEP válido")
    document.getElementById('validacaoCadastroCep').textContent = '';
    document.getElementById('validacaoCadastroCep').className = 'validation-message';
    
    // Limpa a mensagem de erro (Ex: "O CEP é obrigatório.")
    document.getElementById('erroCadastroCep').textContent = '';
    
    // Remove as bordas coloridas
    inputCepCadastro.classList.remove('input-success', 'input-error');
});


    // --- ETAPA 7 (Fluxo) ---
    // Função central que envia a requisição para o backend gerar e enviar o código.
    async function iniciarFluxoVerificacao(email, motivo) {
        document.getElementById('emailParaVerificar').textContent = email;
        const msgEl = document.getElementById('mensagemVerificacao');
        exibirMensagem(msgEl, 'Enviando código...', false);

        // Ajusta o texto do modal dependendo se é um cadastro ou recuperação de senha.
        if (motivo === 'cadastro') {
            document.getElementById('tituloModalVerificacao').textContent = 'Verifique seu E-mail';
            document.getElementById('btnVerificarCodigo').textContent = 'Verificar e Cadastrar';
        } else {
            document.getElementById('tituloModalVerificacao').textContent = 'Recuperar Senha';
            document.getElementById('btnVerificarCodigo').textContent = 'Verificar Código';
        }

        document.getElementById('btnReenviarCodigo').disabled = true;

        modalVerificacaoEmail.style.display = 'flex'; // Exibe o modal para o usuário.

        try {
            // Faz a chamada à API do backend.
            const res = await fetch('http://localhost:7071/api/usuarios/enviar-codigo-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, motivo })
            });
            if (res.ok) {
                // Se o backend enviou o e-mail com sucesso, inicia o timer no frontend.
                msgEl.style.display = 'none';
                iniciarTimer();
            } else {
                // Caso contrário, exibe a mensagem de erro vinda do backend (ex: e-mail inválido pelo Hunter).
                const dataErro = await res.json();
                const mensagem = dataErro.message || 'Falha ao enviar o código de verificação.';
                exibirMensagem(msgEl, mensagem, true);
                document.getElementById('btnReenviarCodigo').disabled = false;
            }
        } catch (e) {
            exibirMensagem(msgEl, 'Erro de conexão com o servidor.', true);

            document.getElementById('btnReenviarCodigo').disabled = false;
        }
    }

    // Inicia o cronômetro de 2 minutos na tela.
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

    // Evento para o botão de reenviar o código.
    document.getElementById('btnReenviarCodigo').addEventListener('click', () => {
        const email = (fluxoAtual === 'cadastro') ? dadosUsuarioTemporario.email : emailParaRecuperar;
        iniciarFluxoVerificacao(email, fluxoAtual);
    });

    // --- ETAPA 8 e 11 (Fluxo) ---
    // Evento disparado quando o usuário insere o código e clica em "Verificar".
    document.getElementById('formularioVerificacao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('codigoVerificacao').value;
        const msgEl = document.getElementById('mensagemVerificacao');
        const email = (fluxoAtual === 'cadastro') ? dadosUsuarioTemporario.email : emailParaRecuperar;

        // Se o fluxo for de cadastro, a requisição já finaliza o registro.
        if (fluxoAtual === 'cadastro') {
            dadosUsuarioTemporario.codigoVerificacao = codigo;
            try {
                // Envia todos os dados do usuário + o código para o endpoint de registro.
                const res = await fetch('http://localhost:7071/api/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosUsuarioTemporario)
                });
                const data = await res.json();
                if (res.ok) { // Sucesso
                    exibirMensagem(msgEl, data.message + ' Faça o login para continuar.', false);
                    setTimeout(() => {
                        fecharModais();
                        container.classList.remove("painel-direito-ativo"); // Volta para a tela de login
                        formularioCadastro.reset();
                    }, 500);
                } else { // Falha (código errado, etc.)
                    exibirMensagem(msgEl, data.message, true);
                }
            } catch (err) {
                exibirMensagem(msgEl, 'Erro de conexão.', true);
            }
        } else { // Se o fluxo for de recuperação de senha, apenas valida o código.
            try {
                const res = await fetch('http://localhost:7071/api/usuarios/verificar-codigo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, codigo })
                });
                const data = await res.json();
                if (res.ok) { // Se o código for válido, avança para a etapa de criar nova senha.
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

    // --- LÓGICA DE RECUPERAÇÃO DE SENHA ---
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
        } catch (e) {
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
        } catch (e) {
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
