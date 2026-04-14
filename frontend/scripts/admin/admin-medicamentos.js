// frontend/scripts/admin/admin-medicamentos.js
import { api } from '../utils/api.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, abrirConfirmacao } from '../utils/ui.js';
import { formatarDataBR, formatarParaInputDate, popularSelect } from '../utils/formatadores.js';

// --- Caches de dados ---
let medicamentosCache = [];
let ubsCache = [];
let estoqueCache = [];

// --- Elementos DOM ---
let modalEstoque, formularioEstoque, modalMedicamentoBase, formularioMedicamentoBase;
let corpoTabelaEstoque, corpoTabelaMedicamentosBase;
let estoqueLoteInput, erroEstoqueLote;

// --- Estado de edição ---
let editandoEstoque = false;
let editandoMedBase = false;

// ============================================================
// ESTOQUE
// ============================================================

export async function carregarDadosMedicamentos() {
    if (!corpoTabelaEstoque) return;
    try {
        await Promise.all([carregarEstoque(), carregarDropdowns(), carregarMedicamentosBase()]);
    } catch (erro) {
        exibirToast(`Falha ao carregar dados: ${erro.message}`, true);
    }
}

async function carregarEstoque() {
    try {
        estoqueCache = await api.listarEstoque();
        renderizarEstoque();
    } catch (erro) {
        corpoTabelaEstoque.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar estoque.'}</td></tr>`;
    }
}

