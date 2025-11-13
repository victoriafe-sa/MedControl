// frontend/scripts/admin/admin-perfil.js
import { api } from '../utils/api.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, exibirMensagemNoModal, iniciarTimer } from '../utils/ui.js';
import { isValidEmail, isMaisDe18 } from '../utils/validacao.js';
import { formatarCep, validarCep, preencherValidacaoCep } from '../utils/cep.js';
import { fazerLogout, salvarUsuarioSession } from '../utils/auth.js';

// --- Variáveis de Estado do Módulo ---
let usuarioAdminAtual = null;
let dadosUsuarioAtualParaSalvar = null;
let timerInterval = null;
let novaSenhaTemporaria = null;
let acaoAposConfirmarSenha = null; // 'editar', 'redefinir', 'desativar', 'excluir'

// --- Seletores de Elementos ---
let modalMeuPerfilAdmin, modalEditarPerfilAdmin, modalRedefinirSenhaAdmin,
    modalVerificacaoEmail, modalConfirmarSenhaAdmin, modalEscolhaAcaoConta;

/**
 * Renderiza o conteúdo do modal "Meu Perfil".
 */
function renderizarPerfilAdmin() {
    const container = document.getElementById('conteudoMeuPerfilAdmin');
    if (!container) return;
    
    const dataFormatada = usuarioAdminAtual.data_nascimento 
        ? new Date(usuarioAdminAtual.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR') 
        : 'Não informada';
    
    container.innerHTML = `
        <div class="space-y-5">
            <div><label class="font-semibold text-gray-600">Nome:</label><span class="ml-2 text-gray-800">${usuarioAdminAtual.nome}</span></div>
            <div><label class="font-semibold text-gray-600">Email:</label><span class="ml-2 text-gray-800">${usuarioAdminAtual.email}</span></div>
            <div><label class="font-semibold text-gray-600">CPF/CNS:</label><span class="ml-2 text-gray-800">${usuarioAdminAtual.cpf_cns}</span></div>
            <div><label class="font-semibold text-gray-600">CEP:</label><span class="ml-2 text-gray-800">${usuarioAdminAtual.cep || 'N/A'}</span></div>
            <div><label class="font-semibold text-gray-600">Data de Nascimento:</label><span class="ml-2 text-gray-800">${dataFormatada}</span></div>
        </div>
        <div class="mt-8 pt-6 border-t flex justify-between items-center gap-4">
             <div>
                <button id="btnExcluirDesativarAdmin" class="btn-perigo py-2 px-5 rounded-lg font-semibold">Excluir/Desativar Conta</button>
             </div>
             <div class="flex gap-4">
                <button id="btnAbrirModalRedefinirSenhaAdmin" class="btn-secundario py-2 px-5 rounded-lg font-semibold">Redefinir Senha</button>
                <button id="btnAbrirModalEditarAdmin" class="btn-primario py-2 px-5 rounded-lg font-semibold">Editar Perfil</button>
             </div>
        </div>
    `;
    
    // Adiciona listeners aos botões recém-criados
    document.getElementById('btnAbrirModalEditarAdmin').addEventListener('click', abrirModalEdicaoAdmin);
    document.getElementById('btnAbrirModalRedefinirSenhaAdmin').addEventListener('click', abrirModalRedefinirSenhaAdmin);
    document.getElementById('btnExcluirDesativarAdmin').addEventListener('click', () => {
        fecharTodosModais();
        modalEscolhaAcaoConta.classList.add('ativo');
    });
}

/**
 * Abre o modal para editar o próprio perfil.
 */
function abrirModalEdicaoAdmin() {
    fecharTodosModais();
    const form = document.getElementById('formularioEditarPerfilAdmin');
    limparErrosFormulario('formularioEditarPerfilAdmin');
    
    form.innerHTML = `
        <input type="hidden" id="adminEditEmailOriginal" value="${usuarioAdminAtual.email}">
        <div><label class="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" id="adminEditNome" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAdminAtual.nome}"><p id="erroadminEditNome" class="error-message"></p></div>
        <div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" id="adminEditEmail" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAdminAtual.email}"><p id="erroadminEditEmail" class="error-message"></p></div>
        <div><label class="block text-sm font-medium text-gray-700">CPF/CNS</label><input type="text" id="adminEditCpfCns" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAdminAtual.cpf_cns}"><p id="erroadminEditCpfCns" class="error-message"></p></div>
        <div>
            <label class="block text-sm font-medium text-gray-700">CEP</label>
            <input type="text" id="adminEditCep" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAdminAtual.cep || ''}" maxlength="9">
            <p id="validacaoAdminEditCep" class="validation-message"></p>
            <p id="erroadminEditCep" class="error-message"></p>
        </div>
        <div><label class="block text-sm font-medium text-gray-700">Data de Nascimento</label><input type="date" id="adminEditNascimento" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" value="${usuarioAdminAtual.data_nascimento || ''}"><p id="erroadminEditNascimento" class="error-message"></p></div>
        <div class="pt-4 flex gap-4"><button type="button" class="fechar-modal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Salvar Alterações</button></div>
    `;
    
    form.onsubmit = onFormularioEditarAdminSubmit;
    form.querySelector('.fechar-modal').addEventListener('click', fecharTodosModais);
    
    // Adiciona listeners do CEP
    const cepInput = form.querySelector('#adminEditCep');
    const validationElement = form.querySelector('#validacaoAdminEditCep');

    // Chama a nova função utilitária
    preencherValidacaoCep(cepInput, validationElement, usuarioAdminAtual.cep);
    
    // Adiciona os listeners do CEP 
    cepInput.addEventListener('input', () => formatarCep(cepInput));
    cepInput.addEventListener('blur', () => validarCep(cepInput, validationElement));
    cepInput.addEventListener('focus', () => {
        validationElement.textContent = '';
        validationElement.className = 'validation-message';
        document.getElementById('erroadminEditCep').textContent = '';
        cepInput.classList.remove('input-success', 'input-error');
    });
    
    modalEditarPerfilAdmin.classList.add('ativo');
}

/**
 * Valida o formulário de edição do próprio perfil.
 * @returns {boolean}
 */
function validarFormularioEdicaoAdmin() {
    limparErrosFormulario('formularioEditarPerfilAdmin');
    let isValid = true;
    
    const camposObrigatorios = {
        'adminEditNome': 'O nome é obrigatório.',
        'adminEditEmail': 'O e-mail é obrigatório.',
        'adminEditCpfCns': 'O CPF/CNS é obrigatório.',
        'adminEditCep': 'O CEP é obrigatório.',
        'adminEditNascimento': 'A data de nascimento é obrigatória.',
    };

    for (const [id, mensagem] of Object.entries(camposObrigatorios)) {
        const input = document.getElementById(id);
        if (input && !input.value.trim()) {
            input.classList.add('input-error');
            document.getElementById(`erro${id}`).textContent = mensagem;
            isValid = false;
        }
    }
    
    const emailInput = document.getElementById('adminEditEmail');
    if (emailInput.value.trim() && !isValidEmail(emailInput.value.trim())) {
        emailInput.classList.add('input-error');
        document.getElementById('erroadminEditEmail').textContent = 'Formato de e-mail inválido.';
        isValid = false;
    }

    const nascInput = document.getElementById('adminEditNascimento');
    if (nascInput.value && !isMaisDe18(nascInput.value)) {
        nascInput.classList.add('input-error');
        document.getElementById('erroadminEditNascimento').textContent = 'Você deve ter 18 anos ou mais.';
        isValid = false;
    }

    const cepInput = document.getElementById('adminEditCep');
    if (cepInput.value.trim() && !cepInput.classList.contains('input-success')) {
        cepInput.classList.add('input-error');
        document.getElementById('erroadminEditCep').textContent = 'Por favor, insira um CEP válido para continuar.';
        isValid = false;
    }

    return isValid;
}

/**
 * Handler para o submit do formulário de edição do admin.
 */
async function onFormularioEditarAdminSubmit(e) {
    e.preventDefault();
    if (!validarFormularioEdicaoAdmin()) return;

    dadosUsuarioAtualParaSalvar = {
        nome: document.getElementById('adminEditNome').value,
        email: document.getElementById('adminEditEmail').value,
        cpf_cns: document.getElementById('adminEditCpfCns').value,
        cep: document.getElementById('adminEditCep').value,
        data_nascimento: document.getElementById('adminEditNascimento').value,
        perfil: usuarioAdminAtual.perfil // Mantém o perfil atual
    };

    // --- CORREÇÃO: Buscar coordenadas ANTES de verificar existência ---
    try {
        const cepData = await api.validarCep(dadosUsuarioAtualParaSalvar.cep.replace(/\D/g, ''));
        // MODIFICAÇÃO 3.3: Remove lat/lon e adiciona campos de endereço
        dadosUsuarioAtualParaSalvar.logradouro = cepData.logradouro || null;
        dadosUsuarioAtualParaSalvar.bairro = cepData.bairro || null;
        dadosUsuarioAtualParaSalvar.cidade = cepData.cidade || null;
        dadosUsuarioAtualParaSalvar.uf = cepData.uf || null;
    } catch (err) {
        console.error("Erro ao buscar dados do CEP:", err); // Modificado
        document.getElementById('adminEditCep').classList.add('input-error');
        document.getElementById('erroadminEditCep').textContent = err.message || 'Não foi possível buscar dados para este CEP.'; // Modificado
        return; // Interrompe se a busca de CEP falhar
    }
    
    // Etapa 2: Verificar duplicidade
    try {
        const data = await api.verificarExistencia(
            dadosUsuarioAtualParaSalvar.email,
            dadosUsuarioAtualParaSalvar.cpf_cns,
            usuarioAdminAtual.id
        );

        let hasError = false;
        if (data.email) {
            document.getElementById('adminEditEmail').classList.add('input-error');
            document.getElementById('erroadminEditEmail').textContent = 'Este e-mail já está cadastrado.';
            hasError = true;
        }
        if (data.cpf_cns) {
            document.getElementById('adminEditCpfCns').classList.add('input-error');
            document.getElementById('erroadminEditCpfCns').textContent = 'Este CPF/CNS já está cadastrado.';
            hasError = true;
        }
        if (hasError) return;
        
        // Etapa 3: Decidir fluxo
        const emailOriginal = document.getElementById('adminEditEmailOriginal').value;
        const emailAlterado = dadosUsuarioAtualParaSalvar.email.toLowerCase() !== emailOriginal.toLowerCase();

        if (emailAlterado) {
            iniciarFluxoVerificacaoAdmin();
        } else {
            acaoAposConfirmarSenha = () => salvarPerfilAdmin(false);
            document.getElementById('formularioConfirmarSenha').reset();
            limparErrosFormulario('formularioConfirmarSenha');
            modalConfirmarSenhaAdmin.classList.add('ativo');
        }

    } catch (err) {
        document.getElementById('erroadminEditNome').textContent = "Erro de conexão ao verificar dados.";
    }
}

/**
 * Inicia o fluxo de verificação de e-mail para o admin (envia código).
 */
async function iniciarFluxoVerificacaoAdmin() {
    fecharTodosModais();
    modalVerificacaoEmail.classList.add('ativo');
    document.getElementById('emailParaVerificar').textContent = dadosUsuarioAtualParaSalvar.email;
    const msgEl = document.getElementById('mensagemVerificacao');
    exibirMensagemNoModal(msgEl, 'Enviando código...', false);

    const reenviarBtn = document.getElementById('btnReenviarCodigoAdmin');
    reenviarBtn.disabled = true;

    try {
        await api.enviarCodigoVerificacao(dadosUsuarioAtualParaSalvar.email, 'alteracao');
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
 * Salva as alterações do perfil do admin.
 * @param {boolean} comVerificacao
 */
async function salvarPerfilAdmin(comVerificacao) {
    try {
        let resposta;
        if (comVerificacao) {
            resposta = await api.atualizarUsuarioComVerificacao(usuarioAdminAtual.id, dadosUsuarioAtualParaSalvar);
        } else {
            resposta = await api.atualizarUsuario(usuarioAdminAtual.id, dadosUsuarioAtualParaSalvar);
        }

        if (resposta.success) {
            // Atualiza os dados locais
            // --- ATUALIZAÇÃO ---
            // Atualiza os dados locais com o que foi salvo (incluindo endereço)
            usuarioAdminAtual = { ...usuarioAdminAtual, ...dadosUsuarioAtualParaSalvar };
            salvarUsuarioSession(usuarioAdminAtual);
            
            fecharTodosModais();
            exibirToast('Perfil atualizado com sucesso!');
            document.getElementById('boasVindasAdmin').textContent = `Olá, ${usuarioAdminAtual.nome.split(' ')[0]}!`;
            // Re-renderiza o modal "Meu Perfil" se estiver aberto (não está, mas é boa prática)
        }
    } catch (error) {
        if (error.status === 400 && comVerificacao) {
            fecharTodosModais();
            modalVerificacaoEmail.classList.add('ativo');
            exibirMensagemNoModal(document.getElementById('mensagemVerificacao'), error.message, true);
        } else {
             // Exibe o erro no modal de edição, caso ele ainda esteja visível
            const erroNomeEl = document.getElementById('erroadminEditNome');
            if (erroNomeEl) {
                erroNomeEl.textContent = `Erro: ${error.message || 'Ocorreu um erro.'}`;
            } else {
                // Fallback se o modal de edição não estiver visível
                exibirToast(`Erro: ${error.message || 'Ocorreu um erro.'}`, true);
            }
        }
    }
}

/**
 * Abre o modal para redefinir a própria senha.
 */
function abrirModalRedefinirSenhaAdmin() {
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
        <div class="pt-4 flex gap-4"><button type="button" class="fechar-modal w-full bg-gray-200 py-3 rounded-lg font-semibold">Cancelar</button><button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Avançar</button></div>
    `;
    
    form.onsubmit = onFormularioRedefinirSenhaAdminSubmit;
    form.querySelector('.fechar-modal').addEventListener('click', fecharTodosModais);
    modalRedefinirSenhaAdmin.classList.add('ativo');
}

/**
 * Handler para o submit do formulário de redefinição de senha do admin.
 */
async function onFormularioRedefinirSenhaAdminSubmit(e) {
    e.preventDefault();
    const passo1Visivel = document.getElementById('adminPasso1').style.display !== 'none';
    
    if (passo1Visivel) {
        // Validação do Passo 1
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
        // Submissão do Passo 2
        const senhaAtualInput = document.getElementById('adminSenhaAtual');
        const erroSenhaAtual = document.getElementById('erroAdminSenhaAtual');
        if (!senhaAtualInput.value) {
            senhaAtualInput.classList.add('input-error');
            erroSenhaAtual.textContent = 'A senha atual é obrigatória.';
            return;
        }
        
        try {
            await api.redefinirSenhaLogado(usuarioAdminAtual.id, senhaAtualInput.value, novaSenhaTemporaria);
            fecharTodosModais();
            exibirToast('Senha alterada com sucesso!');
        } catch(err) {
            senhaAtualInput.classList.add('input-error');
            erroSenhaAtual.textContent = err.message || 'Erro ao redefinir senha.';
        }
    }
}

/**
 * Handler para o submit do formulário de verificação de código (para edição do admin).
 */
async function onFormularioVerificacaoAdminSubmit(e) {
    e.preventDefault();
    const codigo = document.getElementById('codigoVerificacao').value;
    const msgEl = document.getElementById('mensagemVerificacao');
    
    if (!codigo || codigo.length < 6) {
        exibirMensagemNoModal(msgEl, 'Código inválido.', true);
        return;
    }

    try {
        await api.verificarCodigo(dadosUsuarioAtualParaSalvar.email, codigo);
        
        dadosUsuarioAtualParaSalvar.codigoVerificacao = codigo;
        
        // Pede a senha do admin para confirmar a alteração
        acaoAposConfirmarSenha = () => salvarPerfilAdmin(true);
        
        fecharTodosModais();
        document.getElementById('formularioConfirmarSenha').reset();
        limparErrosFormulario('formularioConfirmarSenha');
        modalConfirmarSenhaAdmin.classList.add('ativo');
    
    } catch (error) {
        exibirMensagemNoModal(msgEl, error.message || 'Código inválido.', true);
    }
}

/**
 * Handler para o submit do formulário de confirmação de senha do admin (ações do perfil).
 */
async function onFormularioConfirmarSenhaAdminSubmit(e) {
    e.preventDefault();
    const senhaAdminInput = document.getElementById('senhaAdmin');
    const erroSenhaEl = document.getElementById('erroSenha');
    erroSenhaEl.textContent = '';

    try {
        await api.verificarSenha(usuarioAdminAtual.id, senhaAdminInput.value);
        
        if (typeof acaoAposConfirmarSenha === 'function') {
            await acaoAposConfirmarSenha();
            acaoAposConfirmarSenha = null;
        }
    } catch(err) {
        erroSenhaEl.textContent = err.message || 'Senha incorreta.';
    }
}

/**
 * Desativa a própria conta do admin.
 */
async function desativarPropriaConta() {
    try {
        await api.alterarStatusUsuario(usuarioAdminAtual.id, false);
        fecharTodosModais();
        exibirToast('Conta desativada. Você será desconectado.');
        setTimeout(fazerLogout, 500);
    } catch (e) {
        alert('Erro ao desativar a conta.');
    }
}

/**
 * Exclui a própria conta do admin.
 */
async function excluirPropriaConta() {
    try {
        await api.excluirUsuario(usuarioAdminAtual.id);
        fecharTodosModais();
        exibirToast('Conta excluída com sucesso. Você será desconectado.');
        setTimeout(fazerLogout, 500);
    } catch (e) {
        alert('Erro ao excluir a conta.');
    }
}

/**
 * Inicializa o módulo de perfil do admin.
 * @param {object} usuarioLogado - O objeto do usuário admin logado.
 */
export function initAdminPerfil(usuarioLogado) {
    usuarioAdminAtual = usuarioLogado;

    // Mapeia elementos DOM
    modalMeuPerfilAdmin = document.getElementById('modalMeuPerfilAdmin');
    modalEditarPerfilAdmin = document.getElementById('modalEditarPerfilAdmin');
    modalRedefinirSenhaAdmin = document.getElementById('modalRedefinirSenhaAdmin');
    modalVerificacaoEmail = document.getElementById('modalVerificacaoEmail');
    modalConfirmarSenhaAdmin = document.getElementById('modalConfirmarSenha');
    modalEscolhaAcaoConta = document.getElementById('modalEscolhaAcaoConta');

    // Adiciona Listeners
    document.getElementById('btnMeuPerfilAdmin').addEventListener('click', () => {
        renderizarPerfilAdmin();
        modalMeuPerfilAdmin.classList.add('ativo');
    });

    // Listeners dos modais de gerenciamento de conta
    document.querySelector('#modalEscolhaAcaoConta .btnCancelarAcaoConta').addEventListener('click', fecharTodosModais);
    
    document.getElementById('btnConfirmarEscolhaAcao').addEventListener('click', () => {
        const acaoSelecionada = document.querySelector('input[name="acaoConta"]:checked').value;
        
        if (acaoSelecionada === 'desativar') {
            acaoAposConfirmarSenha = desativarPropriaConta;
        } else {
            acaoAposConfirmarSenha = excluirPropriaConta;
        }
        
        fecharTodosModais();
        document.getElementById('formularioConfirmarSenha').reset();
        limparErrosFormulario('formularioConfirmarSenha');
        modalConfirmarSenhaAdmin.classList.add('ativo');
    });

    // Listener do formulário de confirmação de senha (reutilizado)
    // Note que admin-usuarios.js já adicionou um listener a este formulário.
    // Para evitar conflitos, a lógica foi movida para os módulos específicos
    // e o listener central só verifica a senha e chama 'acaoAposConfirmarSenha'.
    // Vamos garantir que o listener de `admin-usuarios` também use `acaoAposConfirmarSenha`.
    
    // Este listener agora é compartilhado, vamos usar o do `admin-usuarios.js`
    // e apenas garantir que o de verificação de código (para edição de perfil)
    // também use o fluxo correto.

    // Sobrescreve o listener do formulário de verificação para o fluxo de edição de perfil
    document.getElementById('formularioVerificacao').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Verifica se é o fluxo de edição de perfil do admin
        if (dadosUsuarioAtualParaSalvar && dadosUsuarioAtualParaSalvar.perfil === usuarioAdminAtual.perfil) {
            await onFormularioVerificacaoAdminSubmit(e);
        }
    });
    
    // Sobrescreve o listener de confirmação de senha
    document.getElementById('formularioConfirmarSenha').onsubmit = onFormularioConfirmarSenhaAdminSubmit;

    // Listener de Reenviar Código (compartilhado)
    document.getElementById('btnReenviarCodigoAdmin').addEventListener('click', () => {
        if (dadosUsuarioAtualParaSalvar) { // Garante que há dados para reenviar
            clearInterval(timerInterval);
            // Verifica se é o fluxo de edição do admin
            if (dadosUsuarioAtualParaSalvar.perfil === usuarioAdminAtual.perfil) {
                iniciarFluxoVerificacaoAdmin();
            }
            // (O fluxo do admin-usuarios.js é tratado lá, se necessário)
        }
    });
}