// frontend/scripts/admin/admin-medicamentos.js
import { api } from '../utils/api.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, abrirConfirmacao } from '../utils/ui.js';

// Caches
let listaMedicamentosCache = [];
let listaUbsCache = [];
let listaEstoqueCache = [];

// Seletores Modais
let modalEstoque, formularioEstoque, modalMedicamentoBase, formularioMedicamentoBase;

// Seletores Tabelas
let corpoTabelaEstoque, corpoTabelaMedicamentosBase;

// Seletores para validação de lote
let estoqueLoteInput, erroEstoqueLote;

// Variáveis de estado para edição
let estaEditandoEstoque = false;
let estaEditandoMedBase = false;

// --- Funções Principais ---

// MODIFICADO: Função exportada para ser chamada pelo Admin.js
export async function carregarDadosMedicamentos() {
    if (!corpoTabelaEstoque) return; // Guarda
    try {
        await Promise.all([
            carregarEstoque(),
            carregarDropdowns(),
            carregarMedicamentosBase() // Adicionado para recarregar a tabela base
        ]);
    } catch (erro) {
        console.error("Erro ao carregar dados de medicamentos:", erro);
        exibirToast(`Falha ao carregar dados: ${erro.message}`, true);
    }
}

async function carregarEstoque() {
    try {
        listaEstoqueCache = await api.listarEstoque(); // Salva no cache
        renderizarEstoque(); // Renderiza
    } catch (erro) {
        corpoTabelaEstoque.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar estoque.'}</td></tr>`;
    }
}

function renderizarEstoque() {
    const filtroBusca = document.getElementById('buscaEstoque')?.value.toLowerCase() || '';
    const filtroUbsId = document.getElementById('filtroUbsEstoque')?.value || '';

    if (!corpoTabelaEstoque) return; // Guarda

    const estoqueFiltrado = listaEstoqueCache.filter(item => {
        const buscaMatch = filtroBusca === '' ||
            item.nome_comercial.toLowerCase().includes(filtroBusca) ||
            item.principio_ativo.toLowerCase().includes(filtroBusca) ||
            (item.lote && item.lote.toLowerCase().includes(filtroBusca)); // Verifica se lote existe

        const ubsMatch = filtroUbsId === '' ||
            item.id_ubs.toString() === filtroUbsId;

        return buscaMatch && ubsMatch;
    });

    corpoTabelaEstoque.innerHTML = '';
    if (estoqueFiltrado.length === 0) {
        corpoTabelaEstoque.innerHTML = `<tr><td colspan="6" class="p-4 text-center">Nenhum item encontrado.</td></tr>`;
        return;
    }

    estoqueFiltrado.forEach(item => {
        let dataValidade = 'Inválida';
        if (item.data_validade) {
            try {
                const dataObj = new Date(item.data_validade);
                dataValidade = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            } catch (e) {
                console.error("Erro ao formatar data:", item.data_validade, e);
            }
        }

        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200 ${item.quantidade === 0 ? 'bg-yellow-50 text-gray-600' : ''}`;
        tr.innerHTML = `
            <td class="p-4">${item.nome_comercial} (${item.principio_ativo})</td>
            <td class="p-4">${item.nome_ubs}</td>
            <td class="p-4 font-medium">${item.quantidade}</td>
            <td class="p-4">${item.lote}</td>
            <td class="p-4">${dataValidade}</td>
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
        const [medicamentos, ubs] = await Promise.all([
            api.listarMedicamentos(),
            api.listarUbs()
        ]);

        listaMedicamentosCache = medicamentos;
        const medicamentosAtivos = medicamentos.filter(m => m.ativo);
        listaUbsCache = ubs;

        popularSelect('estoqueSelectMed', medicamentosAtivos, 'id_medicamento', 'nome_comercial');
        popularSelect('estoqueSelectUbs', listaUbsCache, 'id_ubs', 'nome');
        popularSelect('filtroUbsEstoque', listaUbsCache, 'id_ubs', 'nome');

    } catch (erro) {
        exibirToast(`Erro ao carregar listas: ${erro.message}`, true);
    }
}

function popularSelect(selectId, lista, valorKey, textoKey) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const primeiroOption = select.querySelector('option');
    select.innerHTML = '';
    if (primeiroOption && primeiroOption.value === '') {
        select.appendChild(primeiroOption);
    } else {
        select.innerHTML = `<option value="">Selecione...</option>`;
    }

    lista.forEach(item => {
        select.innerHTML += `<option value="${item[valorKey]}">${item[textoKey]}</option>`;
    });
}

