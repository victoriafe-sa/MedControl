document.addEventListener('DOMContentLoaded', () => {
    // Autenticação e inicialização
    const dadosUsuario = sessionStorage.getItem('medControlUser');
    if (!dadosUsuario) { window.location.href = 'TelaLoginCadastro.html'; return; }
    const usuarioAtual = JSON.parse(dadosUsuario);
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

    // Lógica dos Modais
    const modalFormularioUsuario = document.getElementById('modalFormularioUsuario');
    const modalConfirmarSenha = document.getElementById('modalConfirmarSenha');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    const formularioUsuario = document.getElementById('formularioUsuario');
    const btnEnviar = document.getElementById('btnEnviarFormularioUsuario');

    const fecharTodosModais = () => {
        modalFormularioUsuario.classList.remove('ativo');
        modalConfirmarSenha.classList.remove('ativo');
        modalConfirmacao.classList.remove('ativo');
    };
    document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    document.getElementById('btnCancelarConfirmacao').addEventListener('click', fecharTodosModais);

    const limparErrosFormulario = () => {
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    };

    const abrirModalParaAdicionar = () => {
        formularioUsuario.reset();
        limparErrosFormulario();
        document.getElementById('idUsuario').value = '';
        document.getElementById('tituloModalUsuario').textContent = 'Adicionar Novo Usuário';
        btnEnviar.textContent = 'Adicionar';
        document.getElementById('containerCampoSenha').style.display = 'block';
        document.getElementById('senhaUsuario').required = true;
        modalFormularioUsuario.classList.add('ativo');
    };

    const abrirModalParaEditar = (usuario) => {
        formularioUsuario.reset();
        limparErrosFormulario();
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

    // CRUD de Usuários
    const corpoTabelaUsuarios = document.getElementById('corpoTabelaUsuarios');

    const formatarData = (data) => {
        if (!data) return 'N/A';
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    async function carregarUsuarios() {
        try {
            const resposta = await fetch('http://localhost:7071/api/users');
            const usuarios = await resposta.json();
            corpoTabelaUsuarios.innerHTML = '';
            usuarios.forEach(usuario => {
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

    let dadosUsuarioAtualParaSalvar = null;
    formularioUsuario.addEventListener('submit', (e) => {
        e.preventDefault();
        limparErrosFormulario();
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
            salvarUsuario(true, id);
        } else {
            document.getElementById('formularioConfirmarSenha').reset();
            document.getElementById('erroSenha').textContent = '';
            modalConfirmarSenha.classList.add('ativo');
        }
    });

    document.getElementById('formularioConfirmarSenha').addEventListener('submit', async (e) => {
        e.preventDefault();
        const senhaAdmin = document.getElementById('senhaAdmin').value;
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
            } else if (resposta.status === 409) {
                const erro = await resposta.json();
                destacarErroDeCampoDuplicado(erro.field);
                if (!estaEditando) { // Se for erro de duplicidade no cadastro, feche o modal de senha
                    modalConfirmarSenha.classList.remove('ativo');
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
            } else {
                alert('Erro ao alterar status do usuário.');
            }
        } catch (e) {
            alert('Erro de conexão ao alterar status do usuário.');
        }
    }

    carregarUsuarios();
});

