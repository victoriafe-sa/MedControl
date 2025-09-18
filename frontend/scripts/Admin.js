document.addEventListener('DOMContentLoaded', () => {
    // Autenticação e inicialização
    const dadosUsuario = sessionStorage.getItem('medControlUser');
    if (!dadosUsuario) { window.location.href = 'TelaLoginCadastro.html'; return; }
    let usuarioAtual = JSON.parse(dadosUsuario);
    if (usuarioAtual.perfil !== 'admin') { window.location.href = 'TelaUsuario.html'; return; }
    document.getElementById('boasVindasAdmin').textContent = `Olá, ${usuarioAtual.nome.split(' ')[0]}!`;

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('medControlUser');
        window.location.href = 'Home.html';
    });

    // Navegação por Abas
    const abas = document.querySelectorAll('.btn-aba');
    abas.forEach(aba => {
        aba.addEventListener('click', () => {
            abas.forEach(a => a.classList.remove('ativo'));
            document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativo'));
            aba.classList.add('ativo');
            document.getElementById(`conteudo-${aba.dataset.aba}`).classList.add('ativo');
        });
    });

    // Lógica dos Modais Genéricos
    const modalFormularioUsuario = document.getElementById('modalFormularioUsuario');
    const modalConfirmarSenha = document.getElementById('modalConfirmarSenha');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    const formularioUsuario = document.getElementById('formularioUsuario');
    const btnEnviar = document.getElementById('btnEnviarFormularioUsuario');

    const fecharTodosModais = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('ativo'));
    };
    document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    document.getElementById('btnCancelarConfirmacao').addEventListener('click', fecharTodosModais);

    const limparErrosFormulario = (formId) => {
        document.querySelectorAll(`#${formId} .input-error`).forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll(`#${formId} .error-message`).forEach(el => el.textContent = '');
    };
    
    // Utilitário para exibir Toast de sucesso
    const exibirToast = (mensagem) => {
        const toast = document.createElement('div');
        toast.className = `fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg bg-green-500 z-50`;
        toast.textContent = mensagem; 
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    // --- LÓGICA DE GERENCIAMENTO DE USUÁRIOS (TABELA) ---
    const abrirModalParaAdicionar = () => {
        formularioUsuario.reset();
        limparErrosFormulario('formularioUsuario');
        document.getElementById('idUsuario').value = '';
        document.getElementById('tituloModalUsuario').textContent = 'Adicionar Novo Usuário';
        btnEnviar.textContent = 'Adicionar';
        document.getElementById('containerCampoSenha').style.display = 'block';
        document.getElementById('senhaUsuario').required = true;
        modalFormularioUsuario.classList.add('ativo');
    };

    const abrirModalParaEditar = (usuario) => {
        formularioUsuario.reset();
        limparErrosFormulario('formularioUsuario');
        document.getElementById('idUsuario').value = usuario.id;
        document.getElementById('nomeUsuario').value = usuario.nome;
        document.getElementById('emailUsuario').value = usuario.email;
        document.getElementById('cpfUsuario').value = usuario.cpf_cns;
        document.getElementById('cepUsuario').value = usuario.cep;
        document.getElementById('nascimentoUsuario').value = usuario.data_nascimento ? new Date(usuario.data_nascimento).toISOString().split('T')[0] : '';
        document.getElementById('perfilUsuario').value = usuario.perfil;
        document.getElementById('tituloModalUsuario').textContent = 'Editar Usuário';
        btnEnviar.textContent = 'Salvar';
        document.getElementById('containerCampoSenha').style.display = 'none';
        document.getElementById('senhaUsuario').required = false;
        modalFormularioUsuario.classList.add('ativo');
    };

    document.getElementById('abrirModalAdicionarUsuario').addEventListener('click', abrirModalParaAdicionar);

    const corpoTabelaUsuarios = document.getElementById('corpoTabelaUsuarios');
    const formatarData = (data) => {
        if (!data) return 'N/A';
        return new Date(data + 'T00:00:00-03:00').toLocaleDateString('pt-BR');
    }

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
                    <td class="p-4">${formatarData(usuario.data_nascimento)}</td>
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
            const usuario = JSON.parse(target.dataset.usuario);
            abrirModalParaEditar(usuario);
        }
        if (target.classList.contains('btn-excluir')) {
            const id = target.dataset.id;
            abrirConfirmacao('Excluir Usuário', 'Tem certeza que deseja excluir este usuário? Esta ação é permanente.', () => excluirUsuario(id));
        }
        if (target.classList.contains('btn-status')) {
            const id = target.dataset.id;
            const statusAtual = target.dataset.statusAtual === 'true';
            const novoStatus = !statusAtual;
            const acao = novoStatus ? 'ativar' : 'desativar';
            abrirConfirmacao(`Confirmar ${acao}`, `Tem certeza que deseja ${acao} este usuário?`, () => alterarStatusUsuario(id, novoStatus));
        }
    });

    function abrirConfirmacao(titulo, mensagem, callback) {
        document.getElementById('tituloConfirmacao').textContent = titulo;
        document.getElementById('mensagemConfirmacao').textContent = mensagem;
        document.getElementById('btnConfirmarAcao').onclick = () => {
            callback();
            fecharTodosModais();
        };
        modalConfirmacao.classList.add('ativo');
    }
    
    const isMaisDe18 = (dataNasc) => {
        if (!dataNasc) return true;
        const hoje = new Date();
        const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
        const dataNascimento = new Date(dataNasc);
        const dataNascimentoUTC = new Date(dataNascimento.getUTCFullYear(), dataNascimento.getUTCMonth(), dataNascimento.getUTCDate());
        return dataNascimentoUTC <= dezoitoAnosAtras;
    }

    function validarFormularioUsuario(formId, isEditing) {
        limparErrosFormulario(formId);
        let isValid = true;
        
        const fieldsToValidate = [
            { id: 'nomeUsuario', errorId: 'erroNomeUsuario', message: 'O nome é obrigatório.' },
            { id: 'emailUsuario', errorId: 'erroEmailUsuario', message: 'O e-mail é obrigatório.' },
            { id: 'cpfUsuario', errorId: 'erroCpfUsuario', message: 'O CPF/CNS é obrigatório.' },
            { id: 'cepUsuario', errorId: 'erroCepUsuario', message: 'O CEP é obrigatório.' },
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

        if (!isEditing) {
            const senhaInput = document.getElementById('senhaUsuario');
            const erroSenhaEl = document.getElementById('erroSenhaUsuario');
            if (!senhaInput.value.trim()) {
                senhaInput.classList.add('input-error');
                erroSenhaEl.textContent = 'A senha é obrigatória para novos usuários.';
                isValid = false;
            } else if (senhaInput.value.length < 6) {
                senhaInput.classList.add('input-error');
                erroSenhaEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
                isValid = false;
            }
        }
        
        const nascimentoInput = document.getElementById('nascimentoUsuario');
        const erroNascimentoEl = document.getElementById('erroNascimentoUsuario');
        if (nascimentoInput.value && !isMaisDe18(nascimentoInput.value)) {
            nascimentoInput.classList.add('input-error');
            erroNascimentoEl.textContent = 'O usuário deve ter 18 anos ou mais.';
            isValid = false;
        }
        return isValid;
    }

    let dadosUsuarioAtualParaSalvar = null;
    formularioUsuario.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('idUsuario').value;
        const estaEditando = !!id;

        dadosUsuarioAtualParaSalvar = {
            nome: document.getElementById('nomeUsuario').value,
            email: document.getElementById('emailUsuario').value,
            cpf_cns: document.getElementById('cpfUsuario').value,
            cep: document.getElementById('cepUsuario').value,
            data_nascimento: document.getElementById('nascimentoUsuario').value,
            perfil: document.getElementById('perfilUsuario').value
        };
        if (!estaEditando) {
            dadosUsuarioAtualParaSalvar.senha = document.getElementById('senhaUsuario').value;
        }

        if (estaEditando) {
             if (validarFormularioUsuario('formularioUsuario', true)) {
                salvarUsuario(true, id);
             }
        } else {
            document.getElementById('formularioConfirmarSenha').reset();
            document.getElementById('erroSenha').textContent = '';
            modalConfirmarSenha.classList.add('ativo');
        }
    });

    document.getElementById('formularioConfirmarSenha').addEventListener('submit', async (e) => {
        e.preventDefault();
        const senhaAdmin = document.getElementById('senhaAdmin').value;
        if (!senhaAdmin) {
            document.getElementById('erroSenha').textContent = 'Por favor, insira sua senha.';
            return;
        }
        const erroSenha = document.getElementById('erroSenha');
        erroSenha.textContent = '';

        try {
            const respostaVerificacao = await fetch('http://localhost:7071/api/admin/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: usuarioAtual.id, password: senhaAdmin })
            });
            if (!respostaVerificacao.ok) {
                erroSenha.textContent = 'Senha incorreta. Tente novamente.';
                return;
            }
            
            if (!validarFormularioUsuario('formularioUsuario', false)) {
                fecharTodosModais(); 
                modalFormularioUsuario.classList.add('ativo');
                return;
            }
            salvarUsuario(false);

        } catch (err) {
            erroSenha.textContent = "Erro de conexão. Tente novamente.";
        }
    });

    function destacarErroDeCampoDuplicado(campo) {
        let elementoInput, elementoErro;
        if (campo === 'email') {
            elementoInput = document.getElementById('emailUsuario');
            elementoErro = document.getElementById('erroEmailUsuario');
        } else if (campo === 'cpf_cns') {
            elementoInput = document.getElementById('cpfUsuario');
            elementoErro = document.getElementById('erroCpfUsuario');
        }

        if (elementoInput && elementoErro) {
            elementoInput.classList.add('input-error');
            elementoErro.textContent = `Este ${campo === 'email' ? 'e-mail' : 'CPF/CNS'} já está cadastrado.`;
        }
    }

    async function salvarUsuario(estaEditando, id) {
        const url = estaEditando ? `http://localhost:7071/api/users/${id}` : 'http://localhost:7071/api/users';
        const metodo = estaEditando ? 'PUT' : 'POST';

        try {
            const resposta = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosUsuarioAtualParaSalvar)
            });

            if (resposta.ok) {
                fecharTodosModais();
                carregarUsuarios();
                exibirToast(estaEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
            } else if (resposta.status === 409) {
                const erro = await resposta.json();
                destacarErroDeCampoDuplicado(erro.field);
                if (!estaEditando) { 
                    modalConfirmarSenha.classList.remove('ativo');
                    modalFormularioUsuario.classList.add('ativo');
                }
            } else {
                alert('Erro ao salvar usuário.');
            }
        } catch (e) {
            alert('Erro de conexão ao salvar usuário.');
        }
    }

    async function excluirUsuario(id) {
        try {
            const resposta = await fetch(`http://localhost:7071/api/users/${id}`, { method: 'DELETE' });
            if (resposta.ok) {
                carregarUsuarios();
                exibirToast('Usuário excluído com sucesso!');
            } else {
                alert('Erro ao excluir usuário.');
            }
        } catch (e) {
            alert('Erro de conexão ao excluir usuário.');
        }
    }

    async function alterarStatusUsuario(id, novoStatus) {
        try {
            const resposta = await fetch(`http://localhost:7071/api/users/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ativo: novoStatus })
            });
            if (resposta.ok) {
                carregarUsuarios();
                exibirToast('Status alterado com sucesso!');
            } else {
                alert('Erro ao alterar status do usuário.');
            }
        } catch (e) {
            alert('Erro de conexão ao alterar status do usuário.');
        }
    }

    // --- LÓGICA DE "MEU PERFIL" DO ADMIN ---
    const modalMeuPerfilAdmin = document.getElementById('modalMeuPerfilAdmin');
    const modalEditarPerfilAdmin = document.getElementById('modalEditarPerfilAdmin');
    const modalRedefinirSenhaAdmin = document.getElementById('modalRedefinirSenhaAdmin');
    
    document.getElementById('btnMeuPerfilAdmin').addEventListener('click', () => {
        renderizarPerfilAdmin();
        modalMeuPerfilAdmin.classList.add('ativo');
    });

    const renderizarPerfilAdmin = () => {
        const container = document.getElementById('conteudoMeuPerfilAdmin');
        const dataFormatada = usuarioAtual.data_nascimento ? formatarData(usuarioAtual.data_nascimento) : 'Não informada';
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
        document.getElementById('btnAbrirModalRedefinirSenhaAdmin').addEventListener('click', abrirModalRedefinirSenhaAdmin);
    };

    const abrirModalEdicaoAdmin = () => {
        fecharTodosModais();
        const form = document.getElementById('formularioEditarPerfilAdmin');
        form.innerHTML = `
            <input type="hidden" id="adminEditId" value="${usuarioAtual.id}">
            <div><label class="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" id="adminEditNome" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.nome}"><p id="erroAdminEditNome" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" id="adminEditEmail" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.email}"><p id="erroAdminEditEmail" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">CPF/CNS</label><input type="text" id="adminEditCpfCns" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.cpf_cns}"><p id="erroAdminEditCpfCns" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">CEP</label><input type="text" id="adminEditCep" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.cep}"><p id="erroAdminEditCep" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">Data de Nascimento</label><input type="date" id="adminEditNascimento" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.data_nascimento || ''}"><p id="erroAdminEditNascimento" class="error-message"></p></div>
            <div class="pt-4 flex gap-4"><button type="button" class="fechar-modal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Salvar Alterações</button></div>
        `;
        form.onsubmit = salvarPerfilAdmin; 
        form.querySelector('.fechar-modal').addEventListener('click', fecharTodosModais);
        modalEditarPerfilAdmin.classList.add('ativo');
    };
    
    function validarFormularioAdmin() {
        limparErrosFormulario('formularioEditarPerfilAdmin');
        let isValid = true;
        const fields = [
            { id: 'adminEditNome', errorId: 'erroAdminEditNome', message: 'O nome é obrigatório.' },
            { id: 'adminEditEmail', errorId: 'erroAdminEditEmail', message: 'O e-mail é obrigatório.' },
            { id: 'adminEditCpfCns', errorId: 'erroAdminEditCpfCns', message: 'O CPF/CNS é obrigatório.' },
            { id: 'adminEditCep', errorId: 'erroAdminEditCep', message: 'O CEP é obrigatório.' }
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
        
        const nascimentoInput = document.getElementById('adminEditNascimento');
        const erroNascimentoEl = document.getElementById('erroAdminEditNascimento');
        if (nascimentoInput.value && !isMaisDe18(nascimentoInput.value)) {
            nascimentoInput.classList.add('input-error');
            erroNascimentoEl.textContent = 'Você deve ter 18 anos ou mais.';
            isValid = false;
        }
        return isValid;
    }

    const salvarPerfilAdmin = async (e) => {
        e.preventDefault();
        
        if (!validarFormularioAdmin()) {
            return;
        }

        const dadosAtualizados = {
            nome: document.getElementById('adminEditNome').value,
            email: document.getElementById('adminEditEmail').value,
            cpf_cns: document.getElementById('adminEditCpfCns').value,
            cep: document.getElementById('adminEditCep').value,
            data_nascimento: document.getElementById('adminEditNascimento').value,
        };
        try {
            const response = await fetch(`http://localhost:7071/api/users/${usuarioAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados)
            });
            if (response.ok) {
                const userClone = JSON.parse(JSON.stringify(usuarioAtual));
                Object.assign(userClone, dadosAtualizados);
                sessionStorage.setItem('medControlUser', JSON.stringify(userClone));
                usuarioAtual = userClone;
                
                fecharTodosModais();
                exibirToast('Perfil atualizado com sucesso!');
                document.getElementById('boasVindasAdmin').textContent = `Olá, ${usuarioAtual.nome.split(' ')[0]}!`;
            } else {
                 const erro = await response.json();
                 if (response.status === 409 && erro.field) {
                    if (erro.field === 'email') {
                        document.getElementById('adminEditEmail').classList.add('input-error');
                        document.getElementById('erroAdminEditEmail').textContent = 'Este e-mail já está cadastrado.';
                    } else if (erro.field === 'cpf_cns') {
                        document.getElementById('adminEditCpfCns').classList.add('input-error');
                        document.getElementById('erroAdminEditCpfCns').textContent = 'Este CPF/CNS já está cadastrado.';
                    }
                 } else {
                    alert(`Erro ao atualizar: ${erro.message || 'Ocorreu um erro desconhecido.'}`);
                 }
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil do admin:', error);
            alert(`Erro de conexão ao tentar atualizar o perfil: ${error.message}`);
        }
    };

    const abrirModalRedefinirSenhaAdmin = () => {
        fecharTodosModais();
        const form = document.getElementById('formularioRedefinirSenhaAdmin');
        form.innerHTML = `
             <div id="passo1RedefinirAdmin">
                <div><label class="block text-sm font-medium text-gray-700">Nova Senha</label><input type="password" id="redefinirNovaSenhaAdmin" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md"><p id="erroRedefinirNovaSenhaAdmin" class="error-message"></p></div>
                <div><label class="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label><input type="password" id="redefinirConfirmarNovaSenhaAdmin" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md"><p id="erroRedefinirConfirmarNovaSenhaAdmin" class="error-message"></p></div>
             </div>
             <div id="passo2RedefinirAdmin" style="display: none;">
                <p class="text-center text-gray-600 mb-4">Para confirmar, digite sua senha atual.</p>
                <div><label class="block text-sm font-medium text-gray-700">Senha Atual</label><input type="password" id="redefinirSenhaAtualAdmin" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md"><p id="erroRedefinirSenhaAtualAdmin" class="error-message"></p></div>
             </div>
             <div class="pt-4 flex gap-4"><button type="button" class="fechar-modal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Avançar</button></div>
        `;
        form.onsubmit = salvarSenhaAdmin;
        form.querySelector('.fechar-modal').addEventListener('click', fecharTodosModais);
        modalRedefinirSenhaAdmin.classList.add('ativo');
    };

    const salvarSenhaAdmin = async (e) => {
         e.preventDefault();
        const form = e.target;
        const estaNoPasso1 = document.getElementById('passo1RedefinirAdmin').style.display !== 'none';

        if (estaNoPasso1) {
            const novaSenha = document.getElementById('redefinirNovaSenhaAdmin');
            const confirmarSenha = document.getElementById('redefinirConfirmarNovaSenhaAdmin');
            const erroNovaSenha = document.getElementById('erroRedefinirNovaSenhaAdmin');
            const erroConfirmarSenha = document.getElementById('erroRedefinirConfirmarNovaSenhaAdmin');
            let valido = true;
            [novaSenha, confirmarSenha, erroNovaSenha, erroConfirmarSenha].forEach(el => {
                el.textContent = ''; if(el.nodeName === 'INPUT') el.classList.remove('input-error');
            });
            if (novaSenha.value.length < 6) { erroNovaSenha.textContent = 'A senha deve ter no mínimo 6 caracteres.'; novaSenha.classList.add('input-error'); valido = false; }
            if (novaSenha.value !== confirmarSenha.value) { erroConfirmarSenha.textContent = 'As senhas não coincidem.'; confirmarSenha.classList.add('input-error'); valido = false; }
            if (valido) {
                document.getElementById('passo1RedefinirAdmin').style.display = 'none';
                document.getElementById('passo2RedefinirAdmin').style.display = 'block';
                form.querySelector('button[type="submit"]').textContent = 'Salvar Senha';
            }
        } else {
            const senhaAtual = document.getElementById('redefinirSenhaAtualAdmin');
            const erroSenhaAtual = document.getElementById('erroRedefinirSenhaAtualAdmin');
            const novaSenha = document.getElementById('redefinirNovaSenhaAdmin').value;
            if (!senhaAtual.value) { erroSenhaAtual.textContent = 'A senha atual é obrigatória.'; senhaAtual.classList.add('input-error'); return; }
            try {
                const response = await fetch(`http://localhost:7071/api/users/${usuarioAtual.id}/redefine-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ senhaAtual: senhaAtual.value, novaSenha: novaSenha })
                });
                const data = await response.json();
                if (response.ok) {
                    fecharTodosModais();
                    exibirToast('Senha alterada com sucesso!');
                } else {
                    erroSenhaAtual.textContent = data.message;
                    senhaAtual.classList.add('input-error');
                }
            } catch (error) {
                erroSenhaAtual.textContent = 'Erro de conexão com o servidor.';
            }
        }
    };
    
    // --- INICIALIZAÇÃO ---
    carregarUsuarios();
});

