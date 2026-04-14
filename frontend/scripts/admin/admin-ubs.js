// frontend/scripts/admin/admin-ubs.js
import { api } from '../utils/api.js';
import { formatarCep, validarCep, preencherValidacaoCep, configurarCamposCep } from '../utils/cep.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, abrirConfirmacao } from '../utils/ui.js';
import { formatarDataBR } from '../utils/formatadores.js';

// --- Elementos DOM ---
let modalUbs, formularioUbs, corpoTabelaUbs, ubsCepInput, ubsCepValidacao, ubsCepErro;
let modalDetalhesUbs;
let editando = false;
let ubsCache = [];

function renderizarUbs() {
    if (!corpoTabelaUbs) return;
    const filtroBusca = document.getElementById('buscaUbs')?.value.toLowerCase() || '';

    const ubsFiltrada = ubsCache.filter(ubs =>
        filtroBusca === '' ||
        ubs.nome.toLowerCase().includes(filtroBusca) ||
        ubs.endereco.toLowerCase().includes(filtroBusca) ||
        (ubs.telefone && ubs.telefone.toLowerCase().includes(filtroBusca))
    );

    corpoTabelaUbs.innerHTML = '';
    if (ubsFiltrada.length === 0) {
        corpoTabelaUbs.innerHTML = `<tr><td colspan="8" class="p-4 text-center">Nenhuma UBS encontrada.</td></tr>`;
        return;
    }

    ubsFiltrada.forEach(ubs => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-200';
        tr.innerHTML = `
            <td class="p-4">${ubs.nome}</td>
            <td class="p-4">${ubs.endereco}</td>
            <td class="p-4">${ubs.telefone || 'N/A'}</td>
            <td class="p-4">${ubs.horario_funcionamento || 'N/A'}</td>
            <td class="p-4">${ubs.cep || 'N/A'}</td>
            <td class="p-4 text-xs">Lat: ${ubs.latitude || 'N/A'}<br>Lon: ${ubs.longitude || 'N/A'}</td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativa</span></td>
            <td class="p-4 flex space-x-2">
                <button class="btn-detalhes-ubs btn-primario py-1 px-3 rounded-lg text-sm" data-ubs='${JSON.stringify(ubs)}'>Detalhes</button>
                <button class="btn-editar-ubs btn-secundario py-1 px-3 rounded-lg text-sm" data-ubs='${JSON.stringify(ubs)}'>Editar</button>
                <button class="btn-excluir-ubs btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${ubs.id_ubs}">Desativar</button>
            </td>
        `;
        corpoTabelaUbs.appendChild(tr);
    });
}

export async function carregarUbs() {
    if (!corpoTabelaUbs) return;
    try {
        ubsCache = await api.listarUbs();
        renderizarUbs();
    } catch (erro) {
        corpoTabelaUbs.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar UBS.'}</td></tr>`;
    }
}

function abrirModalUbs(ubs = null) {
    limparErrosFormulario('formularioUbs');
    formularioUbs.reset();
    preencherValidacaoCep(ubsCepInput, ubsCepValidacao, ubs ? ubs.cep : null);

    if (ubs) {
        editando = true;
        document.getElementById('tituloModalUbs').textContent = 'Editar UBS';
        document.getElementById('idUbsForm').value = ubs.id_ubs;
        document.getElementById('ubsNome').value = ubs.nome;
        document.getElementById('ubsEndereco').value = ubs.endereco;
        document.getElementById('ubsTelefone').value = ubs.telefone;
        document.getElementById('ubsHorario').value = ubs.horario_funcionamento;
        document.getElementById('ubsCep').value = ubs.cep;
        document.getElementById('ubsLatitude').value = ubs.latitude;
        document.getElementById('ubsLongitude').value = ubs.longitude;
    } else {
        editando = false;
        document.getElementById('tituloModalUbs').textContent = 'Adicionar UBS';
        document.getElementById('idUbsForm').value = '';
    }
    modalUbs.classList.add('ativo');
}

