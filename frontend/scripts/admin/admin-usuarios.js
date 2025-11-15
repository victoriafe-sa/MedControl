// frontend/scripts/admin/admin-usuarios.js
import { api } from '../utils/api.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, exibirMensagemNoModal, iniciarTimer, abrirConfirmacao } from '../utils/ui.js';
import { isValidEmail, isMaisDe18 } from '../utils/validacao.js';
import { formatarCep, validarCep, preencherValidacaoCep } from '../utils/cep.js';

// --- Variáveis de Estado do Módulo ---
let dadosUsuarioAtualParaSalvar = null;
let fluxoVerificacao = 'adicionar'; // 'adicionar', 'editarTabela'
let usuarioEditadoOriginal = null;
let timerInterval = null;
let acaoAposConfirmarSenha = null;
let usuarioAdminAtual = null; // ID do admin logado

// --- Seletores de Elementos ---
let modalFormularioUsuario, modalConfirmacao, modalVerificacaoEmail, modalConfirmarSenhaAdmin, formularioUsuario, corpoTabelaUsuarios, cepUsuarioInput;

/**
 * Valida o formulário de adicionar/editar usuário.
 * @param {boolean} isEditing - Define se o campo senha deve ser validado.
 * @returns {boolean} - True se o formulário for válido.
 */
function validarFormulario(isEditing) {
    limparErrosFormulario('formularioUsuario');
    let isValid = true;
    
    const camposObrigatorios = {
        'nomeUsuario': 'O nome é obrigatório.',
        'emailUsuario': 'O e-mail é obrigatório.',
        'cpfUsuario': 'O CPF/CNS é obrigatório.',
        'cepUsuario': 'O CEP é obrigatório.',
        'nascimentoUsuario': 'A data de nascimento é obrigatória.',
    };

    // Adiciona senha apenas se não estiver editando
    if (!isEditing) {
        camposObrigatorios['senhaUsuario'] = 'A senha é obrigatória.';
    }

    for (const [id, mensagem] of Object.entries(camposObrigatorios)) {
        const input = document.getElementById(id);
        if (input && !input.value.trim()) {
            input.classList.add('input-error');
            document.getElementById(`erro${id.charAt(0).toUpperCase() + id.slice(1)}`).textContent = mensagem;
            isValid = false;
        }
    }
    
    // Validações específicas
    const emailInput = document.getElementById('emailUsuario');
    if (emailInput.value.trim() && !isValidEmail(emailInput.value.trim())) {
        emailInput.classList.add('input-error');
        document.getElementById('erroEmailUsuario').textContent = 'Formato de e-mail inválido.';
        isValid = false;
    }

    const nascInput = document.getElementById('nascimentoUsuario');
    if (nascInput.value && !isMaisDe18(nascInput.value)) {
        nascInput.classList.add('input-error');
        document.getElementById('erroNascimentoUsuario').textContent = 'O usuário deve ter 18 anos ou mais.';
        isValid = false;
    }

    if (!isEditing) {
        const senhaInput = document.getElementById('senhaUsuario');
        if (senhaInput.value.trim().length < 6) {
            senhaInput.classList.add('input-error');
            document.getElementById('erroSenhaUsuario').textContent = 'A senha deve ter no mínimo 6 caracteres.';
            isValid = false;
        }
    }
    
    const cepInput = document.getElementById('cepUsuario');
    if (cepInput.value.trim() && !cepInput.classList.contains('input-success')) {
        cepInput.classList.add('input-error');
        document.getElementById('erroCepUsuario').textContent = 'Por favor, insira um CEP válido para continuar.';
        isValid = false;
    }

    return isValid;
}

/**
 * Carrega e renderiza a lista de usuários na tabela.
 * MODIFICADO: Função exportada para ser chamada pelo Admin.js
 */