// --- Funções Modal Estoque ---

function abrirModalEstoque(item = null) {
    limparErrosFormulario('formularioEstoque');
    if (erroEstoqueLote) erroEstoqueLote.textContent = '';
    if (estoqueLoteInput) estoqueLoteInput.classList.remove('input-error');

    if (item) {
        estaEditandoEstoque = true;
        document.getElementById('tituloModalEstoque').textContent = 'Editar Item do Estoque';
        document.getElementById('idEstoqueForm').value = item.id_estoque;
        document.getElementById('estoqueSelectMed').value = item.id_medicamento;
        document.getElementById('estoqueSelectUbs').value = item.id_ubs;
        document.getElementById('estoqueQuantidade').value = item.quantidade;
        document.getElementById('estoqueLote').value = item.lote;

        if (item.data_validade) {
            try {
                const dataObj = new Date(item.data_validade);
                const ano = dataObj.getUTCFullYear();
                const mes = (dataObj.getUTCMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexado
                const dia = dataObj.getUTCDate().toString().padStart(2, '0');
                document.getElementById('estoqueDataValidade').value = `${ano}-${mes}-${dia}`;
            } catch (e) {
                console.error("Erro ao formatar data para o modal:", item.data_validade, e);
                document.getElementById('estoqueDataValidade').value = null;
            }
        } else {
            document.getElementById('estoqueDataValidade').value = null;
        }

    } else {
        estaEditandoEstoque = false;
        document.getElementById('tituloModalEstoque').textContent = 'Adicionar ao Estoque';
        formularioEstoque.reset();
        document.getElementById('idEstoqueForm').value = '';
    }
    modalEstoque.classList.add('ativo');
}

async function validarLote() {
    const lote = estoqueLoteInput.value.trim();
    const id_ubs = document.getElementById('estoqueSelectUbs').value;
    const id_medicamento = document.getElementById('estoqueSelectMed').value;
    const id_estoque = document.getElementById('idEstoqueForm').value || null; // 'null' se for novo

    if (!lote || !id_ubs || !id_medicamento) {
        erroEstoqueLote.textContent = '';
        estoqueLoteInput.classList.remove('input-error');
        return true; 
    }

    try {
        const dados = {
            id_ubs: parseInt(id_ubs),
            id_medicamento: parseInt(id_medicamento),
            lote,
            id_estoque_excluir: id_estoque ? parseInt(id_estoque) : null
        };
        const resposta = await api.verificarLote(dados);

        if (resposta.existe) {
            erroEstoqueLote.textContent = 'Este lote já está cadastrado para este medicamento nesta UBS.';
            estoqueLoteInput.classList.add('input-error');
            return false;
        } else {
            erroEstoqueLote.textContent = '';
            estoqueLoteInput.classList.remove('input-error');
            return true;
        }
    } catch (erro) {
        console.error("Erro ao validar lote:", erro);
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

    let camposValidos = true;
    if (!dados.id_medicamento) {
        document.getElementById('erroEstoqueSelectMed').textContent = 'Selecione um medicamento.';
        camposValidos = false;
    }
    if (!dados.id_ubs) {
        document.getElementById('erroEstoqueSelectUbs').textContent = 'Selecione uma UBS.';
        camposValidos = false;
    }
    if (!dados.quantidade) {
        document.getElementById('erroEstoqueQuantidade').textContent = 'Informe a quantidade.';
        camposValidos = false;
    }
    if (!dados.lote) {
        document.getElementById('erroEstoqueLote').textContent = 'Informe o lote.';
        camposValidos = false;
    }
    if (!dados.data_validade) {
        document.getElementById('erroEstoqueDataValidade').textContent = 'Informe a validade.';
        camposValidos = false;
    }

    if (!camposValidos || !loteValido) {
        exibirToast("Verifique os erros no formulário.", true);
        return;
    }

    const id = document.getElementById('idEstoqueForm').value;

    try {
        if (estaEditandoEstoque) {
            await api.atualizarEstoque(id, dados);
            exibirToast('Estoque atualizado com sucesso!');
        } else {
            await api.cadastrarEstoque(dados);
            exibirToast('Estoque cadastrado com sucesso!');
        }
        fecharTodosModais();
        carregarEstoque(); // Recarrega a tabela de estoque
    } catch (erro) {
        if (erro.status === 409) {
            erroEstoqueLote.textContent = 'Este lote já está cadastrado para este medicamento nesta UBS.';
            estoqueLoteInput.classList.add('input-error');
            exibirToast(erro.message || "Lote já cadastrado.", true);
        } else {
            exibirToast(`Erro ao salvar estoque: ${erro.message}`, true);
        }
    }
}

async function excluirEstoque(id) {
    abrirConfirmacao(
        'Excluir Item do Estoque',
        'Tem certeza que deseja excluir este item do estoque? Esta ação é permanente.',
        async () => {
            try {
                await api.excluirEstoque(id);
                exibirToast('Item excluído do estoque!');
                carregarEstoque(); // Recarrega a tabela de estoque
            } catch (erro) {
                exibirToast(`Erro ao excluir item: ${erro.message}`, true);
            }
        }
    );
}

// --- Funções Modal Medicamento Base ---

async function carregarMedicamentosBase() {
    try {
        listaMedicamentosCache = await api.listarMedicamentos();
        renderizarMedicamentosBase(); 
    } catch (erro) {
        corpoTabelaMedicamentosBase.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar medicamentos.'}</td></tr>`;
    }
}

function renderizarMedicamentosBase() {
    const filtroNome = document.getElementById('buscaMedBase')?.value.toLowerCase() || '';

    if (!corpoTabelaMedicamentosBase) return; // Guarda

    const medicamentosFiltrados = listaMedicamentosCache.filter(med =>
        med.nome_comercial.toLowerCase().includes(filtroNome) ||
        med.principio_ativo.toLowerCase().includes(filtroNome)
    );

    corpoTabelaMedicamentosBase.innerHTML = '';
    if (medicamentosFiltrados.length === 0) {
        corpoTabelaMedicamentosBase.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Nenhum medicamento encontrado.</td></tr>`;
        return;
    }

    medicamentosFiltrados.forEach(med => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200 ${!med.ativo ? 'bg-red-50 text-gray-500' : ''}`;

        const statusBotao = med.ativo
            ? `<button class="btn-status-med-base btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${med.id_medicamento}" data-status="false">Desativar</button>`
            : `<button class="btn-status-med-base btn-sucesso py-1 px-3 rounded-lg text-sm" data-id="${med.id_medicamento}" data-status="true">Ativar</button>`;

        tr.innerHTML = `
            <td class="p-4">${med.nome_comercial}</td>
            <td class="p-4">${med.principio_ativo}</td>
            <td class="p-4">${med.controlado ? 'Sim' : 'Não'}</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${med.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${med.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="p-4 flex space-x-2">
                <button class="btn-editar-med-base btn-secundario py-1 px-3 rounded-lg text-sm" data-med='${JSON.stringify(med)}'>Editar</button>
                ${statusBotao}
            </td>
        `;
        corpoTabelaMedicamentosBase.appendChild(tr);
    });
}


function abrirModalMedicamentoBase(med = null) {
    limparErrosFormulario('formularioMedicamentoBase');
    const btnSalvar = document.getElementById('btnSalvarMedBase');
    const btnCancelar = document.getElementById('btnCancelarEdicaoMedBase');
    const tituloForm = document.getElementById('tituloFormularioMedBase');

    if (med) {
        estaEditandoMedBase = true;
        tituloForm.textContent = 'Editar Medicamento';
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
        estaEditandoMedBase = false;
        tituloForm.textContent = 'Adicionar Novo Medicamento';
        btnSalvar.textContent = 'Adicionar à Lista';
        btnCancelar.style.display = 'none';
        formularioMedicamentoBase.reset();
        document.getElementById('idMedBaseForm').value = '';
    }
    modalMedicamentoBase.classList.add('ativo');
}

function cancelarEdicaoMedBase() {
    estaEditandoMedBase = false;
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
        exibirToast("Nome comercial e Princípio ativo são obrigatórios.", true);
        return;
    }

    try {
        if (estaEditandoMedBase) {
            await api.atualizarMedicamento(id, dados);
            exibirToast('Medicamento atualizado com sucesso!');
        } else {
            await api.cadastrarMedicamento(dados);
            exibirToast('Medicamento base cadastrado!');
        }
        cancelarEdicaoMedBase();
        await carregarDropdowns(); // Recarrega dropdowns em ambos os casos
        await carregarMedicamentosBase(); // Recarrega a tabela de med base
    } catch (erro) {
        exibirToast(`Erro ao salvar: ${erro.message}`, true);
    }
}