function renderizarEstoque() {
    if (!corpoTabelaEstoque) return;

    const filtroBusca = document.getElementById('buscaEstoque')?.value.toLowerCase() || '';
    const filtroUbsId = document.getElementById('filtroUbsEstoque')?.value || '';

    const estoqueFiltrado = estoqueCache.filter(item => {
        const matchBusca = filtroBusca === '' ||
            item.nome_comercial.toLowerCase().includes(filtroBusca) ||
            item.principio_ativo.toLowerCase().includes(filtroBusca) ||
            (item.lote && item.lote.toLowerCase().includes(filtroBusca));
        const matchUbs = filtroUbsId === '' || item.id_ubs.toString() === filtroUbsId;
        return matchBusca && matchUbs;
    });

    corpoTabelaEstoque.innerHTML = '';

    if (estoqueFiltrado.length === 0) {
        corpoTabelaEstoque.innerHTML = `<tr><td colspan="6" class="p-4 text-center">Nenhum item encontrado.</td></tr>`;
        return;
    }

    estoqueFiltrado.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200 ${item.quantidade === 0 ? 'bg-yellow-50 text-gray-600' : ''}`;
        tr.innerHTML = `
            <td class="p-4">${item.nome_comercial} (${item.principio_ativo})</td>
            <td class="p-4">${item.nome_ubs}</td>
            <td class="p-4 font-medium">${item.quantidade}</td>
            <td class="p-4">${item.lote}</td>
            <td class="p-4">${formatarDataBR(item.data_validade)}</td>
            <td class="p-4 flex space-x-2">
                <button class="btn-editar-estoque btn-secundario py-1 px-3 rounded-lg text-sm" data-item='${JSON.stringify(item)}'>Editar</button>
                <button class="btn-excluir-estoque btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${item.id_estoque}">Excluir</button>
            </td>
        `;
        corpoTabelaEstoque.appendChild(tr);
    });
}

async function carregarDropdowns() {
    try {
        const [medicamentos, ubs] = await Promise.all([api.listarMedicamentos(), api.listarUbs()]);
        medicamentosCache = medicamentos;
        ubsCache = ubs;
        const ativos = medicamentos.filter(m => m.ativo);
        popularSelect('estoqueSelectMed', ativos, 'id_medicamento', 'nome_comercial');
        popularSelect('estoqueSelectUbs', ubsCache, 'id_ubs', 'nome');
        popularSelect('filtroUbsEstoque', ubsCache, 'id_ubs', 'nome');
    } catch (erro) {
        exibirToast(`Erro ao carregar listas: ${erro.message}`, true);
    }
}

function abrirModalEstoque(item = null) {
    limparErrosFormulario('formularioEstoque');
    if (erroEstoqueLote) erroEstoqueLote.textContent = '';
    if (estoqueLoteInput) estoqueLoteInput.classList.remove('input-error');

    if (item) {
        editandoEstoque = true;
        document.getElementById('tituloModalEstoque').textContent = 'Editar Item do Estoque';
        document.getElementById('idEstoqueForm').value = item.id_estoque;
        document.getElementById('estoqueSelectMed').value = item.id_medicamento;
        document.getElementById('estoqueSelectUbs').value = item.id_ubs;
        document.getElementById('estoqueQuantidade').value = item.quantidade;
        document.getElementById('estoqueLote').value = item.lote;
        document.getElementById('estoqueDataValidade').value = formatarParaInputDate(item.data_validade);
    } else {
        editandoEstoque = false;
        document.getElementById('tituloModalEstoque').textContent = 'Adicionar ao Estoque';
        formularioEstoque.reset();
        document.getElementById('idEstoqueForm').value = '';
    }
    modalEstoque.classList.add('ativo');
}

async function validarLote() {
    const lote = estoqueLoteInput.value.trim();
    const idUbs = document.getElementById('estoqueSelectUbs').value;
    const idMedicamento = document.getElementById('estoqueSelectMed').value;
    const idEstoque = document.getElementById('idEstoqueForm').value || null;

    if (!lote || !idUbs || !idMedicamento) {
        erroEstoqueLote.textContent = '';
        estoqueLoteInput.classList.remove('input-error');
        return true;
    }

    try {
        const resposta = await api.verificarLote({
            id_ubs: parseInt(idUbs),
            id_medicamento: parseInt(idMedicamento),
            lote,
            id_estoque_excluir: idEstoque ? parseInt(idEstoque) : null
        });
        if (resposta.existe) {
            erroEstoqueLote.textContent = 'Este lote já está cadastrado para este medicamento nesta UBS.';
            estoqueLoteInput.classList.add('input-error');
            return false;
        }
        erroEstoqueLote.textContent = '';
        estoqueLoteInput.classList.remove('input-error');
        return true;
    } catch (erro) {
        erroEstoqueLote.textContent = 'Erro ao verificar o lote.';
        estoqueLoteInput.classList.add('input-error');
        return false;
    }
}

async function salvarEstoque(e) {
    e.preventDefault();
    limparErrosFormulario('formularioEstoque');
    if (erroEstoqueLote) erroEstoqueLote.textContent = '';
    if (estoqueLoteInput) estoqueLoteInput.classList.remove('input-error');

    const loteValido = await validarLote();
    const dados = {
        id_medicamento: document.getElementById('estoqueSelectMed').value,
        id_ubs: document.getElementById('estoqueSelectUbs').value,
        quantidade: document.getElementById('estoqueQuantidade').value,
        lote: document.getElementById('estoqueLote').value,
        data_validade: document.getElementById('estoqueDataValidade').value
    };

    let formularioValido = true;
    const validacoes = [
        { valor: dados.id_medicamento, erroId: 'erroEstoqueSelectMed', msg: 'Selecione um medicamento.' },
        { valor: dados.id_ubs, erroId: 'erroEstoqueSelectUbs', msg: 'Selecione uma UBS.' },
        { valor: dados.quantidade, erroId: 'erroEstoqueQuantidade', msg: 'Informe a quantidade.' },
        { valor: dados.lote, erroId: 'erroEstoqueLote', msg: 'Informe o lote.' },
        { valor: dados.data_validade, erroId: 'erroEstoqueDataValidade', msg: 'Informe a validade.' },
    ];
    validacoes.forEach(({ valor, erroId, msg }) => {
        if (!valor) { document.getElementById(erroId).textContent = msg; formularioValido = false; }
    });
    if (!formularioValido || !loteValido) { exibirToast('Verifique os erros no formulário.', true); return; }

    const id = document.getElementById('idEstoqueForm').value;
    try {
        if (editandoEstoque) { await api.atualizarEstoque(id, dados); exibirToast('Estoque atualizado com sucesso!'); }
        else { await api.cadastrarEstoque(dados); exibirToast('Estoque cadastrado com sucesso!'); }
        fecharTodosModais();
        carregarEstoque();
    } catch (erro) {
        if (erro.status === 409) {
            erroEstoqueLote.textContent = 'Este lote já está cadastrado para este medicamento nesta UBS.';
            estoqueLoteInput.classList.add('input-error');
            exibirToast(erro.message || 'Lote já cadastrado.', true);
        } else {
            exibirToast(`Erro ao salvar estoque: ${erro.message}`, true);
        }
    }
}

async function excluirEstoque(id) {
    abrirConfirmacao('Excluir Item do Estoque', 'Tem certeza que deseja excluir este item? Esta ação é permanente.', async () => {
        try { await api.excluirEstoque(id); exibirToast('Item excluído do estoque!'); carregarEstoque(); }
        catch (erro) { exibirToast(`Erro ao excluir item: ${erro.message}`, true); }
    });
}

// ============================================================
// MEDICAMENTO BASE
// ============================================================

async function carregarMedicamentosBase() {
    try { medicamentosCache = await api.listarMedicamentos(); renderizarMedicamentosBase(); }
    catch (erro) { corpoTabelaMedicamentosBase.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar medicamentos.'}</td></tr>`; }
}

