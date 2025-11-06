// frontend/scripts/usuario/usuario-perfil.js
import { api } from '../utils/api.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, exibirMensagemNoModal, iniciarTimer } from '../utils/ui.js';
import { isValidEmail, isMaisDe18 } from '../utils/validacao.js';
import { formatarCep, validarCep, preencherValidacaoCep } from '../utils/cep.js';
import { fazerLogout, salvarUsuarioSession, getUsuarioAtual } from '../utils/auth.js';

// --- Variáveis de Estado do Módulo ---
let usuarioAtual = null;
let dadosParaSalvar = null; 
let timerInterval = null;
let novaSenhaTemporaria = null;
let acaoGerenciarContaSelecionada = null;
let acaoAposConfirmarSenha = null;

// --- Seletores de Elementos ---
let modalEditarPerfil, modalRedefinirSenha, modalVerificacaoEmailEdicao,
    modalEscolhaAcaoConta, modalConfirmarSenhaUsuario;

/**
 * Renderiza o conteúdo da aba "Meu Perfil".
 */
export function renderizarPerfil() {
    usuarioAtual = getUsuarioAtual(); // Garante que temos os dados mais recentes
    const container = document.getElementById('conteudo-perfil');
    if (!container) return;

    const dataFormatada = usuarioAtual.data_nascimento 
        ? new Date(usuarioAtual.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR')
        : 'Não informada';

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
                <div><label class="font-semibold text-gray-600">CEP:</label><span class="ml-2 text-gray-800">${usuarioAtual.cep || 'N/A'}</span></div>
                <div><label class="font-semibold text-gray-600">Data de Nascimento:</label><span class="ml-2 text-gray-800">${dataFormatada}</span></div>
            </div>
            <div class="mt-12 pt-8 border-t border-red-200">
                <h3 class="text-xl font-bold text-red-700">Gerenciar Conta</h3>
                <p class="mt-2 text-gray-600">Cuidado, as ações abaixo não podem ser desfeitas.</p>
                <div class="mt-4">
                    <button id="btnExcluirDesativarUsuario" class="btn-perigo py-2 px-5 rounded-lg text-base font-semibold">Excluir ou Desativar Conta</button>
                </div>
            </div>
        </div>
    `;
    
    // Adiciona listeners aos botões recém-criados
    document.getElementById('btnEditarPerfil').addEventListener('click', abrirModalEdicaoPerfil);
    document.getElementById('btnAbrirRedefinirSenha').addEventListener('click', abrirModalRedefinirSenha);
    document.getElementById('btnExcluirDesativarUsuario').addEventListener('click', () => {
        modalEscolhaAcaoConta.classList.add('ativo');
    });
}

/**
 * Abre o modal para editar o perfil do usuário.
 */
function abrirModalEdicaoPerfil() {
    limparErrosFormulario('formularioEditarPerfil');
    
    document.getElementById('editarNome').value = usuarioAtual.nome;
    document.getElementById('editarEmail').value = usuarioAtual.email;
    document.getElementById('editarCpfCns').value = usuarioAtual.cpf_cns;
    document.getElementById('editarCep').value = usuarioAtual.cep;
    document.getElementById('editarNascimento').value = usuarioAtual.data_nascimento;

    const cepInput = document.getElementById('editarCep');
    const cepValidationMsg = document.getElementById('validacaoEditarCep');
    preencherValidacaoCep(cepInput, cepValidationMsg, usuarioAtual.cep);

    modalEditarPerfil.classList.add('ativo');
}

/**
 * Valida o formulário de edição de perfil.
 * @returns {boolean}
 */
function validarFormularioEdicao() {
    limparErrosFormulario('formularioEditarPerfil');
    let isValid = true;
    
    const camposObrigatorios = {
        'editarNome': 'O nome é obrigatório.',
        'editarEmail': 'O e-mail é obrigatório.',
        'editarCpfCns': 'O CPF/CNS é obrigatório.',
        'editarCep': 'O CEP é obrigatório.',
        'editarNascimento': 'A data de nascimento é obrigatória.'
    };

    for (const [id, mensagem] of Object.entries(camposObrigatorios)) {
        const input = document.getElementById(id);
        if (input && !input.value.trim()) {
            input.classList.add('input-error');
            document.getElementById(`erro${id.charAt(0).toUpperCase() + id.slice(1)}`).textContent = mensagem;
            isValid = false;
        }
    }
    
    const emailInput = document.getElementById('editarEmail');
    if (emailInput.value.trim() && !isValidEmail(emailInput.value.trim())) {
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

    const cepInput = document.getElementById('editarCep');
    if (cepInput.value.trim() && !cepInput.classList.contains('input-success')) {
        cepInput.classList.add('input-error');
        document.getElementById('erroEditarCep').textContent = 'Por favor, insira um CEP válido para continuar.';
        isValid = false;
    }

    return isValid;
}

/**
 * Handler para o submit do formulário de edição de perfil.
 */
async function onFormularioEditarPerfilSubmit(e) {
    e.preventDefault();
    if(!validarFormularioEdicao()) return;

    dadosParaSalvar = {
        nome: document.getElementById('editarNome').value,
        email: document.getElementById('editarEmail').value,
        cpf_cns: document.getElementById('editarCpfCns').value,
        cep: document.getElementById('editarCep').value,
        data_nascimento: document.getElementById('editarNascimento').value,
    };
    
    // Etapa 2: Verificar duplicidade
    try {
        const data = await api.verificarExistencia(
            dadosParaSalvar.email,
            dadosParaSalvar.cpf_cns,
            usuarioAtual.id
        );

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

        // Etapa 3: Decidir fluxo
        const emailAlterado = dadosParaSalvar.email.toLowerCase() !== usuarioAtual.email.toLowerCase();
        if (emailAlterado) {
            iniciarFluxoVerificacaoEdicao();
        } else {
            salvarPerfil(false); // Salva direto, sem código
        }

    } catch (err) {
        document.getElementById('erroEditarNome').textContent = "Erro de conexão ao verificar dados.";
    }
}

/**
 * Salva o perfil do usuário (com ou sem verificação).
 * @param {boolean} comVerificacao
 * @param {string|null} [codigo=null]
 */
async function salvarPerfil(comVerificacao, codigo = null) {
    const id = usuarioAtual.id;
    let body = { ...dadosParaSalvar };

    try {
        let resposta;
        if (comVerificacao) {
            body.codigoVerificacao = codigo;
            resposta = await api.atualizarUsuarioComVerificacao(id, body);
        } else {
            resposta = await api.atualizarUsuario(id, body);
        }
        
        if (resposta.success) {
            usuarioAtual = { ...usuarioAtual, ...dadosParaSalvar };
            salvarUsuarioSession(usuarioAtual);
            
            fecharTodosModais();
            renderizarPerfil(); // Re-renderiza a aba de perfil
            
            // Atualiza a sidebar também
            document.getElementById('userInfoSidebar').innerHTML = `<p class="font-semibold text-gray-800">${usuarioAtual.nome}</p><p class="text-gray-600">${usuarioAtual.email}</p>`;
            
            exibirToast('Perfil atualizado com sucesso!');
        }
    } catch (error) {
         if (error.status === 409) { 
            fecharTodosModais();
            modalEditarPerfil.classList.add('ativo');
            const campo = error.data.field === 'email' ? 'editarEmail' : 'editarCpfCns';
            const erroEl = error.data.field === 'email' ? 'erroEditarEmail' : 'erroEditarCpfCns';
            document.getElementById(campo).classList.add('input-error');
            document.getElementById(erroEl).textContent = `Este ${error.data.field} já está cadastrado.`;
         } else if (error.status === 400 && comVerificacao) { 
            exibirMensagemNoModal(document.getElementById('mensagemVerificacaoEdicao'), error.message, true);
         } else {
            document.getElementById('erroEditarNome').textContent = `Erro: ${error.message || 'Ocorreu um erro.'}`;
         }
    }
}

/**
 * Inicia o fluxo de verificação de e-mail para edição de perfil.
 */
async function iniciarFluxoVerificacaoEdicao() {
    fecharTodosModais();
    modalVerificacaoEmailEdicao.classList.add('ativo');
    document.getElementById('emailParaVerificarEdicao').textContent = dadosParaSalvar.email;
    const msgEl = document.getElementById('mensagemVerificacaoEdicao');
    exibirMensagemNoModal(msgEl, 'Enviando código...', false);

    const reenviarBtn = document.getElementById('btnReenviarCodigoEdicao');
    reenviarBtn.disabled = true;

    try {
        await api.enviarCodigoVerificacao(dadosParaSalvar.email, 'alteracao');
        msgEl.style.display = 'none';
        
        const timerEl = document.getElementById('timerEdicao');
        const reenviarBtn = document.getElementById('btnReenviarCodigoEdicao');
        timerInterval = iniciarTimer(120, timerEl, reenviarBtn);
    } catch (e) {
        exibirMensagemNoModal(msgEl, e.message || 'Falha ao enviar o código.', true);

        reenviarBtn.disabled = false;
    }
}

/**
 * Handler para o submit do formulário de verificação de código.
 */
function onFormularioVerificacaoEdicaoSubmit(e) {
    e.preventDefault();
    const codigo = document.getElementById('codigoVerificacaoEdicao').value;
    if (codigo.length !== 6) {
        exibirMensagemNoModal(document.getElementById('mensagemVerificacaoEdicao'), 'Insira o código de 6 dígitos.', true);
        return;
    }
    salvarPerfil(true, codigo);
}

/**
 * Abre o modal para redefinir a senha (estando logado).
 */
function abrirModalRedefinirSenha() {
    const form = document.getElementById('formularioRedefinirSenha');
    form.reset();
    limparErrosFormulario('formularioRedefinirSenha');
    
    document.getElementById('passo1Redefinir').style.display = 'block';
    document.getElementById('passo2Redefinir').style.display = 'none';
    form.querySelector('button[type="submit"]').textContent = 'Avançar';
    
    modalRedefinirSenha.classList.add('ativo');
}

/**
 * Valida o primeiro passo da redefinição de senha (nova senha e confirmação).
 * @returns {boolean}
 */
function validarPrimeiroPassoSenha() {
    let isValid = true;
    const novaSenhaInput = document.getElementById('redefinirNovaSenha');
    const confirmarSenhaInput = document.getElementById('redefinirConfirmarNovaSenha');
    const erroNovaSenha = document.getElementById('erroRedefinirNovaSenha');
    const erroConfirmarSenha = document.getElementById('erroRedefinirConfirmarNovaSenha');

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
}

/**
 * Handler para o submit do formulário de redefinição de senha.
 */
async function onFormularioRedefinirSenhaSubmit(e) {
    e.preventDefault();
    const passo1Visivel = document.getElementById('passo1Redefinir').style.display !== 'none';
    
    if (passo1Visivel) {
        if (validarPrimeiroPassoSenha()) {
            novaSenhaTemporaria = document.getElementById('redefinirNovaSenha').value;
            document.getElementById('passo1Redefinir').style.display = 'none';
            document.getElementById('passo2Redefinir').style.display = 'block';
            e.target.querySelector('button[type="submit"]').textContent = 'Redefinir Senha';
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
            await api.redefinirSenhaLogado(usuarioAtual.id, senhaAtualInput.value, novaSenhaTemporaria);
            fecharTodosModais();
            exibirToast('Senha alterada com sucesso!');
        } catch(err) {
            senhaAtualInput.classList.add('input-error');
            erroSenhaAtual.textContent = err.message || 'Erro ao redefinir senha.';
        }
    }
}

/**
 * Handler para o submit do formulário de confirmação de senha do usuário.
 */
async function onFormularioConfirmarSenhaUsuarioSubmit(e) {
    e.preventDefault();
    const senhaInput = document.getElementById('senhaUsuarioConfirm');
    const erroSenhaEl = document.getElementById('erroSenhaConfirm');
    erroSenhaEl.textContent = '';

    try {
        await api.verificarSenha(usuarioAtual.id, senhaInput.value);
        
        // Senha correta, executa a ação pendente
        if (typeof acaoAposConfirmarSenha === 'function') {
            await acaoAposConfirmarSenha();
            acaoAposConfirmarSenha = null; // Reseta a ação
        }
    } catch(err) {
        erroSenhaEl.textContent = err.message || 'Senha incorreta.';
    }
}

/**
 * Desativa a própria conta.
 */
async function desativarPropriaConta() {
    try {
        await api.alterarStatusUsuario(usuarioAtual.id, false);
        fecharTodosModais();
        exibirToast('Conta desativada. Você será desconectado.');
        setTimeout(fazerLogout, 500);
    } catch (e) {
        alert('Erro ao desativar a conta.');
    }
}

/**
 * Exclui a própria conta.
 */
async function excluirPropriaConta() {
    try {
        await api.excluirUsuario(usuarioAtual.id);
        fecharTodosModais();
        exibirToast('Conta excluída com sucesso. Você será desconectado.');
        setTimeout(fazerLogout, 500);
    } catch (e) {
        alert('Erro ao excluir a conta.');
    }
}


/**
 * Inicializa o módulo de perfil do usuário.
 * @param {object} usuarioLogado
 */
export function initUsuarioPerfil(usuarioLogado) {
    usuarioAtual = usuarioLogado;

    // Mapeia elementos DOM
    modalEditarPerfil = document.getElementById('modalEditarPerfil');
    modalRedefinirSenha = document.getElementById('modalRedefinirSenha');
    modalVerificacaoEmailEdicao = document.getElementById('modalVerificacaoEmailEdicao');
    modalEscolhaAcaoConta = document.getElementById('modalEscolhaAcaoConta');
    modalConfirmarSenhaUsuario = document.getElementById('modalConfirmarSenhaUsuario');

    // Adiciona Listeners
    document.getElementById('formularioEditarPerfil').addEventListener('submit', onFormularioEditarPerfilSubmit);
    document.getElementById('formularioRedefinirSenha').addEventListener('submit', onFormularioRedefinirSenhaSubmit);
    document.getElementById('formularioVerificacaoEdicao').addEventListener('submit', onFormularioVerificacaoEdicaoSubmit);
    document.getElementById('formularioConfirmarSenhaUsuario').addEventListener('submit', onFormularioConfirmarSenhaUsuarioSubmit);

    // Listeners do CEP
    const cepEditarInput = document.getElementById('editarCep');
    cepEditarInput.addEventListener('input', () => formatarCep(cepEditarInput));
    cepEditarInput.addEventListener('blur', () => validarCep(cepEditarInput, document.getElementById('validacaoEditarCep')));
    cepEditarInput.addEventListener('focus', () => {
        document.getElementById('validacaoEditarCep').textContent = '';
        document.getElementById('validacaoEditarCep').className = 'validation-message';
        document.getElementById('erroEditarCep').textContent = '';
        cepEditarInput.classList.remove('input-success', 'input-error');
    });

    // Listeners de Reenviar Código
    document.getElementById('btnReenviarCodigoEdicao').addEventListener('click', () => {
        clearInterval(timerInterval);
        iniciarFluxoVerificacaoEdicao();
    });

    // Listeners de Gerenciamento de Conta
    document.querySelector('#modalEscolhaAcaoConta .btnCancelarAcaoConta').addEventListener('click', fecharTodosModais);
    
    document.getElementById('btnConfirmarEscolhaAcaoUsuario').addEventListener('click', () => {
        acaoGerenciarContaSelecionada = document.querySelector('input[name="usuarioAcaoConta"]:checked').value;
        
        if (acaoGerenciarContaSelecionada === 'desativar') {
            acaoAposConfirmarSenha = desativarPropriaConta;
        } else {
            acaoAposConfirmarSenha = excluirPropriaConta;
        }
        
        fecharTodosModais();
        document.getElementById('formularioConfirmarSenhaUsuario').reset();
        limparErrosFormulario('formularioConfirmarSenhaUsuario');
        modalConfirmarSenhaUsuario.classList.add('ativo');
    });

    // Renderiza o perfil inicial
    renderizarPerfil();
}