async function toggleStatusMedicamentoBase(id, novoStatus) {
    const verboAcao = novoStatus ? 'ativar' : 'desativar';
    const participioAcao = novoStatus ? 'ativado' : 'desativado';
    const tituloAcao = novoStatus ? 'Ativar' : 'Desativar';

    let mensagemConfirmacao = `Tem certeza que deseja ${verboAcao} este medicamento base?`;
    if (!novoStatus) {
        mensagemConfirmacao += " Isso removerá todos os itens deste medicamento do estoque.";
    }

    abrirConfirmacao(
        `${tituloAcao} Medicamento`,
        mensagemConfirmacao,
        async () => {
            try {
                await api.alterarStatusMedicamento(id, novoStatus);
                exibirToast(`Medicamento ${participioAcao} com sucesso!`);
                await carregarDropdowns();
                await carregarMedicamentosBase();
                await carregarEstoque(); // Recarrega estoque também
            } catch (erro) {
                exibirToast(`Erro ao ${verboAcao}: ${erro.message}`, true);
            }
        },
        novoStatus ? 'primario' : 'perigo'
    );
}

// --- Inicialização ---

export function initAdminMedicamentos(usuarioLogado) {
    // MODIFICADO: Previne reinicialização
    if (document.getElementById('corpoTabelaEstoque')?.dataset.initialized) return;

    // Mapeamento dos elementos
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
    corpoTabelaEstoque.dataset.initialized = true; // Marca como inicializado

    // --- Lógica de Visibilidade ---
    const btnGerenciarMedicamentos = document.getElementById('abrirModalGerenciarMedicamentos');
    if (usuarioLogado.perfil === 'gestor_ubs') {
        if (btnGerenciarMedicamentos) {
            btnGerenciarMedicamentos.style.display = 'none';
        }
    }

    // Listeners dos botões principais
    document.getElementById('abrirModalAdicionarEstoque').addEventListener('click', () => abrirModalEstoque(null));
    
    if (btnGerenciarMedicamentos) {
        btnGerenciarMedicamentos.addEventListener('click', () => {
            cancelarEdicaoMedBase();
            carregarMedicamentosBase(); // Carrega a lista ao abrir
            modalMedicamentoBase.classList.add('ativo');
        });
    }
    // Listeners dos formulários
    formularioEstoque.addEventListener('submit', salvarEstoque);
    formularioMedicamentoBase.addEventListener('submit', salvarMedicamentoBase);
    document.getElementById('btnCancelarEdicaoMedBase').addEventListener('click', cancelarEdicaoMedBase);

    if (estoqueLoteInput) {
        estoqueLoteInput.addEventListener('blur', validarLote);
    }

    // Listeners das tabelas (Delegação de evento)
    corpoTabelaEstoque.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar-estoque')) {
            abrirModalEstoque(JSON.parse(e.target.dataset.item));
        }
        if (e.target.classList.contains('btn-excluir-estoque')) {
            excluirEstoque(e.target.dataset.id);
        }
    });

    corpoTabelaMedicamentosBase.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-status-med-base')) {
            const id = target.dataset.id;
            const novoStatus = target.dataset.status === 'true';
            toggleStatusMedicamentoBase(id, novoStatus);
        }
        if (target.classList.contains('btn-editar-med-base')) {
            const med = JSON.parse(target.dataset.med);
            abrirModalMedicamentoBase(med);
        }
    });

    document.getElementById('buscaMedBase').addEventListener('input', renderizarMedicamentosBase);
    document.getElementById('buscaEstoque').addEventListener('input', renderizarEstoque);
    document.getElementById('filtroUbsEstoque').addEventListener('change', renderizarEstoque);

    // REMOVIDO: carregarDadosIniciais() será chamado pelo Admin.js
}