function renderizarMedicamentosBase() {
    if (!corpoTabelaMedicamentosBase) return;
    const filtroNome = document.getElementById('buscaMedBase')?.value.toLowerCase() || '';
    const filtrados = medicamentosCache.filter(med =>
        med.nome_comercial.toLowerCase().includes(filtroNome) || med.principio_ativo.toLowerCase().includes(filtroNome)
    );
    corpoTabelaMedicamentosBase.innerHTML = '';
    if (filtrados.length === 0) {
        corpoTabelaMedicamentosBase.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Nenhum medicamento encontrado.</td></tr>`;
        return;
    }
    filtrados.forEach(med => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200 ${!med.ativo ? 'bg-red-50 text-gray-500' : ''}`;
        const btnStatus = med.ativo
            ? `<button class="btn-status-med-base btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${med.id_medicamento}" data-status="false">Desativar</button>`
            : `<button class="btn-status-med-base btn-sucesso py-1 px-3 rounded-lg text-sm" data-id="${med.id_medicamento}" data-status="true">Ativar</button>`;
        tr.innerHTML = `
            <td class="p-4">${med.nome_comercial}</td>
            <td class="p-4">${med.principio_ativo}</td>
            <td class="p-4">${med.controlado ? 'Sim' : 'Não'}</td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${med.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${med.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td class="p-4 flex space-x-2">
                <button class="btn-editar-med-base btn-secundario py-1 px-3 rounded-lg text-sm" data-med='${JSON.stringify(med)}'>Editar</button>
                ${btnStatus}
            </td>
        `;
        corpoTabelaMedicamentosBase.appendChild(tr);
    });
}

function abrirModalMedicamentoBase(med = null) {
    limparErrosFormulario('formularioMedicamentoBase');
    const btnSalvar = document.getElementById('btnSalvarMedBase');
    const btnCancelar = document.getElementById('btnCancelarEdicaoMedBase');
    const titulo = document.getElementById('tituloFormularioMedBase');

    if (med) {
        editandoMedBase = true;
        titulo.textContent = 'Editar Medicamento';
        btnSalvar.textContent = 'Salvar Alterações';
        btnCancelar.style.display = 'block';
        document.getElementById('idMedBaseForm').value = med.id_medicamento;
        document.getElementById('medBaseNome').value = med.nome_comercial;
        document.getElementById('medBasePrincipio').value = med.principio_ativo;
        document.getElementById('medBaseConcentracao').value = med.concentracao;
        document.getElementById('medBaseApresentacao').value = med.apresentacao;
        document.getElementById('medBaseVia').value = med.via_administracao;
        document.getElementById('medBaseControlado').checked = med.controlado;
    } else {
        editandoMedBase = false;
        titulo.textContent = 'Adicionar Novo Medicamento';
        btnSalvar.textContent = 'Adicionar à Lista';
        btnCancelar.style.display = 'none';
        formularioMedicamentoBase.reset();
        document.getElementById('idMedBaseForm').value = '';
    }
    modalMedicamentoBase.classList.add('ativo');
}

function cancelarEdicaoMedBase() {
    editandoMedBase = false;
    document.getElementById('tituloFormularioMedBase').textContent = 'Adicionar Novo Medicamento';
    document.getElementById('btnSalvarMedBase').textContent = 'Adicionar à Lista';
    document.getElementById('btnCancelarEdicaoMedBase').style.display = 'none';
    formularioMedicamentoBase.reset();
    document.getElementById('idMedBaseForm').value = '';
}

