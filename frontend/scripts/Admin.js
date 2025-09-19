document.addEventListener('DOMContentLoaded', () => {
    // --- Autenticação e Inicialização ---
    const dadosUsuario = sessionStorage.getItem('medControlUser');
    if (!dadosUsuario) { window.location.href = 'TelaLoginCadastro.html'; return; }
    let usuarioAtual = JSON.parse(dadosUsuario);
    if (usuarioAtual.perfil !== 'admin') { window.location.href = 'TelaUsuario.html'; return; }
    document.getElementById('boasVindasAdmin').textContent = `Olá, ${usuarioAtual.nome.split(' ')[0]}!`;

    // --- Seletores de Modais e Formulários ---
    const modalFormularioUsuario = document.getElementById('modalFormularioUsuario');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    const modalVerificacaoEmail = document.getElementById('modalVerificacaoEmail');
    const modalEditarPerfilAdmin = document.getElementById('modalEditarPerfilAdmin');
    const modalMeuPerfilAdmin = document.getElementById('modalMeuPerfilAdmin');
    const modalRedefinirSenhaAdmin = document.getElementById('modalRedefinirSenhaAdmin');
    const formularioUsuario = document.getElementById('formularioUsuario');
    
    // --- Variáveis de Estado ---
    let dadosUsuarioAtualParaSalvar = null;
    let timerInterval = null;
    let fluxoVerificacao = 'adicionar'; // 'adicionar', 'editarTabela', 'editarMeuPerfil'
    let usuarioEditadoOriginal = null;

    // --- Funções Utilitárias ---
    const fecharTodosModais = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('ativo'));
        clearInterval(timerInterval);
    };

    const limparErrosFormulario = (formId) => {
        document.querySelectorAll(`#${formId} .input-error`).forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll(`#${formId} .error-message`).forEach(el => el.textContent = '');
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

    const isValidEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const isMaisDe18 = (dataNasc) => {
        if (!dataNasc) return false;
        const hoje = new Date();
        const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
        const dataNascimentoUTC = new Date(new Date(dataNasc).toISOString().slice(0, 10));
        return dataNascimentoUTC <= dezoitoAnosAtras;
    };

    // --- Navegação ---
    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('medControlUser');
        window.location.href = 'Home.html';
    });
    document.querySelectorAll('.btn-aba').forEach(aba => {
        aba.addEventListener('click', () => {
            document.querySelectorAll('.btn-aba').forEach(a => a.classList.remove('ativo'));
            document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativo'));
            aba.classList.add('ativo');
            document.getElementById(`conteudo-${aba.dataset.aba}`).classList.add('ativo');
        });
    });

    // --- Lógica de Gerenciamento de Usuários (Tabela) ---
    const corpoTabelaUsuarios = document.getElementById('corpoTabelaUsuarios');

    const abrirModalParaAdicionar = () => {
        fluxoVerificacao = 'adicionar';
        formularioUsuario.reset();
        limparErrosFormulario('formularioUsuario');
        document.getElementById('idUsuario').value = '';
        document.getElementById('tituloModalUsuario').textContent = 'Adicionar Novo Usuário';
        document.getElementById('containerCampoSenha').style.display = 'block';
        modalFormularioUsuario.classList.add('ativo');
    };

    const abrirModalParaEditar = (usuario) => {
        fluxoVerificacao = 'editarTabela';
        usuarioEditadoOriginal = usuario; 
        formularioUsuario.reset();
        limparErrosFormulario('formularioUsuario');
        document.getElementById('idUsuario').value = usuario.id;
        document.getElementById('emailOriginal').value = usuario.email;
        document.getElementById('nomeUsuario').value = usuario.nome;
        document.getElementById('emailUsuario').value = usuario.email;
        document.getElementById('cpfUsuario').value = usuario.cpf_cns;
        document.getElementById('cepUsuario').value = usuario.cep;
        document.getElementById('nascimentoUsuario').value = usuario.data_nascimento ? new Date(usuario.data_nascimento).toISOString().split('T')[0] : '';
        document.getElementById('perfilUsuario').value = usuario.perfil;
        document.getElementById('tituloModalUsuario').textContent = 'Editar Usuário';
        document.getElementById('containerCampoSenha').style.display = 'none';
        modalFormularioUsuario.classList.add('ativo');
    };

    document.getElementById('abrirModalAdicionarUsuario').addEventListener('click', abrirModalParaAdicionar);

    async function carregarUsuarios() {
        try {
            const resposta = await fetch('http://localhost:7071/api/users');
            const usuarios = await resposta.json();
            
            const usuariosFiltrados = usuarios.filter(u => u.id !== usuarioAtual.id);

            corpoTabelaUsuarios.innerHTML = '';
            usuariosFiltrados.forEach(usuario => {
                const tr = document.createElement('tr');
                tr.className = `border-b border-gray-200 ${!usuario.ativo ? 'bg-red-50 text-gray-500' : ''}`;
                tr.innerHTML = `
                    <td class="p-4">${usuario.nome}</td>
                    <td class="p-4">${usuario.email}</td>
                    <td class="p-4">${usuario.cpf_cns}</td>
                    <td class="p-4">${usuario.cep}</td>
                    <td class="p-4">${new Date(usuario.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR')}</td>
                    <td class="p-4">${usuario.perfil}</td>
                    <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${usuario.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td class="p-4 flex space-x-2">
                        <button class="btn-editar btn-secundario py-1 px-3 rounded-lg text-sm" data-usuario='${JSON.stringify(usuario)}'>Editar</button>
                        <button class="btn-status btn-neutro py-1 px-3 rounded-lg text-sm" data-id="${usuario.id}" data-status-atual="${usuario.ativo}">${usuario.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button class="btn-excluir btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${usuario.id}">Excluir</button>
                    </td>
                `;
                corpoTabelaUsuarios.appendChild(tr);
            });
        } catch (erro) {
            console.error("Erro ao carregar usuários:", erro);
            corpoTabelaUsuarios.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500">Falha ao carregar usuários.</td></tr>';
        }
    }
    
    corpoTabelaUsuarios.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-editar')) {
            abrirModalParaEditar(JSON.parse(target.dataset.usuario));
        } else if (target.classList.contains('btn-excluir')) {
            const id = target.dataset.id;
            abrirConfirmacao('Excluir Usuário', 'Tem certeza que deseja excluir este usuário?', () => excluirUsuario(id));
        } else if (target.classList.contains('btn-status')) {
            const id = target.dataset.id;
            const statusAtual = target.dataset.statusAtual === 'true';
            abrirConfirmacao(`Confirmar ${statusAtual ? 'Desativação' : 'Ativação'}`, `Tem certeza que deseja ${statusAtual ? 'desativar' : 'ativar'} este usuário?`, () => alterarStatusUsuario(id, !statusAtual));
        }
    });

    function abrirConfirmacao(titulo, mensagem, callback) {
        document.getElementById('tituloConfirmacao').textContent = titulo;
        document.getElementById('mensagemConfirmacao').textContent = mensagem;
        const btnConfirmar = document.getElementById('btnConfirmarAcao');
        
        const novoBtn = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);

        novoBtn.addEventListener('click', () => {
            callback();
            fecharTodosModais();
        });
        
        modalConfirmacao.classList.add('ativo');
    }

    function validarFormularioUsuario(formId, isEditing) {
        limparErrosFormulario(formId);
        let isValid = true;
        const fields = [
            { id: 'nomeUsuario', errorId: 'erroNomeUsuario', message: 'O nome é obrigatório.' },
            { id: 'emailUsuario', errorId: 'erroEmailUsuario', message: 'O e-mail é obrigatório.' },
            { id: 'cpfUsuario', errorId: 'erroCpfUsuario', message: 'O CPF/CNS é obrigatório.' },
            { id: 'cepUsuario', errorId: 'erroCepUsuario', message: 'O CEP é obrigatório.' },
        ];
        fields.forEach(f => {
            const input = document.getElementById(f.id);
            if (!input.value.trim()) {
                input.classList.add('input-error');
                document.getElementById(f.errorId).textContent = f.message;
                isValid = false;
            }
        });
        
        const emailInput = document.getElementById('emailUsuario');
        if (emailInput.value.trim() && !isValidEmail(emailInput.value.trim())) {
            emailInput.classList.add('input-error');
            document.getElementById('erroEmailUsuario').textContent = 'Formato de e-mail inválido.';
            isValid = false;
        }

        if (!isEditing) {
            const senhaInput = document.getElementById('senhaUsuario');
            if (!senhaInput.value.trim()) {
                senhaInput.classList.add('input-error');
                document.getElementById('erroSenhaUsuario').textContent = 'A senha é obrigatória.';
                isValid = false;
            } else if (senhaInput.value.length < 6) {
                senhaInput.classList.add('input-error');
                document.getElementById('erroSenhaUsuario').textContent = 'A senha deve ter no mínimo 6 caracteres.';
                isValid = false;
            }
        }
        const nascInput = document.getElementById('nascimentoUsuario');
        if (!nascInput.value || !isMaisDe18(nascInput.value)) {
            nascInput.classList.add('input-error');
            document.getElementById('erroNascimentoUsuario').textContent = 'A data de nascimento é obrigatória e o usuário deve ter mais de 18 anos.';
            isValid = false;
        }
        return isValid;
    }

    formularioUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const estaEditando = !!document.getElementById('idUsuario').value;
        if (!validarFormularioUsuario('formularioUsuario', estaEditando)) return;

        dadosUsuarioAtualParaSalvar = {
            nome: document.getElementById('nomeUsuario').value,
            email: document.getElementById('emailUsuario').value,
            cpf_cns: document.getElementById('cpfUsuario').value,
            cep: document.getElementById('cepUsuario').value,
            data_nascimento: document.getElementById('nascimentoUsuario').value,
            perfil: document.getElementById('perfilUsuario').value
        };

        const emailOriginal = document.getElementById('emailOriginal').value;
        const emailAlterado = estaEditando && dadosUsuarioAtualParaSalvar.email.toLowerCase() !== emailOriginal.toLowerCase();

        if (estaEditando && !emailAlterado) {
            salvarUsuario(true, document.getElementById('idUsuario').value);
        } else {
            try {
                const res = await fetch('http://localhost:7071/api/password-reset/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: dadosUsuarioAtualParaSalvar.email })
                });
                const data = await res.json();
                if (data.exists) {
                    document.getElementById('emailUsuario').classList.add('input-error');
                    document.getElementById('erroEmailUsuario').textContent = 'Este e-mail já está cadastrado.';
                    return;
                }
                
                if (!estaEditando) {
                    dadosUsuarioAtualParaSalvar.senha = document.getElementById('senhaUsuario').value;
                }

                iniciarFluxoVerificacao();
            } catch (err) {
                alert('Erro de conexão ao verificar e-mail.');
            }
        }
    });

    async function iniciarFluxoVerificacao() {
        fecharTodosModais();
        modalVerificacaoEmail.classList.add('ativo');
        document.getElementById('emailParaVerificar').textContent = dadosUsuarioAtualParaSalvar.email;
        const msgEl = document.getElementById('mensagemVerificacao');
        exibirMensagemNoModal(msgEl, 'Enviando código...', false);
        
        try {
            const res = await fetch('http://localhost:7071/api/usuarios/enviar-codigo-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: dadosUsuarioAtualParaSalvar.email, motivo: 'alteracao' })
            });
            if (res.ok) {
                msgEl.style.display = 'none';
                iniciarTimer();
            } else {
                exibirMensagemNoModal(msgEl, 'Falha ao enviar e-mail.', true);
            }
        } catch (e) {
            exibirMensagemNoModal(msgEl, 'Falha de conexão.', true);
        }
    }
    
    function iniciarTimer() {
        clearInterval(timerInterval);
        let tempoRestante = 120;
        const timerEl = document.getElementById('timer');
        const reenviarBtn = document.getElementById('btnReenviarCodigoAdmin');
        
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
    
    document.getElementById('btnReenviarCodigoAdmin').addEventListener('click', iniciarFluxoVerificacao);

    document.getElementById('formularioVerificacao').addEventListener('submit', (e) => {
        e.preventDefault();
        const codigo = document.getElementById('codigoVerificacao').value;
        dadosUsuarioAtualParaSalvar.codigoVerificacao = codigo;
        
        if (fluxoVerificacao === 'adicionar') {
            const modalConfirmarSenha = document.getElementById('modalConfirmarSenha');
            fecharTodosModais();
            modalConfirmarSenha.classList.add('ativo');
            document.getElementById('formularioConfirmarSenha').reset();
        } else { 
            const id = (fluxoVerificacao === 'editarTabela') ? usuarioEditadoOriginal.id : usuarioAtual.id;
            salvarUsuario(true, id, true);
        }
    });

    async function salvarUsuario(estaEditando, id, comVerificacao = false) {
        let url, metodo;
        let body = { ...dadosUsuarioAtualParaSalvar };

        if (!estaEditando) {
            url = 'http://localhost:7071/api/users';
            metodo = 'POST';
        } else {
            metodo = 'PUT';
            url = comVerificacao 
                ? `http://localhost:7071/api/users/${id}/update-verified`
                : `http://localhost:7071/api/users/${id}`;
        }
        
        try {
            const resposta = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
    
            const data = await resposta.json();

            if (resposta.ok) {
                fecharTodosModais();
                carregarUsuarios();
                exibirToast(estaEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');

                if (fluxoVerificacao === 'editarMeuPerfil' && id === usuarioAtual.id) {
                     usuarioAtual = { ...usuarioAtual, ...dadosUsuarioAtualParaSalvar };
                     sessionStorage.setItem('medControlUser', JSON.stringify(usuarioAtual));
                     document.getElementById('boasVindasAdmin').textContent = `Olá, ${usuarioAtual.nome.split(' ')[0]}!`;
                }
            } else {
                 if (resposta.status === 400) {
                    fecharTodosModais();
                    modalVerificacaoEmail.classList.add('ativo');
                    exibirMensagemNoModal(document.getElementById('mensagemVerificacao'), data.message, true);
                 } else if (resposta.status === 409) {
                    fecharTodosModais();
                    const modal = (fluxoVerificacao === 'editarMeuPerfil') ? modalEditarPerfilAdmin : modalFormularioUsuario;
                    modal.classList.add('ativo');
                    const campoId = data.field === 'email' ? 'emailUsuario' : 'cpfUsuario';
                    const erroId = `erro${campoId.charAt(0).toUpperCase() + campoId.slice(1)}`;
                    document.getElementById(campoId).classList.add('input-error');
                    document.getElementById(erroId).textContent = `Este ${data.field} já está cadastrado.`;
                 } else {
                     alert('Erro ao salvar usuário: ' + (data.message || 'Erro desconhecido'));
                 }
            }
        } catch (e) {
            alert('Erro de conexão ao salvar usuário.');
        }
    }

    async function excluirUsuario(id) {
        try {
            const resp = await fetch(`http://localhost:7071/api/users/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                carregarUsuarios();
                exibirToast('Usuário excluído com sucesso!');
            } else { alert('Erro ao excluir usuário.'); }
        } catch (e) { alert('Erro de conexão.'); }
    }

    async function alterarStatusUsuario(id, novoStatus) {
        try {
            const resp = await fetch(`http://localhost:7071/api/users/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ativo: novoStatus })
            });
            if (resp.ok) {
                carregarUsuarios();
                exibirToast('Status alterado com sucesso!');
            } else { alert('Erro ao alterar status.'); }
        } catch (e) { alert('Erro de conexão.'); }
    }
    
    // --- Lógica "Meu Perfil" Admin ---
    document.getElementById('btnMeuPerfilAdmin').addEventListener('click', () => {
        renderizarPerfilAdmin();
        modalMeuPerfilAdmin.classList.add('ativo');
    });

    const renderizarPerfilAdmin = () => {
        const container = document.getElementById('conteudoMeuPerfilAdmin');
        const dataFormatada = usuarioAtual.data_nascimento ? new Date(usuarioAtual.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR') : 'Não informada';
        container.innerHTML = `
            <div class="space-y-5">
                <div><label class="font-semibold text-gray-600">Nome:</label><span class="ml-2 text-gray-800">${usuarioAtual.nome}</span></div>
                <div><label class="font-semibold text-gray-600">Email:</label><span class="ml-2 text-gray-800">${usuarioAtual.email}</span></div>
                <div><label class="font-semibold text-gray-600">CPF/CNS:</label><span class="ml-2 text-gray-800">${usuarioAtual.cpf_cns}</span></div>
                <div><label class="font-semibold text-gray-600">CEP:</label><span class="ml-2 text-gray-800">${usuarioAtual.cep}</span></div>
                <div><label class="font-semibold text-gray-600">Data de Nascimento:</label><span class="ml-2 text-gray-800">${dataFormatada}</span></div>
            </div>
            <div class="mt-8 pt-6 border-t flex justify-end gap-4">
                 <button id="btnAbrirModalRedefinirSenhaAdmin" class="btn-secundario py-2 px-5 rounded-lg font-semibold">Redefinir Senha</button>
                 <button id="btnAbrirModalEditarAdmin" class="btn-primario py-2 px-5 rounded-lg font-semibold">Editar Perfil</button>
            </div>
        `;
        document.getElementById('btnAbrirModalEditarAdmin').addEventListener('click', abrirModalEdicaoAdmin);
        document.getElementById('btnAbrirModalRedefinirSenhaAdmin').addEventListener('click', () => modalRedefinirSenhaAdmin.classList.add('ativo'));
    };

    const abrirModalEdicaoAdmin = () => {
        fluxoVerificacao = 'editarMeuPerfil';
        fecharTodosModais();
        const form = document.getElementById('formularioEditarPerfilAdmin');
        limparErrosFormulario('formularioEditarPerfilAdmin');
        form.innerHTML = `
            <input type="hidden" id="adminEditEmailOriginal" value="${usuarioAtual.email}">
            <div><label class="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" id="adminEditNome" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.nome}"><p id="erroAdminEditNome" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" id="adminEditEmail" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.email}"><p id="erroAdminEditEmail" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">CPF/CNS</label><input type="text" id="adminEditCpfCns" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.cpf_cns}"><p id="erroAdminEditCpfCns" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">CEP</label><input type="text" id="adminEditCep" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.cep}"><p id="erroAdminEditCep" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">Data de Nascimento</label><input type="date" id="adminEditNascimento" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.data_nascimento || ''}"><p id="erroAdminEditNascimento" class="error-message"></p></div>
            <div class="pt-4 flex gap-4"><button type="button" class="fechar-modal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Salvar Alterações</button></div>
        `;
        form.onsubmit = submeterFormularioAdmin; 
        form.querySelector('.fechar-modal').addEventListener('click', fecharTodosModais);
        modalEditarPerfilAdmin.classList.add('ativo');
    };
    
    const submeterFormularioAdmin = async (e) => {
        e.preventDefault();
        
        // (validação do formulário aqui)

        dadosUsuarioAtualParaSalvar = {
            nome: document.getElementById('adminEditNome').value,
            email: document.getElementById('adminEditEmail').value,
            cpf_cns: document.getElementById('adminEditCpfCns').value,
            cep: document.getElementById('adminEditCep').value,
            data_nascimento: document.getElementById('adminEditNascimento').value,
            perfil: usuarioAtual.perfil 
        };

        const emailOriginal = document.getElementById('adminEditEmailOriginal').value;
        const emailAlterado = dadosUsuarioAtualParaSalvar.email.toLowerCase() !== emailOriginal.toLowerCase();

        if (emailAlterado) {
             try {
                const res = await fetch('http://localhost:7071/api/password-reset/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: dadosUsuarioAtualParaSalvar.email })
                });
                const data = await res.json();
                if (data.exists) {
                    document.getElementById('adminEditEmail').classList.add('input-error');
                    document.getElementById('erroAdminEditEmail').textContent = 'Este e-mail já está cadastrado.';
                    return;
                }
                iniciarFluxoVerificacao();
            } catch (err) {
                alert('Erro de conexão ao verificar e-mail.');
            }
        } else {
            salvarUsuario(true, usuarioAtual.id);
        }
    };
    
    // Inicialização
    carregarUsuarios();
    document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
});