export async function carregarUsuarios() {
    if (!corpoTabelaUsuarios) return; // Adiciona guarda
    try {
        const usuarios = await api.listarUsuarios();
        // Filtra o próprio admin da lista
        const usuariosFiltrados = usuarios.filter(u => u.id !== usuarioAdminAtual.id);

        corpoTabelaUsuarios.innerHTML = '';
        usuariosFiltrados.forEach(usuario => {
            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-200 ${!usuario.ativo ? 'bg-red-50 text-gray-500' : ''}`;
            
            // Garante que a data seja tratada corretamente
            const dataNascFormatada = usuario.data_nascimento 
                ? new Date(usuario.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR') 
                : 'N/A';
            
            tr.innerHTML = `
                <td class="p-4">${usuario.nome}</td>
                <td class="p-4">${usuario.email}</td>
                <td class="p-4">${usuario.cpf_cns}</td>
                <td class="p-4">${usuario.cep || 'N/A'}</td>
                <td class="p-4">${dataNascFormatada}</td>
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
        corpoTabelaUsuarios.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar usuários.'}</td></tr>`;
    }
}

/**
 * Abre o modal para adicionar um novo usuário.
 */
function abrirModalParaAdicionar() {
    fluxoVerificacao = 'adicionar';
    formularioUsuario.reset();
    limparErrosFormulario('formularioUsuario');
    const cepValidationMsg = document.getElementById('validacaoCepUsuario');
    preencherValidacaoCep(cepUsuarioInput, cepValidationMsg, null);
    document.getElementById('idUsuario').value = '';
    document.getElementById('tituloModalUsuario').textContent = 'Adicionar Novo Usuário';
    document.getElementById('containerCampoSenha').style.display = 'block';
    modalFormularioUsuario.classList.add('ativo');
}

/**
 * Abre o modal para editar um usuário existente.
 * @param {object} usuario - O objeto do usuário a ser editado.
 */
function abrirModalParaEditar(usuario) {
    fluxoVerificacao = 'editarTabela';
    usuarioEditadoOriginal = { ...usuario };
    formularioUsuario.reset();
    limparErrosFormulario('formularioUsuario');
    
    const cepInput = document.getElementById('cepUsuario');
    const cepValidationMsg = document.getElementById('validacaoCepUsuario');
    preencherValidacaoCep(cepInput, cepValidationMsg, usuario.cep);

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
}

/**
 * Altera o status (ativo/inativo) de um usuário.
 * @param {string|number} id
 * @param {boolean} novoStatus
 */
async function alterarStatusUsuario(id, novoStatus) {
    try {
        await api.alterarStatusUsuario(id, novoStatus);
        carregarUsuarios(); // Recarrega a lista
        exibirToast('Status alterado com sucesso!');
    } catch (e) {
        exibirToast('Erro ao alterar status.', true);
    }
}

/**
 * Exclui um usuário após confirmação.
 * @param {string|number} id
 */
async function excluirUsuario(id) {
    try {
        await api.excluirUsuario(id);
        fecharTodosModais();
        carregarUsuarios(); // Recarrega a lista
        exibirToast('Usuário excluído com sucesso!');
    } catch (e) {
        fecharTodosModais();
        exibirToast('Erro ao excluir usuário.', true);
    }
}

/**
 * Inicia o fluxo de verificação de e-mail (envia código).
 */
async function iniciarFluxoVerificacao() {
    fecharTodosModais();
    modalVerificacaoEmail.classList.add('ativo');
    document.getElementById('emailParaVerificar').textContent = dadosUsuarioAtualParaSalvar.email;
    const msgEl = document.getElementById('mensagemVerificacao');
    exibirMensagemNoModal(msgEl, 'Enviando código...', false);
    
    const motivo = fluxoVerificacao === 'adicionar' ? 'cadastro' : 'alteracao';

    const reenviarBtn = document.getElementById('btnReenviarCodigoAdmin');
    reenviarBtn.disabled = true;

    try {
        await api.enviarCodigoVerificacao(dadosUsuarioAtualParaSalvar.email, motivo);
        msgEl.style.display = 'none';
        const timerEl = document.getElementById('timer');
        const reenviarBtn = document.getElementById('btnReenviarCodigoAdmin');
        timerInterval = iniciarTimer(120, timerEl, reenviarBtn);
    } catch (e) {
        exibirMensagemNoModal(msgEl, e.message || 'Falha ao enviar o código.', true);

        reenviarBtn.disabled = false;
    }
}

/**
 * Salva o usuário (novo ou edição) no banco de dados.
 * @param {boolean} estaEditando
 * @param {string|number|null} id
 * @param {boolean} comVerificacao - Se true, envia o codigoVerificacao
 */
async function salvarUsuario(estaEditando, id, comVerificacao) {
    try {
        let resposta;
        if (!estaEditando) {
            resposta = await api.registrarAdmin(dadosUsuarioAtualParaSalvar); 
        } else if (comVerificacao) {
            resposta = await api.atualizarUsuarioComVerificacao(id, dadosUsuarioAtualParaSalvar); 
        } else {
            resposta = await api.atualizarUsuario(id, dadosUsuarioAtualParaSalvar); 
        }

        if (resposta.success) {
            fecharTodosModais();
            carregarUsuarios(); // Recarrega a lista
            exibirToast(estaEditando ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        }
    } catch (error) {
        if (error.status === 400 && comVerificacao) {
            fecharTodosModais();
            modalVerificacaoEmail.classList.add('ativo');
            exibirMensagemNoModal(document.getElementById('mensagemVerificacao'), error.message, true);
        } else if (error.status === 409) {
            fecharTodosModais();
            modalFormularioUsuario.classList.add('ativo');
            const campo = error.data.field === 'email' ? 'emailUsuario' : 'cpfUsuario';
            const erroEl = error.data.field === 'email' ? 'erroEmailUsuario' : 'erroCpfUsuario';
            document.getElementById(campo).classList.add('input-error');
            document.getElementById(erroEl).textContent = `Este ${error.data.field} já está cadastrado.`;
        } else {
            alert('Erro ao salvar usuário: ' + (error.message || 'Erro desconhecido'));
        }
    }
}

// --- Handlers de Eventos ---

/**
 * Handler para o submit do formulário principal de usuário (Adicionar/Editar).
 */
async function onFormularioUsuarioSubmit(e) {
    e.preventDefault();

    const btnSubmit = document.getElementById('btnEnviarFormularioUsuario');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Salvando...';

    const estaEditando = !!document.getElementById('idUsuario').value;
    if (!validarFormulario(estaEditando)) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Salvar';
        return;
    }

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
    
    let cepData;
    try {
        cepData = await api.validarCep(dadosUsuarioAtualParaSalvar.cep.replace(/\D/g, ''));
        
        dadosUsuarioAtualParaSalvar.logradouro = cepData.logradouro || null;
        dadosUsuarioAtualParaSalvar.bairro = cepData.bairro || null;
        dadosUsuarioAtualParaSalvar.cidade = cepData.cidade || null;
        dadosUsuarioAtualParaSalvar.uf = cepData.uf || null;

    } catch (err) {
        console.error("Erro ao buscar dados do CEP:", err); 
        document.getElementById('cepUsuario').classList.add('input-error');
        document.getElementById('erroCepUsuario').textContent = err.message || 'Não foi possível buscar dados para este CEP.'; 
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Salvar';
        return;
    }

    // Etapa 2: Verificar duplicidade
    try {
        const data = await api.verificarExistencia(
            dadosUsuarioAtualParaSalvar.email,
            dadosUsuarioAtualParaSalvar.cpf_cns,
            estaEditando ? document.getElementById('idUsuario').value : null
        );

        let hasError = false;
        if (data.email) {
            document.getElementById('emailUsuario').classList.add('input-error');
            document.getElementById('erroEmailUsuario').textContent = 'Este e-mail já está cadastrado.';
            hasError = true;
        }
        if (data.cpf_cns) {
            document.getElementById('cpfUsuario').classList.add('input-error');
            document.getElementById('erroCpfUsuario').textContent = 'Este CPF/CNS já está cadastrado.';
            hasError = true;
        }
        if (hasError) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Salvar';
            return;
        }

        // Etapa 3: Decidir fluxo (com ou sem verificação de e-mail)
        const emailOriginal = document.getElementById('emailOriginal').value;
        const emailAlterado = estaEditando && dadosUsuarioAtualParaSalvar.email.toLowerCase() !== emailOriginal.toLowerCase();

        if (!estaEditando || emailAlterado) {
            // Requer verificação de e-mail
            fluxoVerificacao = estaEditando ? 'editarTabela' : 'adicionar';
            iniciarFluxoVerificacao();
        } else {
            // Não requer verificação de e-mail, pede senha do admin
            acaoAposConfirmarSenha = () => salvarUsuario(true, document.getElementById('idUsuario').value, false);
            document.getElementById('formularioConfirmarSenha').reset();
            limparErrosFormulario('formularioConfirmarSenha');
            modalConfirmarSenhaAdmin.classList.add('ativo');
        }

    } catch (err) {
        console.error("Erro ao verificar dados:", err);
        document.getElementById('erroNomeUsuario').textContent = "Erro de conexão ao verificar dados.";
    }

    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Salvar';
}

/**
 * Handler para o submit do formulário de verificação de código.
 */
async function onFormularioVerificacaoSubmit(e) {
    e.preventDefault();
    
    const codigo = document.getElementById('codigoVerificacao').value;
    const msgEl = document.getElementById('mensagemVerificacao');
    
    if (!codigo || codigo.length < 6) {
        exibirMensagemNoModal(msgEl, 'Código inválido.', true);
        return;
    }

    try {
        // 1. Verifica se o código é válido
        await api.verificarCodigo(dadosUsuarioAtualParaSalvar.email, codigo);
        
        // 2. Se válido, anexa o código e pede a senha do admin
        dadosUsuarioAtualParaSalvar.codigoVerificacao = codigo;
        
        const id = (fluxoVerificacao === 'editarTabela') ? usuarioEditadoOriginal.id : null;
        const estaEditando = fluxoVerificacao !== 'adicionar';

        acaoAposConfirmarSenha = () => salvarUsuario(estaEditando, id, true);
        
        fecharTodosModais();
        document.getElementById('formularioConfirmarSenha').reset();
        limparErrosFormulario('formularioConfirmarSenha');
        modalConfirmarSenhaAdmin.classList.add('ativo');
    
    } catch (error) {
        // Código inválido ou expirado
        exibirMensagemNoModal(msgEl, error.message || 'Código inválido.', true);
    }
}

/**
 * Handler para o submit do formulário de confirmação de senha do admin.
 */
async function onFormularioConfirmarSenhaSubmit(e) {
    e.preventDefault();
    const senhaAdminInput = document.getElementById('senhaAdmin');
    const erroSenhaEl = document.getElementById('erroSenha');
    erroSenhaEl.textContent = '';

    try {
        await api.verificarSenha(usuarioAdminAtual.id, senhaAdminInput.value);
        
        // Senha correta, executa a ação pendente
        if (typeof acaoAposConfirmarSenha === 'function') {
            await acaoAposConfirmarSenha(); // Adiciona await caso a ação seja assíncrona
            acaoAposConfirmarSenha = null; // Reseta a ação
        }
    } catch(err) {
        // Senha incorreta ou erro de rede
        erroSenhaEl.textContent = err.message || 'Senha incorreta.';
    }
}

/**
 * Inicializa o módulo de gerenciamento de usuários.
 * @param {object} usuarioLogado - O objeto do usuário admin logado.
 */
export function initAdminUsuarios(usuarioLogado) {
    // MODIFICADO: Previne reinicialização
    if (document.getElementById('corpoTabelaUsuarios')?.dataset.initialized) return;

    usuarioAdminAtual = usuarioLogado;
    
    // Mapeia elementos DOM
    modalFormularioUsuario = document.getElementById('modalFormularioUsuario');
    modalConfirmacao = document.getElementById('modalConfirmacao');
    modalVerificacaoEmail = document.getElementById('modalVerificacaoEmail');
    modalConfirmarSenhaAdmin = document.getElementById('modalConfirmarSenha');
    formularioUsuario = document.getElementById('formularioUsuario');
    corpoTabelaUsuarios = document.getElementById('corpoTabelaUsuarios');
    cepUsuarioInput = document.getElementById('cepUsuario');

    if (!corpoTabelaUsuarios) return; // Sai se a aba não estiver no DOM
    corpoTabelaUsuarios.dataset.initialized = true; // Marca como inicializado

    // Adiciona Listeners
    document.getElementById('abrirModalAdicionarUsuario').addEventListener('click', abrirModalParaAdicionar);
    
    // Listeners do CEP
    cepUsuarioInput.addEventListener('input', () => formatarCep(cepUsuarioInput));
    cepUsuarioInput.addEventListener('blur', () => validarCep(cepUsuarioInput, document.getElementById('validacaoCepUsuario')));
    cepUsuarioInput.addEventListener('focus', () => {
        document.getElementById('validacaoCepUsuario').textContent = '';
        document.getElementById('validacaoCepUsuario').className = 'validation-message';
        document.getElementById('erroCepUsuario').textContent = '';
        cepUsuarioInput.classList.remove('input-success', 'input-error');
    });

    // Listeners de Formulários
    formularioUsuario.addEventListener('submit', onFormularioUsuarioSubmit);
    document.getElementById('formularioVerificacao').addEventListener('submit', onFormularioVerificacaoSubmit);
    document.getElementById('formularioConfirmarSenha').addEventListener('submit', onFormularioConfirmarSenhaSubmit);

    // Listeners da Tabela (delegação de evento)
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
            abrirConfirmacao(
                `Confirmar ${statusAtual ? 'Desativação' : 'Ativação'}`,
                `Tem certeza que deseja ${statusAtual ? 'desativar' : 'ativar'} este usuário?`,
                () => alterarStatusUsuario(id, !statusAtual)
            );
        }
    });
    
    // Listener de Reenviar Código
    document.getElementById('btnReenviarCodigoAdmin').addEventListener('click', () => {
        clearInterval(timerInterval);
        iniciarFluxoVerificacao();
    });

    // REMOVIDO: carregarUsuarios() será chamado pelo Admin.js
}