async function salvarMedicamentoBase(e) {
    e.preventDefault();
    const id = document.getElementById('idMedBaseForm').value;
    const dados = {
        nome_comercial: document.getElementById('medBaseNome').value,
        principio_ativo: document.getElementById('medBasePrincipio').value,
        concentracao: document.getElementById('medBaseConcentracao').value,
        apresentacao: document.getElementById('medBaseApresentacao').value,
        via_administracao: document.getElementById('medBaseVia').value,
        controlado: document.getElementById('medBaseControlado').checked
    };
    if (!dados.nome_comercial || !dados.principio_ativo) {
        exibirToast('Nome comercial e Princípio ativo são obrigatórios.', true);
        return;
    }
    try {
        if (editandoMedBase) { await api.atualizarMedicamento(id, dados); exibirToast('Medicamento atualizado com sucesso!'); }
        else { await api.cadastrarMedicamento(dados); exibirToast('Medicamento base cadastrado!'); }
        cancelarEdicaoMedBase();
        await carregarDropdowns();
        await carregarMedicamentosBase();
    } catch (erro) { exibirToast(`Erro ao salvar: ${erro.message}`, true); }
}

async function toggleStatusMedicamentoBase(id, novoStatus) {
    const acao = novoStatus ? 'ativar' : 'desativar';
    const participio = novoStatus ? 'ativado' : 'desativado';
    let mensagem = `Tem certeza que deseja ${acao} este medicamento base?`;
    if (!novoStatus) mensagem += ' Isso removerá todos os itens deste medicamento do estoque.';

    abrirConfirmacao(`${novoStatus ? 'Ativar' : 'Desativar'} Medicamento`, mensagem, async () => {
        try {
            await api.alterarStatusMedicamento(id, novoStatus);
            exibirToast(`Medicamento ${participio} com sucesso!`);
            await carregarDropdowns();
            await carregarMedicamentosBase();
            await carregarEstoque();
        } catch (erro) { exibirToast(`Erro ao ${acao}: ${erro.message}`, true); }
    }, novoStatus ? 'primario' : 'perigo');
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

export function initAdminMedicamentos(usuarioLogado) {
    if (document.getElementById('corpoTabelaEstoque')?.dataset.initialized) return;

    modalEstoque = document.getElementById('modalEstoque');
    formularioEstoque = document.getElementById('formularioEstoque');
    corpoTabelaEstoque = document.getElementById('corpoTabelaEstoque');
    modalMedicamentoBase = document.getElementById('modalMedicamentoBase');
    formularioMedicamentoBase = document.getElementById('formularioMedicamentoBase');
    corpoTabelaMedicamentosBase = document.getElementById('corpoTabelaMedicamentosBase');
    estoqueLoteInput = document.getElementById('estoqueLote');
    erroEstoqueLote = document.getElementById('erroEstoqueLote');

    if (!modalEstoque || !corpoTabelaEstoque || !modalMedicamentoBase) {
        console.error('Elementos da aba Medicamentos não encontrados.');
        return;
    }
    corpoTabelaEstoque.dataset.initialized = true;

    const btnGerenciar = document.getElementById('abrirModalGerenciarMedicamentos');
    if (usuarioLogado.perfil === 'gestor_ubs' && btnGerenciar) btnGerenciar.style.display = 'none';

    document.getElementById('abrirModalAdicionarEstoque').addEventListener('click', () => abrirModalEstoque(null));
    if (btnGerenciar) {
        btnGerenciar.addEventListener('click', () => {
            cancelarEdicaoMedBase();
            carregarMedicamentosBase();
            modalMedicamentoBase.classList.add('ativo');
        });
    }

    formularioEstoque.addEventListener('submit', salvarEstoque);
    formularioMedicamentoBase.addEventListener('submit', salvarMedicamentoBase);
    document.getElementById('btnCancelarEdicaoMedBase').addEventListener('click', cancelarEdicaoMedBase);
    if (estoqueLoteInput) estoqueLoteInput.addEventListener('blur', validarLote);

    corpoTabelaEstoque.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar-estoque')) abrirModalEstoque(JSON.parse(e.target.dataset.item));
        if (e.target.classList.contains('btn-excluir-estoque')) excluirEstoque(e.target.dataset.id);
    });
    corpoTabelaMedicamentosBase.addEventListener('click', (e) => {
        const t = e.target;
        if (t.classList.contains('btn-status-med-base')) toggleStatusMedicamentoBase(t.dataset.id, t.dataset.status === 'true');
        if (t.classList.contains('btn-editar-med-base')) abrirModalMedicamentoBase(JSON.parse(t.dataset.med));
    });

    document.getElementById('buscaMedBase').addEventListener('input', renderizarMedicamentosBase);
    document.getElementById('buscaEstoque').addEventListener('input', renderizarEstoque);
    document.getElementById('filtroUbsEstoque').addEventListener('change', renderizarEstoque);
}
