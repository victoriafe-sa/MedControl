document.addEventListener('DOMContentLoaded', () => {
    let usuarioAtual = null;
    let dadosParaSalvar = null;
    let timerInterval = null;
    let novaSenhaTemporaria = null;

    // --- ELEMENTOS DOM ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentPanels = document.querySelectorAll('.conteudo-principal');
    const modalEditarPerfil = document.getElementById('modalEditarPerfil');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    const modalRedefinirSenha = document.getElementById('modalRedefinirSenha');
    const modalVerificacaoEmailEdicao = document.getElementById('modalVerificacaoEmailEdicao');
    const formRedefinirSenha = document.getElementById('formularioRedefinirSenha');
    
    // --- FUNÇÕES UTILITÁRIAS ---
    const abrirModal = (modal) => modal.style.display = 'flex';
    
    const fecharTodosModais = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        clearInterval(timerInterval);
    };

    const exibirToast = (mensagem) => {
        const toast = document.createElement('div');
        toast.className = `fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg bg-green-500 z-50`;
        toast.textContent = mensagem; 
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };
    
    const exibirMensagemNoModal = (el, texto, isErro) => {
        el.textContent = texto;
        el.className = 'mensagem ' + (isErro ? 'erro' : 'sucesso');
        el.style.display = 'block';
    };

    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    function verificarAutenticacao() {
        const dadosUsuario = sessionStorage.getItem('medControlUser');
        if (!dadosUsuario) {
            window.location.href = 'TelaLoginCadastro.html';
            return;
        }
        usuarioAtual = JSON.parse(dadosUsuario);
        document.getElementById('userInfoSidebar').innerHTML = `<p class="font-semibold text-gray-800">${usuarioAtual.nome}</p><p class="text-gray-600">${usuarioAtual.email}</p>`;
        
        renderizarPerfil();
    }

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('medControlUser');
        window.location.href = 'Home.html';
    });

    // --- NAVEGAÇÃO DA BARRA LATERAL ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const aba = link.dataset.aba;
            sidebarLinks.forEach(l => l.classList.remove('ativo'));
            link.classList.add('ativo');
            contentPanels.forEach(p => p.classList.add('hidden'));
            document.getElementById(`conteudo-${aba}`).classList.remove('hidden');
        });
    });

    // --- MEU PERFIL ---
    const renderizarPerfil = () => {
        const container = document.getElementById('conteudo-perfil');
        const dataFormatada = new Date(usuarioAtual.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR');

        container.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-lg">
                <div class="flex justify-between items-center mb-8 border-b pb-4">
                    <h2 class="text-3xl font-bold text-gray-800">Meu Perfil</h2>
                    <div>
                        <button id="btnAbrirRedefinirSenha" class="btn-secundario py-2 px-5 rounded-lg text-base font-semibold mr-4" style="background-color: #ca8a04; color: white;">Redefinir Senha</button>
                        <button id="btnEditarPerfil" class="btn-primario py-2 px-5 rounded-lg text-base font-semibold">Editar Perfil</button>
                    </div>
                </div>
                <div class="space-y-5 text-lg">
                    <div><label class="font-semibold text-gray-600">Nome:</label><span class="ml-2 text-gray-800">${usuarioAtual.nome}</span></div>
                    <div><label class="font-semibold text-gray-600">Email:</label><span class="ml-2 text-gray-800">${usuarioAtual.email}</span></div>
                    <div><label class="font-semibold text-gray-600">CPF/CNS:</label><span class="ml-2 text-gray-800">${usuarioAtual.cpf_cns}</span></div>
                    <div><label class="font-semibold text-gray-600">CEP:</label><span class="ml-2 text-gray-800">${usuarioAtual.cep}</span></div>
                    <div><label class="font-semibold text-gray-600">Data de Nascimento:</label><span class="ml-2 text-gray-800">${dataFormatada}</span></div>
                </div>
            </div>
        `;
        document.getElementById('btnEditarPerfil').addEventListener('click', abrirModalEdicaoPerfil);
        document.getElementById('btnAbrirRedefinirSenha').addEventListener('click', abrirModalRedefinirSenha);
    };

    const abrirModalEdicaoPerfil = () => {
        limparErrosEdicao();
        document.getElementById('editarNome').value = usuarioAtual.nome;
        document.getElementById('editarEmail').value = usuarioAtual.email;
        document.getElementById('editarCpfCns').value = usuarioAtual.cpf_cns;
        document.getElementById('editarCep').value = usuarioAtual.cep;
        document.getElementById('editarNascimento').value = usuarioAtual.data_nascimento;
        abrirModal(modalEditarPerfil);
    };
    
    const isValidEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const limparErrosEdicao = () => {
        document.querySelectorAll('#formularioEditarPerfil .input-error').forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll('#formularioEditarPerfil .error-message').forEach(el => el.textContent = '');
    };
    
    const isMaisDe18 = (dataNasc) => {
        if (!dataNasc) return false; 
        const hoje = new Date();
        const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
        const dataNascimentoUTC = new Date(new Date(dataNasc).toISOString().slice(0, 10));
        return dataNascimentoUTC <= dezoitoAnosAtras;
    };
    
    const validarFormularioEdicao = () => {
        limparErrosEdicao();
        let isValid = true;
        const fields = [
            { id: 'editarNome', errorId: 'erroEditarNome', message: 'O nome é obrigatório.' },
            { id: 'editarEmail', errorId: 'erroEditarEmail', message: 'O e-mail é obrigatório.' },
            { id: 'editarCpfCns', errorId: 'erroEditarCpfCns', message: 'O CPF/CNS é obrigatório.' },
            { id: 'editarCep', errorId: 'erroEditarCep', message: 'O CEP é obrigatório.' },
            { id: 'editarNascimento', errorId: 'erroEditarNascimento', message: 'A data de nascimento é obrigatória.' }
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorEl = document.getElementById(field.errorId);
            if (!input.value.trim()) {
                input.classList.add('input-error');
                errorEl.textContent = field.message;
                isValid = false;
            }
        });
        
        const emailInput = document.getElementById('editarEmail');
        if (emailInput.value.trim() && !isValidEmail(emailInput.value)) {
            emailInput.classList.add('input-error');
            document.getElementById('erroEditarEmail').textContent = 'Formato de e-mail inválido.';
            isValid = false;
        }
        
        const nascimentoInput = document.getElementById('editarNascimento');
        if (nascimentoInput.value && !isMaisDe18(nascimentoInput.value)) {
            nascimentoInput.classList.add('input-error');
            document.getElementById('erroEditarNascimento').textContent = 'Você deve ter 18 anos ou mais.';
            isValid = false;
        }

        return isValid;
    };

    document.getElementById('formularioEditarPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!validarFormularioEdicao()) return;

        dadosParaSalvar = {
            nome: document.getElementById('editarNome').value,
            email: document.getElementById('editarEmail').value,
            cpf_cns: document.getElementById('editarCpfCns').value,
            cep: document.getElementById('editarCep').value,
            data_nascimento: document.getElementById('editarNascimento').value,
        };
        
        verificarEContinuarSalvar();
    });

    async function verificarEContinuarSalvar() {
         try {
            const res = await fetch('http://localhost:7071/api/usuarios/verificar-existencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: dadosParaSalvar.email,
                    cpf_cns: dadosParaSalvar.cpf_cns,
                    id: usuarioAtual.id 
                })
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            let hasError = false;

            if (data.email) {
                document.getElementById('editarEmail').classList.add('input-error');
                document.getElementById('erroEditarEmail').textContent = 'Este e-mail já está cadastrado.';
                hasError = true;
            }
            if (data.cpf_cns) {
                document.getElementById('editarCpfCns').classList.add('input-error');
                document.getElementById('erroEditarCpfCns').textContent = 'Este CPF/CNS já está cadastrado.';
                hasError = true;
            }
            if(hasError) return;

            const emailAlterado = dadosParaSalvar.email.toLowerCase() !== usuarioAtual.email.toLowerCase();
            if (emailAlterado) {
                iniciarFluxoVerificacaoEdicao();
            } else {
                salvarPerfil(false);
            }

        } catch (err) {
            console.error("Erro ao verificar dados:", err);
            document.getElementById('erroEditarNome').textContent = "Erro de conexão ao verificar dados.";
        }
    }


    async function salvarPerfil(comVerificacao, codigo = null) {
        const id = usuarioAtual.id;
        let url = `http://localhost:7071/api/users/${id}`;
        let body = { ...dadosParaSalvar };

        if (comVerificacao) {
            url = `http://localhost:7071/api/users/${id}/update-verified`;
            body.codigoVerificacao = codigo;
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                usuarioAtual = { ...usuarioAtual, ...dadosParaSalvar };
                sessionStorage.setItem('medControlUser', JSON.stringify(usuarioAtual));
                
                fecharTodosModais();
                renderizarPerfil();
                exibirToast('Perfil atualizado com sucesso!');
            } else {
                 if (response.status === 409) { 
                    fecharTodosModais();
                    abrirModal(modalEditarPerfil);
                    const campo = data.field === 'email' ? 'editarEmail' : 'editarCpfCns';
                    const erroEl = data.field === 'email' ? 'erroEditarEmail' : 'erroEditarCpfCns';
                    document.getElementById(campo).classList.add('input-error');
                    document.getElementById(erroEl).textContent = `Este ${data.field} já está cadastrado.`;
                 } else if (response.status === 400 && comVerificacao) { 
                    exibirMensagemNoModal(document.getElementById('mensagemVerificacaoEdicao'), data.message, true);
                 } else {
                    document.getElementById('erroEditarNome').textContent = `Erro: ${data.message || 'Ocorreu um erro.'}`;
                 }
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            document.getElementById('erroEditarNome').textContent = "Erro de conexão ao tentar atualizar.";
        }
    }

    // --- FLUXO DE VERIFICAÇÃO DE E-MAIL (EDIÇÃO) ---
    async function iniciarFluxoVerificacaoEdicao() {
        fecharTodosModais();
        abrirModal(modalVerificacaoEmailEdicao);
        document.getElementById('emailParaVerificarEdicao').textContent = dadosParaSalvar.email;
        const msgEl = document.getElementById('mensagemVerificacaoEdicao');
        exibirMensagemNoModal(msgEl, 'Enviando código...', false);

        try {
            const res = await fetch('http://localhost:7071/api/usuarios/enviar-codigo-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: dadosParaSalvar.email, motivo: 'alteracao' })
            });
            if (res.ok) {
                msgEl.style.display = 'none';
                iniciarTimerEdicao();
            } else {
                const dataErro = await res.json();
                const mensagem = dataErro.message || 'Falha ao enviar o código de verificação.';
                exibirMensagemNoModal(msgEl, mensagem, true);
            }
        } catch (e) {
            exibirMensagemNoModal(msgEl, 'Falha de conexão com o servidor.', true);
        }
    }

    function iniciarTimerEdicao() {
        clearInterval(timerInterval);
        let tempoRestante = 120;
        const timerEl = document.getElementById('timerEdicao');
        const reenviarBtn = document.getElementById('btnReenviarCodigoEdicao');
        
        reenviarBtn.disabled = true;
        timerEl.textContent = "02:00";

        timerInterval = setInterval(() => {
            tempoRestante--;
            const minutos = Math.floor(tempoRestante / 60).toString().padStart(2, '0');
            const segundos = (tempoRestante % 60).toString().padStart(2, '0');
            timerEl.textContent = `${minutos}:${segundos}`;
            if (tempoRestante <= 0) {
                clearInterval(timerInterval);
                timerEl.textContent = "Expirado";
                reenviarBtn.disabled = false;
            }
        }, 1000);
    }
    
    document.getElementById('btnReenviarCodigoEdicao').addEventListener('click', iniciarFluxoVerificacaoEdicao);

    document.getElementById('formularioVerificacaoEdicao').addEventListener('submit', (e) => {
        e.preventDefault();
        const codigo = document.getElementById('codigoVerificacaoEdicao').value;
        if (codigo.length !== 6) {
            exibirMensagemNoModal(document.getElementById('mensagemVerificacaoEdicao'), 'Insira o código de 6 dígitos.', true);
            return;
        }
        salvarPerfil(true, codigo);
    });
    
    // --- REDEFINIÇÃO DE SENHA ---
    const abrirModalRedefinirSenha = () => {
        formRedefinirSenha.reset();
        document.querySelectorAll('#formularioRedefinirSenha .error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('#formularioRedefinirSenha .input-error').forEach(el => el.classList.remove('input-error'));
        document.getElementById('passo1Redefinir').style.display = 'block';
        document.getElementById('passo2Redefinir').style.display = 'none';
        formRedefinirSenha.querySelector('button[type="submit"]').textContent = 'Avançar';
        abrirModal(modalRedefinirSenha);
    };

    const validarPrimeiroPassoSenha = () => {
        let isValid = true;
        const novaSenhaInput = document.getElementById('redefinirNovaSenha');
        const confirmarSenhaInput = document.getElementById('redefinirConfirmarNovaSenha');
        const erroNovaSenha = document.getElementById('erroRedefinirNovaSenha');
        const erroConfirmarSenha = document.getElementById('erroRedefinirConfirmarNovaSenha');

        // Limpa erros anteriores
        [novaSenhaInput, confirmarSenhaInput].forEach(i => i.classList.remove('input-error'));
        [erroNovaSenha, erroConfirmarSenha].forEach(e => e.textContent = '');

        if (!novaSenhaInput.value) {
            novaSenhaInput.classList.add('input-error');
            erroNovaSenha.textContent = 'O campo nova senha é obrigatório.';
            isValid = false;
        } else if (novaSenhaInput.value.length < 6) {
            novaSenhaInput.classList.add('input-error');
            erroNovaSenha.textContent = 'A senha deve ter no mínimo 6 caracteres.';
            isValid = false;
        }

        if (!confirmarSenhaInput.value) {
             confirmarSenhaInput.classList.add('input-error');
             erroConfirmarSenha.textContent = 'A confirmação de senha é obrigatória.';
             isValid = false;
        }

        if (isValid && novaSenhaInput.value !== confirmarSenhaInput.value) {
            confirmarSenhaInput.classList.add('input-error');
            erroConfirmarSenha.textContent = 'As senhas não coincidem.';
            isValid = false;
        }

        return isValid;
    };

    formRedefinirSenha.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passo1Visivel = document.getElementById('passo1Redefinir').style.display !== 'none';
        
        if (passo1Visivel) {
            if (validarPrimeiroPassoSenha()) {
                novaSenhaTemporaria = document.getElementById('redefinirNovaSenha').value;
                document.getElementById('passo1Redefinir').style.display = 'none';
                document.getElementById('passo2Redefinir').style.display = 'block';
                formRedefinirSenha.querySelector('button[type="submit"]').textContent = 'Redefinir Senha';
            }
        } else {
            const senhaAtualInput = document.getElementById('redefinirSenhaAtual');
            const erroSenhaAtual = document.getElementById('erroRedefinirSenhaAtual');
            senhaAtualInput.classList.remove('input-error');
            erroSenhaAtual.textContent = '';
            
            if (!senhaAtualInput.value) {
                 senhaAtualInput.classList.add('input-error');
                 erroSenhaAtual.textContent = 'Por favor, informe sua senha atual.';
                 return;
            }

            try {
                const res = await fetch(`http://localhost:7071/api/users/${usuarioAtual.id}/redefine-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senhaAtual: senhaAtualInput.value,
                        novaSenha: novaSenhaTemporaria
                    })
                });

                if (res.ok) {
                    fecharTodosModais();
                    exibirToast('Senha alterada com sucesso!');
                } else {
                    const data = await res.json();
                    senhaAtualInput.classList.add('input-error');
                    erroSenhaAtual.textContent = data.message || 'Erro ao redefinir senha.';
                }

            } catch(err) {
                erroSenhaAtual.textContent = 'Erro de conexão com o servidor.';
            }
        }
    });

    // --- PLACEHOLDERS ---
    const renderizarReservas = () => { document.getElementById('conteudo-reservas').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Minhas Reservas</h2><p class="mt-4 text-lg">Suas reservas de medicamentos aparecerão aqui.</p></div>'; };
    const renderizarFavoritos = () => { document.getElementById('conteudo-favoritos').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Favoritos</h2><p class="mt-4 text-lg">Seus medicamentos favoritados aparecerão aqui para fácil acesso.</p></div>'; };
    const renderizarHistorico = () => { document.getElementById('conteudo-historico').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Histórico</h2><p class="mt-4 text-lg">Seu histórico de medicamentos retirados será exibido aqui.</p></div>'; };
    const renderizarNotificacoes = () => { document.getElementById('conteudo-notificacoes').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Notificações</h2><p class="mt-4 text-lg">Alertas e lembretes importantes sobre suas reservas e medicamentos.</p></div>'; };

    // --- EVENTOS DE FECHAR MODAIS ---
    document.querySelectorAll('.btnFecharModal').forEach(btn => btn.addEventListener('click', () => fecharTodosModais()));

    // --- INICIALIZAÇÃO ---
    verificarAutenticacao();
    renderizarReservas();
    renderizarFavoritos();
    renderizarHistorico();
    renderizarNotificacoes();
});
