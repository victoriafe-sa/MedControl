// frontend/scripts/admin/admin-farmaceuticos.js
import { api } from '../utils/api.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, abrirConfirmacao } from '../utils/ui.js';

// --- Seletores de Elementos ---
let modalFarmaceutico, formularioFarmaceutico, corpoTabelaFarmaceuticos;
let estaEditando = false;
let farmaceuticosListaCache = [];

/**
 * Renderiza a tabela de farmacêuticos com base no cache.
 */
function renderizarFarmaceuticos() {
    if (!corpoTabelaFarmaceuticos) return;

    // (Aqui poderia adicionar um filtro de busca se necessário)
    const farmaceuticosFiltrados = farmaceuticosListaCache;

    corpoTabelaFarmaceuticos.innerHTML = '';
    if (farmaceuticosFiltrados.length === 0) {
        corpoTabelaFarmaceuticos.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Nenhum farmacêutico encontrado.</td></tr>`;
        return;
    }

    farmaceuticosFiltrados.forEach(farm => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200`;
        tr.innerHTML = `
            <td class="p-4">${farm.nome}</td>
            <td class="p-4">${farm.crf}</td>
            <td class="p-4">${farm.especialidade || 'N/A'}</td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativo</span></td>
            <td class="p-4 flex space-x-2">
                <button class="btn-editar-farm btn-secundario py-1 px-3 rounded-lg text-sm" data-farm='${JSON.stringify(farm)}'>Editar</button>
                <button class="btn-excluir-farm btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${farm.id_farmaceutico}">Desativar</button>
            </td>
        `;
        corpoTabelaFarmaceuticos.appendChild(tr);
    });
}

/**
 * Busca os dados da API e atualiza o cache e a tabela.
 * (Exportada para ser chamada pelo Admin.js)
 */
export async function carregarFarmaceuticos() {
    if (!corpoTabelaFarmaceuticos) return;
    try {
        farmaceuticosListaCache = await api.listarFarmaceuticos();
        renderizarFarmaceuticos();
    } catch (erro) {
        corpoTabelaFarmaceuticos.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar farmacêuticos.'}</td></tr>`;
    }
}

/**
 * Abre o modal para adicionar ou editar um farmacêutico.
 * @param {object | null} farm - O objeto do farmacêutico para editar, ou null para adicionar.
 */
function abrirModalFarmaceutico(farm = null) {
    limparErrosFormulario('formularioFarmaceutico');
    formularioFarmaceutico.reset(); 
    
    if (farm) {
        estaEditando = true;
        document.getElementById('tituloModalFarmaceutico').textContent = 'Editar Farmacêutico';
        document.getElementById('idFarmaceuticoForm').value = farm.id_farmaceutico;
        document.getElementById('farmNome').value = farm.nome;
        document.getElementById('farmCrf').value = farm.crf;
        document.getElementById('farmEspecialidade').value = farm.especialidade;
    } else {
        estaEditando = false;
        document.getElementById('tituloModalFarmaceutico').textContent = 'Adicionar Farmacêutico';
        document.getElementById('idFarmaceuticoForm').value = '';
    }
    modalFarmaceutico.classList.add('ativo');
}

/**
 * Valida o formulário de farmacêutico.
 * @returns {boolean} - True se for válido.
 */
function validarFormulario() {
    limparErrosFormulario('formularioFarmaceutico');
    let camposValidos = true;
    const nomeInput = document.getElementById('farmNome');
    const crfInput = document.getElementById('farmCrf');
    
    if (!nomeInput.value.trim()) {
        nomeInput.classList.add('input-error');
        document.getElementById('erroFarmNome').textContent = 'O nome é obrigatório.';
        camposValidos = false;
    }
    if (!crfInput.value.trim()) {
        crfInput.classList.add('input-error');
        document.getElementById('erroFarmCrf').textContent = 'O CRF é obrigatório.';
        camposValidos = false;
    }
    return camposValidos;
}

/**
 * Handler para salvar (criar/atualizar) um farmacêutico.
 * @param {Event} e
 */
async function salvarFarmaceutico(e) {
    e.preventDefault();
    
    if (!validarFormulario()) {
        exibirToast('Verifique os campos obrigatórios.', true);
        return;
    }
    
    const id = document.getElementById('idFarmaceuticoForm').value;
    const dados = {
        nome: document.getElementById('farmNome').value,
        crf: document.getElementById('farmCrf').value,
        especialidade: document.getElementById('farmEspecialidade').value,
    };

    try {
        if (estaEditando) {
            await api.atualizarFarmaceutico(id, dados);
            exibirToast('Farmacêutico atualizado com sucesso!');
        } else {
            await api.cadastrarFarmaceutico(dados);
            exibirToast('Farmacêutico cadastrado com sucesso!');
        }
        fecharTodosModais();
        carregarFarmaceuticos(); // Recarrega a lista
    } catch (erro) {
        exibirToast(`Erro ao salvar: ${erro.message}`, true);
    }
}

/**
 * Handler para desativar um farmacêutico.
 * @param {string|number} id
 */
async function excluirFarmaceutico(id) {
    abrirConfirmacao(
        'Desativar Farmacêutico',
        'Você tem certeza que deseja desativar este farmacêutico?',
        async () => {
            try {
                await api.excluirFarmaceutico(id);
                exibirToast('Farmacêutico desativado com sucesso!');
                carregarFarmaceuticos(); // Recarrega a lista
            } catch (erro) {
                exibirToast(`Erro ao desativar: ${erro.message}`, true);
            }
        }
    );
}

/**
 * Inicializa o módulo de farmacêuticos.
 * (Exportada para ser chamada pelo Admin.js)
 * @param {object} usuarioLogado
 */
export function initAdminFarmaceuticos(usuarioLogado) {
    if (document.getElementById('corpoTabelaFarmaceuticos')?.dataset.initialized) return;

    modalFarmaceutico = document.getElementById('modalFarmaceutico');
    formularioFarmaceutico = document.getElementById('formularioFarmaceutico');
    corpoTabelaFarmaceuticos = document.getElementById('corpoTabelaFarmaceuticos');

    if (!modalFarmaceutico || !formularioFarmaceutico || !corpoTabelaFarmaceuticos) {
        console.error('Elementos da aba Farmacêuticos não encontrados.');
        return;
    }
    corpoTabelaFarmaceuticos.dataset.initialized = true;

    document.getElementById('abrirModalAdicionarFarmaceutico').addEventListener('click', () => abrirModalFarmaceutico(null));
    formularioFarmaceutico.addEventListener('submit', salvarFarmaceutico);

    corpoTabelaFarmaceuticos.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar-farm')) {
            abrirModalFarmaceutico(JSON.parse(e.target.dataset.farm));
        }
        if (e.target.classList.contains('btn-excluir-farm')) {
            excluirFarmaceutico(e.target.dataset.id);
        }
    });

    // (carregarFarmaceuticos() será chamado pelo Admin.js)
}