async function abrirModalDetalhesUbs(ubs) {
    modalDetalhesUbs.classList.add('ativo');

    document.getElementById('detalhesUbsTitulo').textContent = `Detalhes: ${ubs.nome}`;
    document.getElementById('detalhesUbsNome').textContent = ubs.nome;
    document.getElementById('detalhesUbsTelefone').textContent = ubs.telefone || 'N/A';
    document.getElementById('detalhesUbsEndereco').textContent = ubs.endereco;
    document.getElementById('detalhesUbsCep').textContent = ubs.cep || 'N/A';
    document.getElementById('detalhesUbsHorario').textContent = ubs.horario_funcionamento || 'N/A';
    document.getElementById('detalhesUbsLat').textContent = ubs.latitude || 'N/A';
    document.getElementById('detalhesUbsLon').textContent = ubs.longitude || 'N/A';

    // Clona botões para evitar acúmulo de listeners
    const btnEditar = document.getElementById('detalhesUbsBtnEditar');
    const btnExcluir = document.getElementById('detalhesUbsBtnExcluir');
    const cloneEditar = btnEditar.cloneNode(true);
    const cloneExcluir = btnExcluir.cloneNode(true);
    btnEditar.parentNode.replaceChild(cloneEditar, btnEditar);
    btnExcluir.parentNode.replaceChild(cloneExcluir, btnExcluir);
    cloneEditar.addEventListener('click', () => { fecharTodosModais(); abrirModalUbs(ubs); });
    cloneExcluir.addEventListener('click', () => { fecharTodosModais(); excluirUbs(ubs.id_ubs); });

    // Carrega estoque da UBS
    const corpoEstoque = document.getElementById('detalhesUbsEstoque');
    corpoEstoque.innerHTML = `<tr><td colspan="5" class="p-3 text-center">Carregando estoque...</td></tr>`;

    try {
        const todoEstoque = await api.listarEstoque();
        const estoqueDaUbs = todoEstoque.filter(item => item.id_ubs === ubs.id_ubs);

        if (estoqueDaUbs.length === 0) {
            corpoEstoque.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-gray-500">Nenhum medicamento no estoque desta UBS.</td></tr>`;
            return;
        }

        corpoEstoque.innerHTML = '';
        estoqueDaUbs.forEach(item => {
            corpoEstoque.innerHTML += `
                <tr class="border-b">
                    <td class="p-3 text-sm">${item.nome_comercial}</td>
                    <td class="p-3 text-sm text-gray-600">${item.principio_ativo}</td>
                    <td class="p-3 text-sm">${item.lote}</td>
                    <td class="p-3 text-sm font-medium">${item.quantidade}</td>
                    <td class="p-3 text-sm">${formatarDataBR(item.data_validade)}</td>
                </tr>
            `;
        });
    } catch (erro) {
        corpoEstoque.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-red-500">Erro ao carregar estoque.</td></tr>`;
    }
}

async function salvarUbs(e) {
    e.preventDefault();
    limparErrosFormulario('formularioUbs');

    let formularioValido = true;
    const nomeInput = document.getElementById('ubsNome');
    const enderecoInput = document.getElementById('ubsEndereco');

    if (!nomeInput.value.trim()) {
        nomeInput.classList.add('input-error');
        document.getElementById('erroUbsNome').textContent = 'O nome é obrigatório.';
        formularioValido = false;
    }
    if (!enderecoInput.value.trim()) {
        enderecoInput.classList.add('input-error');
        document.getElementById('erroUbsEndereco').textContent = 'O endereço é obrigatório.';
        formularioValido = false;
    }
    if (ubsCepInput.value && !ubsCepInput.classList.contains('input-success')) {
        ubsCepErro.textContent = 'Por favor, valide um CEP válido.';
        formularioValido = false;
    }
    if (!formularioValido) { exibirToast('Verifique os campos obrigatórios.', true); return; }

    const id = document.getElementById('idUbsForm').value;
    const dados = {
        nome: document.getElementById('ubsNome').value,
        endereco: document.getElementById('ubsEndereco').value,
        telefone: document.getElementById('ubsTelefone').value,
        horario_funcionamento: document.getElementById('ubsHorario').value,
        cep: document.getElementById('ubsCep').value,
        latitude: document.getElementById('ubsLatitude').value || null,
        longitude: document.getElementById('ubsLongitude').value || null,
    };

    try {
        if (editando) { await api.atualizarUbs(id, dados); exibirToast('UBS atualizada com sucesso!'); }
        else { await api.cadastrarUbs(dados); exibirToast('UBS cadastrada com sucesso!'); }
        fecharTodosModais();
        carregarUbs();
    } catch (erro) {
        exibirToast(`Erro ao salvar UBS: ${erro.message}`, true);
    }
}

async function excluirUbs(id) {
    abrirConfirmacao('Desativar UBS', 'Você tem certeza que deseja desativar esta UBS? Esta ação não poderá ser desfeita.', async () => {
        try { await api.excluirUbs(id); exibirToast('UBS desativada com sucesso!'); carregarUbs(); }
        catch (erro) { exibirToast(`Erro ao desativar UBS: ${erro.message}`, true); }
    });
}

export function initAdminUbs() {
    if (document.getElementById('corpoTabelaUbs')?.dataset.initialized) return;

    modalUbs = document.getElementById('modalUbs');
    formularioUbs = document.getElementById('formularioUbs');
    corpoTabelaUbs = document.getElementById('corpoTabelaUbs');
    modalDetalhesUbs = document.getElementById('modalDetalhesUbs');
    ubsCepInput = document.getElementById('ubsCep');
    ubsCepValidacao = document.getElementById('validacaoUbsCep');
    ubsCepErro = document.getElementById('erroUbsCep');

    if (!modalUbs || !formularioUbs || !corpoTabelaUbs || !ubsCepInput || !modalDetalhesUbs) {
        console.error('Elementos da aba UBS não encontrados.');
        return;
    }
    corpoTabelaUbs.dataset.initialized = true;

    document.getElementById('abrirModalAdicionarUbs').addEventListener('click', () => abrirModalUbs(null));
    formularioUbs.addEventListener('submit', salvarUbs);
    document.getElementById('buscaUbs').addEventListener('input', renderizarUbs);

    // Usa a função centralizada em vez de repetir 3 listeners
    configurarCamposCep(ubsCepInput, ubsCepValidacao, ubsCepErro);

    corpoTabelaUbs.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-detalhes-ubs')) abrirModalDetalhesUbs(JSON.parse(e.target.dataset.ubs));
        if (e.target.classList.contains('btn-editar-ubs')) abrirModalUbs(JSON.parse(e.target.dataset.ubs));
        if (e.target.classList.contains('btn-excluir-ubs')) excluirUbs(e.target.dataset.id);
    });
}
