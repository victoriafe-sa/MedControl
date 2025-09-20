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
    const modalConfirmarSenhaAdmin = document.getElementById('modalConfirmarSenha');
    const formularioUsuario = document.getElementById('formularioUsuario');
    
    // --- Variáveis de Estado ---
    let dadosUsuarioAtualParaSalvar = null;
    let timerInterval = null;
    let fluxoVerificacao = 'adicionar'; // 'adicionar', 'editarTabela', 'editarMeuPerfil'
    let usuarioEditadoOriginal = null;
    let novaSenhaTemporaria = null;
    let acaoAposConfirmarSenha = null;

    // --- Funções Utilitárias ---
    const fecharTodosModais = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('ativo'));
        clearInterval(timerInterval);
    };

    const limparErrosFormulario = (formId) => {
        const form = document.getElementById(formId);
        if(!form) return;
        form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
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

    // --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO DE CEP ---
    const formatarCep = (inputElement) => {
        let cep = inputElement.value.replace(/\D/g, '');
        cep = cep.substring(0, 8);
        if (cep.length > 5) {
            cep = cep.slice(0, 5) + '-' + cep.slice(5);
        }
        inputElement.value = cep;
    };

    const validarCep = async (inputElement, validationElement) => {
        const cep = inputElement.value.replace(/\D/g, ''); 

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
        // Limpa validação de CEP ao abrir o modal
        const cepInput = document.getElementById('cepUsuario');
        cepInput.classList.remove('input-success', 'input-error');
        document.getElementById('validacaoCepUsuario').textContent = '';

        document.getElementById('idUsuario').value = '';
        document.getElementById('tituloModalUsuario').textContent = 'Adicionar Novo Usuário';
        document.getElementById('containerCampoSenha').style.display = 'block';
        modalFormularioUsuario.classList.add('ativo');
    };

    const abrirModalParaEditar = (usuario) => {
        fluxoVerificacao = 'editarTabela';
        usuarioEditadoOriginal = { ...usuario }; 
        formularioUsuario.reset();
        limparErrosFormulario('formularioUsuario');
        
        // Limpa validação de CEP ao abrir o modal
        const cepInput = document.getElementById('cepUsuario');
        cepInput.classList.remove('input-success', 'input-error');
        document.getElementById('validacaoCepUsuario').textContent = '';

        document.getElementById('idUsuario').value = usuario.id;
        document.getElementById('emailOriginal').value = usuario.email;
        document.getElementById('nomeUsuario').value = usuario.nome;
        document.getElementById('emailUsuario').value = usuario.email;
        document.getElementById('cpfUsuario').value = usuario.cpf_cns;
        document.getElementById('cepUsuario').value = usuario.cep;
        document.getElementById('nascimentoUsuario').value = usuario.data_nascimento;
        document.getElementById('perfilUsuario').value = usuario.perfil;
        document.getElementById('tituloModalUsuario').textContent = 'Editar Usuário';
        document.getElementById('containerCampoSenha').style.display = 'none';
        modalFormularioUsuario.classList.add('ativo');
    };

    document.getElementById('abrirModalAdicionarUsuario').addEventListener('click', abrirModalParaAdicionar);
    
    const cepUsuarioInput = document.getElementById('cepUsuario');
    cepUsuarioInput.addEventListener('input', () => formatarCep(cepUsuarioInput));
    cepUsuarioInput.addEventListener('blur', () => validarCep(cepUsuarioInput, document.getElementById('validacaoCepUsuario')));

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
            acaoAposConfirmarSenha = () => excluirUsuario(id);
            document.getElementById('formularioConfirmarSenha').reset();
            limparErrosFormulario('formularioConfirmarSenha');
            modalConfirmarSenhaAdmin.classList.add('ativo');
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

    function validarFormulario(formPrefix, isEditing) {
        const formElementId = (formPrefix === 'usuario') ? 'formularioUsuario' : 'formularioEditarPerfilAdmin';
        limparErrosFormulario(formElementId);
        
        let isValid = true;
        
        const fieldMappings = {
            'usuario': {
                'Nome': { input: 'nomeUsuario', error: 'erroNomeUsuario' },
                'Email': { input: 'emailUsuario', error: 'erroEmailUsuario' },
                'Cpf/Cns': { input: 'cpfUsuario', error: 'erroCpfUsuario' },
                'Cep': { input: 'cepUsuario', error: 'erroCepUsuario' },
                'Nascimento': { input: 'nascimentoUsuario', error: 'erroNascimentoUsuario' },
                'Senha': { input: 'senhaUsuario', error: 'erroSenhaUsuario' }
            },
            'adminEdit': {
                'Nome': { input: 'adminEditNome', error: 'erroadminEditNome' },
                'Email': { input: 'adminEditEmail', error: 'erroadminEditEmail' },
                'Cpf/Cns': { input: 'adminEditCpfCns', error: 'erroadminEditCpfCns' },
                'Cep': { input: 'adminEditCep', error: 'erroadminEditCep' },
                'Nascimento': { input: 'adminEditNascimento', error: 'erroadminEditNascimento' }
            }
        };

        const currentFields = fieldMappings[formPrefix];

        for (const fieldName in currentFields) {
            if (isEditing && fieldName === 'Senha') continue;

            const ids = currentFields[fieldName];
            const input = document.getElementById(ids.input);
            const errorEl = document.getElementById(ids.error);
            
            if (input && !input.value.trim()) {
                input.classList.add('input-error');
                errorEl.textContent = `O campo ${fieldName.toLowerCase()} é obrigatório.`;
                isValid = false;
            }
        }
        
        const emailInput = document.getElementById(currentFields.Email.input);
        if (emailInput && emailInput.value.trim() && !isValidEmail(emailInput.value.trim())) {
            emailInput.classList.add('input-error');
            document.getElementById(currentFields.Email.error).textContent = 'Formato de e-mail inválido.';
            isValid = false;
        }

        const nascInput = document.getElementById(currentFields.Nascimento.input);
        if (nascInput && nascInput.value && !isMaisDe18(nascInput.value)) {
            nascInput.classList.add('input-error');
            document.getElementById(currentFields.Nascimento.error).textContent = 'O usuário deve ter 18 anos ou mais.';
            isValid = false;
        }

        if (!isEditing) {
            const senhaInput = document.getElementById(currentFields.Senha.input);
            if (senhaInput && senhaInput.value.trim().length < 6) {
                senhaInput.classList.add('input-error');
                document.getElementById(currentFields.Senha.error).textContent = 'A senha deve ter no mínimo 6 caracteres.';
                isValid = false;
            }
        }
        
        // MODIFICADO: Verifica se o CEP foi validado com sucesso
        const cepInputId = currentFields.Cep.input;
        const cepErrorId = currentFields.Cep.error;
        const cepInput = document.getElementById(cepInputId);

        if (cepInput && cepInput.value.trim() && !cepInput.classList.contains('input-success')) {
            cepInput.classList.add('input-error');
            document.getElementById(cepErrorId).textContent = 'Por favor, insira um CEP válido para continuar.';
            isValid = false;
        }

        return isValid;
    }

    formularioUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const estaEditando = !!document.getElementById('idUsuario').value;
        if (!validarFormulario('usuario', estaEditando)) return;

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
        
        verificarEContinuarSalvar(estaEditando, document.getElementById('idUsuario').value);
    });
    
    async function verificarEContinuarSalvar(estaEditando, idUsuario) {
        try {
            const res = await fetch('http://localhost:7071/api/usuarios/verificar-existencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: dadosUsuarioAtualParaSalvar.email,
                    cpf_cns: dadosUsuarioAtualParaSalvar.cpf_cns,
                    id: idUsuario || null
                })
            });
            const data = await res.json();
            let hasError = false;
            const formPrefix = fluxoVerificacao === 'editarMeuPerfil' ? 'adminEdit' : 'usuario';
            
            const fieldMappings = {
                email: {
                    input: formPrefix === 'usuario' ? 'emailUsuario' : 'adminEditEmail',
                    error: formPrefix === 'usuario' ? 'erroEmailUsuario' : 'erroadminEditEmail'
                },
                cpf_cns: {
                    input: formPrefix === 'usuario' ? 'cpfUsuario' : 'adminEditCpfCns',
                    error: formPrefix === 'usuario' ? 'erroCpfUsuario' : 'erroadminEditCpfCns'
                }
            }

            // Limpa erros antigos de duplicidade
            document.getElementById(fieldMappings.email.input).classList.remove('input-error');
            document.getElementById(fieldMappings.email.error).textContent = '';
            document.getElementById(fieldMappings.cpf_cns.input).classList.remove('input-error');
            document.getElementById(fieldMappings.cpf_cns.error).textContent = '';


            if (data.email) {
                document.getElementById(fieldMappings.email.input).classList.add('input-error');
                document.getElementById(fieldMappings.email.error).textContent = 'Este e-mail já está cadastrado.';
                hasError = true;
            }
            if (data.cpf_cns) {
                document.getElementById(fieldMappings.cpf_cns.input).classList.add('input-error');
                document.getElementById(fieldMappings.cpf_cns.error).textContent = 'Este CPF/CNS já está cadastrado.';
                hasError = true;
            }
            if (hasError) return;

            const emailOriginal = (fluxoVerificacao === 'editarMeuPerfil') 
                ? document.getElementById('adminEditEmailOriginal').value
                : document.getElementById('emailOriginal').value;

            const emailAlterado = estaEditando && dadosUsuarioAtualParaSalvar.email.toLowerCase() !== emailOriginal.toLowerCase();

            if (!estaEditando || emailAlterado) {
                iniciarFluxoVerificacao();
            } else {
                acaoAposConfirmarSenha = () => salvarUsuario(true, idUsuario, false);
                document.getElementById('formularioConfirmarSenha').reset();
                limparErrosFormulario('formularioConfirmarSenha');
                modalConfirmarSenhaAdmin.classList.add('ativo');
            }
        } catch (err) {
            console.error("Erro ao verificar dados:", err);
            // Em vez de alert, pode-se mostrar um erro genérico no modal
            const formPrefix = fluxoVerificacao === 'editarMeuPerfil' ? 'adminEdit' : 'usuario';
            const errorElementId = (formPrefix === 'usuario') ? 'erroNomeUsuario' : 'erroadminEditNome';
            document.getElementById(errorElementId).textContent = "Erro de conexão ao verificar dados.";
        }
    }


    async function iniciarFluxoVerificacao() {
        fecharTodosModais();
        modalVerificacaoEmail.classList.add('ativo');
        document.getElementById('emailParaVerificar').textContent = dadosUsuarioAtualParaSalvar.email;
        const msgEl = document.getElementById('mensagemVerificacao');
        exibirMensagemNoModal(msgEl, 'Enviando código...', false);
        
        const motivo = fluxoVerificacao === 'adicionar' ? 'cadastro' : 'alteracao';

        try {
            const res = await fetch('http://localhost:7071/api/usuarios/enviar-codigo-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: dadosUsuarioAtualParaSalvar.email, motivo: motivo })
            });
            if (res.ok) {
                msgEl.style.display = 'none';
                iniciarTimer();
            } else {
                const dataErro = await res.json();
                const mensagem = dataErro.message || 'Falha ao enviar o código de verificação.';
                exibirMensagemNoModal(msgEl, mensagem, true);
            }
        } catch (e) {
            exibirMensagemNoModal(msgEl, 'Erro de conexão com o servidor.', true);
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
        if (!codigo || codigo.length < 6) {
            exibirMensagemNoModal(document.getElementById('mensagemVerificacao'), 'Código inválido.', true);
            return;
        }
        dadosUsuarioAtualParaSalvar.codigoVerificacao = codigo;
        
        const id = (fluxoVerificacao === 'editarTabela') 
            ? usuarioEditadoOriginal.id 
            : (fluxoVerificacao === 'editarMeuPerfil' ? usuarioAtual.id : null);
        
        const estaEditando = fluxoVerificacao !== 'adicionar';

        acaoAposConfirmarSenha = () => salvarUsuario(estaEditando, id, true);
        fecharTodosModais();
        document.getElementById('formularioConfirmarSenha').reset();
        limparErrosFormulario('formularioConfirmarSenha');
        modalConfirmarSenhaAdmin.classList.add('ativo');
    });

    document.getElementById('formularioConfirmarSenha').addEventListener('submit', async (e) => {
        e.preventDefault();
        const senhaAdminInput = document.getElementById('senhaAdmin');
        const erroSenhaEl = document.getElementById('erroSenha');
        erroSenhaEl.textContent = '';

        try {
            const res = await fetch('http://localhost:7071/api/admin/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: usuarioAtual.id, password: senhaAdminInput.value })
            });

            if (res.ok) {
                if (typeof acaoAposConfirmarSenha === 'function') {
                    acaoAposConfirmarSenha();
                    acaoAposConfirmarSenha = null; // Reseta a ação
                }
            } else {
                const data = await res.json();
                erroSenhaEl.textContent = data.message || 'Senha incorreta.';
            }
        } catch(err) {
            erroSenhaEl.textContent = 'Erro de conexão.';
        }
    });


    async function salvarUsuario(estaEditando, id, comVerificacao) {
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
                 if (resposta.status === 400 && comVerificacao) { // Código de verificação errado
                    fecharTodosModais();
                    modalVerificacaoEmail.classList.add('ativo');
                    exibirMensagemNoModal(document.getElementById('mensagemVerificacao'), data.message, true);
                 } else { // Outros erros (ex: duplicidade no backend)
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
                fecharTodosModais();
                carregarUsuarios();
                exibirToast('Usuário excluído com sucesso!');
            } else { 
                alert('Erro ao excluir usuário.'); 
            }
        } catch (e) { 
            alert('Erro de conexão.'); 
        }
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
        document.getElementById('btnAbrirModalRedefinirSenhaAdmin').addEventListener('click', abrirModalRedefinirSenhaAdmin);
    };

    const abrirModalEdicaoAdmin = () => {
        fluxoVerificacao = 'editarMeuPerfil';
        fecharTodosModais();
        const form = document.getElementById('formularioEditarPerfilAdmin');
        limparErrosFormulario('formularioEditarPerfilAdmin');
        form.innerHTML = `
            <input type="hidden" id="adminEditEmailOriginal" value="${usuarioAtual.email}">
            <div><label class="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" id="adminEditNome" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.nome}"><p id="erroadminEditNome" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" id="adminEditEmail" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.email}"><p id="erroadminEditEmail" class="error-message"></p></div>
            <div><label class="block text-sm font-medium text-gray-700">CPF/CNS</label><input type="text" id="adminEditCpfCns" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.cpf_cns}"><p id="erroadminEditCpfCns" class="error-message"></p></div>
            <div>
                <label class="block text-sm font-medium text-gray-700">CEP</label>
                <input type="text" id="adminEditCep" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.cep}" maxlength="9">
                <p id="validacaoAdminEditCep" class="validation-message"></p>
                <p id="erroadminEditCep" class="error-message"></p>
            </div>
            <div><label class="block text-sm font-medium text-gray-700">Data de Nascimento</label><input type="date" id="adminEditNascimento" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAtual.data_nascimento || ''}"><p id="erroadminEditNascimento" class="error-message"></p></div>
            <div class="pt-4 flex gap-4"><button type="button" class="btnFecharModal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Salvar Alterações</button></div>
        `;
        form.onsubmit = submeterFormularioAdmin; 
        form.querySelector('.btnFecharModal').addEventListener('click', fecharTodosModais);
        
        const cepInput = form.querySelector('#adminEditCep');
        const validationElement = form.querySelector('#validacaoAdminEditCep');
        cepInput.addEventListener('input', () => formatarCep(cepInput));
        cepInput.addEventListener('blur', () => validarCep(cepInput, validationElement));
        
        modalEditarPerfilAdmin.classList.add('ativo');
    };
    
    const submeterFormularioAdmin = async (e) => {
        e.preventDefault();
        if (!validarFormulario('adminEdit', true)) return;

        dadosUsuarioAtualParaSalvar = {
            nome: document.getElementById('adminEditNome').value,
            email: document.getElementById('adminEditEmail').value,
            cpf_cns: document.getElementById('adminEditCpfCns').value,
            cep: document.getElementById('adminEditCep').value,
            data_nascimento: document.getElementById('adminEditNascimento').value,
            perfil: usuarioAtual.perfil 
        };
        
        verificarEContinuarSalvar(true, usuarioAtual.id);
    };

    // --- Lógica de Redefinir Senha do Admin ---
    const abrirModalRedefinirSenhaAdmin = () => {
        fecharTodosModais();
        const form = document.getElementById('formularioRedefinirSenhaAdmin');
        limparErrosFormulario('formularioRedefinirSenhaAdmin');
        form.innerHTML = `
            <div id="adminPasso1">
                <div><label class="block text-sm font-medium text-gray-700">Nova Senha</label><input type="password" id="adminNovaSenha" class="mt-1 block w-full"><p id="erroAdminNovaSenha" class="error-message"></p></div>
                <div><label class="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label><input type="password" id="adminConfirmarSenha" class="mt-1 block w-full"><p id="erroAdminConfirmarSenha" class="error-message"></p></div>
            </div>
            <div id="adminPasso2" style="display: none;">
                <p class="text-center text-gray-600 mb-4">Para confirmar, digite sua senha atual.</p>
                <div><label class="block text-sm font-medium text-gray-700">Senha Atual</label><input type="password" id="adminSenhaAtual" class="mt-1 block w-full"><p id="erroAdminSenhaAtual" class="error-message"></p></div>
            </div>
            <div class="pt-4 flex gap-4"><button type="button" class="btnFecharModal w-full bg-gray-200 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Avançar</button></div>
        `;
        form.onsubmit = submeterRedefinicaoSenhaAdmin;
        form.querySelector('.btnFecharModal').addEventListener('click', fecharTodosModais);
        modalRedefinirSenhaAdmin.classList.add('ativo');
    };
    
    const submeterRedefinicaoSenhaAdmin = async (e) => {
        e.preventDefault();
        const passo1Visivel = document.getElementById('adminPasso1').style.display !== 'none';
        
        if (passo1Visivel) {
            let isValid = true;
            const novaSenhaInput = document.getElementById('adminNovaSenha');
            const confirmarSenhaInput = document.getElementById('adminConfirmarSenha');
            [novaSenhaInput, confirmarSenhaInput].forEach(i => i.classList.remove('input-error'));
            [document.getElementById('erroAdminNovaSenha'), document.getElementById('erroAdminConfirmarSenha')].forEach(e => e.textContent = '');

            if (!novaSenhaInput.value || novaSenhaInput.value.length < 6) {
                novaSenhaInput.classList.add('input-error');
                document.getElementById('erroAdminNovaSenha').textContent = 'A senha é obrigatória e deve ter no mínimo 6 caracteres.';
                isValid = false;
            }
            if (novaSenhaInput.value !== confirmarSenhaInput.value) {
                confirmarSenhaInput.classList.add('input-error');
                document.getElementById('erroAdminConfirmarSenha').textContent = 'As senhas não coincidem.';
                isValid = false;
            }

            if (isValid) {
                novaSenhaTemporaria = novaSenhaInput.value;
                document.getElementById('adminPasso1').style.display = 'none';
                document.getElementById('adminPasso2').style.display = 'block';
                e.target.querySelector('button[type="submit"]').textContent = 'Redefinir Senha';
            }
        } else {
            const senhaAtualInput = document.getElementById('adminSenhaAtual');
            const erroSenhaAtual = document.getElementById('erroAdminSenhaAtual');
            if (!senhaAtualInput.value) {
                senhaAtualInput.classList.add('input-error');
                erroSenhaAtual.textContent = 'A senha atual é obrigatória.';
                return;
            }
            try {
                const res = await fetch(`http://localhost:7071/api/users/${usuarioAtual.id}/redefine-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ senhaAtual: senhaAtualInput.value, novaSenha: novaSenhaTemporaria })
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
                 document.getElementById('erroAdminSenhaAtual').textContent = 'Erro de conexão com o servidor.';
            }
        }
    };
    
    // Inicialização
    carregarUsuarios();
    document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    document.getElementById('btnCancelarConfirmacao').addEventListener('click', fecharTodosModais);
});

