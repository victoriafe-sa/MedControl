// frontend/scripts/admin/admin-ubs.js
import { api } from '../utils/api.js';
// MODIFICADO: Importa funções de CEP
import { formatarCep, validarCep, preencherValidacaoCep } from '../utils/cep.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, abrirConfirmacao } from '../utils/ui.js';

let modalUbs, formularioUbs, corpoTabelaUbs, ubsCepInput, ubsCepValidacao, ubsCepErro;
let estaEditando = false;
let ubsListaCache = []; // ADICIONADO (RF03.1)
let modalDetalhesUbs; // ADICIONADO (RF03.1)

async function carregarUbs() {
    try {
        // MODIFICADO (RF03.1): Salva no cache
        ubsListaCache = await api.listarUbs();
        renderizarUbs(); // MODIFICADO (RF03.1): Chama o renderizador
    } catch (erro) {
        corpoTabelaUbs.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar UBS.'}</td></tr>`;
    }
}

// ADICIONADO (RF03.1): Função para renderizar com filtro
function renderizarUbs() {
    const filtroBusca = document.getElementById('buscaUbs')?.value.toLowerCase() || '';

    const ubsFiltrada = ubsListaCache.filter(ubs => {
        return filtroBusca === '' ||
            ubs.nome.toLowerCase().includes(filtroBusca) ||
            ubs.endereco.toLowerCase().includes(filtroBusca) ||
            (ubs.telefone && ubs.telefone.toLowerCase().includes(filtroBusca));
    });

    corpoTabelaUbs.innerHTML = '';
    if (ubsFiltrada.length === 0) {
        corpoTabelaUbs.innerHTML = `<tr><td colspan="8" class="p-4 text-center">Nenhuma UBS encontrada.</td></tr>`;
        return;
    }

    ubsFiltrada.forEach(ubs => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-200`;
        // MODIFICADO (RF03.1): Adicionado botão "Detalhes"
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


function abrirModalUbs(ubs = null) {
    limparErrosFormulario('formularioUbs');
    formularioUbs.reset(); // Limpa o formulário
    
    // MODIFICADO: Limpa validação de CEP
    preencherValidacaoCep(ubsCepInput, ubsCepValidacao, ubs ? ubs.cep : null);
    
    if (ubs) {
        estaEditando = true;
        document.getElementById('tituloModalUbs').textContent = 'Editar UBS';
        document.getElementById('idUbsForm').value = ubs.id_ubs;
        document.getElementById('ubsNome').value = ubs.nome;
        document.getElementById('ubsEndereco').value = ubs.endereco;
        document.getElementById('ubsTelefone').value = ubs.telefone;
        document.getElementById('ubsHorario').value = ubs.horario_funcionamento;
        document.getElementById('ubsCep').value = ubs.cep; // ADICIONADO
        document.getElementById('ubsLatitude').value = ubs.latitude;
        document.getElementById('ubsLongitude').value = ubs.longitude;
    } else {
        estaEditando = false;
        document.getElementById('tituloModalUbs').textContent = 'Adicionar UBS';
        document.getElementById('idUbsForm').value = '';
    }
    modalUbs.classList.add('ativo');
}

// ADICIONADO (RF03.1): Lógica do Modal de Detalhes
async function abrirModalDetalhesUbs(ubs) {
    modalDetalhesUbs.classList.add('ativo');
    
    // 1. Popula as informações da UBS
    document.getElementById('detalhesUbsTitulo').textContent = `Detalhes: ${ubs.nome}`;
    document.getElementById('detalhesUbsNome').textContent = ubs.nome;
    document.getElementById('detalhesUbsTelefone').textContent = ubs.telefone || 'N/A';
    document.getElementById('detalhesUbsEndereco').textContent = ubs.endereco;
    document.getElementById('detalhesUbsCep').textContent = ubs.cep || 'N/A';
    document.getElementById('detalhesUbsHorario').textContent = ubs.horario_funcionamento || 'N/A';
    document.getElementById('detalhesUbsLat').textContent = ubs.latitude || 'N/A';
    document.getElementById('detalhesUbsLon').textContent = ubs.longitude || 'N/A';

    // 2. Adiciona listeners aos botões do modal de detalhes
    const btnEditar = document.getElementById('detalhesUbsBtnEditar');
    const btnExcluir = document.getElementById('detalhesUbsBtnExcluir');
    
    // Clona para remover listeners antigos (boa prática)
    const btnEditarClone = btnEditar.cloneNode(true);
    btnEditar.parentNode.replaceChild(btnEditarClone, btnEditar);
    btnEditarClone.addEventListener('click', () => {
        fecharTodosModais();
        abrirModalUbs(ubs);
    });

    const btnExcluirClone = btnExcluir.cloneNode(true);
    btnExcluir.parentNode.replaceChild(btnExcluirClone, btnExcluir);
    btnExcluirClone.addEventListener('click', () => {
        fecharTodosModais();
        excluirUbs(ubs.id_ubs);
    });

    // 3. Busca e filtra o estoque
    const corpoEstoque = document.getElementById('detalhesUbsEstoque');
    corpoEstoque.innerHTML = `<tr><td colspan="5" class="p-3 text-center">Carregando estoque...</td></tr>`;

    try {
        // Reutiliza a API de listar estoque (a mesma da aba medicamentos)
        const todoEstoque = await api.listarEstoque();
        const estoqueDaUbs = todoEstoque.filter(item => item.id_ubs === ubs.id_ubs);

        if (estoqueDaUbs.length === 0) {
            corpoEstoque.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-gray-500">Nenhum medicamento no estoque desta UBS.</td></tr>`;
            return;
        }

        corpoEstoque.innerHTML = '';
        estoqueDaUbs.forEach(item => {
            const dataValidade = new Date(item.data_validade).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            corpoEstoque.innerHTML += `
                <tr class="border-b">
                    <td class="p-3 text-sm">${item.nome_comercial}</td>
                    <td class="p-3 text-sm text-gray-600">${item.principio_ativo}</td>
                    <td class="p-3 text-sm">${item.lote}</td>
                    <td class="p-3 text-sm font-medium">${item.quantidade}</td>
                    <td class="p-3 text-sm">${dataValidade}</td>
                </tr>
            `;
        });

    } catch (erro) {
        corpoEstoque.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-red-500">Erro ao carregar estoque.</td></tr>`;
    }
}

async function salvarUbs(e) {
    e.preventDefault();
    limparErrosFormulario('formularioUbs'); // ADICIONADO: Limpa erros antigos

    // ADICIONADO (RF03.2): Validação de campos obrigatórios
    let camposValidos = true;
    const nomeInput = document.getElementById('ubsNome');
    const enderecoInput = document.getElementById('ubsEndereco');
    
    if (!nomeInput.value.trim()) {
        nomeInput.classList.add('input-error');
        document.getElementById('erroUbsNome').textContent = 'O nome é obrigatório.';
        camposValidos = false;
    }
    if (!enderecoInput.value.trim()) {
        enderecoInput.classList.add('input-error');
        document.getElementById('erroUbsEndereco').textContent = 'O endereço é obrigatório.';
        camposValidos = false;
    }

    // MODIFICADO (RF03.2): Validação do CEP
    if (ubsCepInput.value && !ubsCepInput.classList.contains('input-success')) {
        ubsCepErro.textContent = 'Por favor, valide um CEP válido.';
        camposValidos = false; // Modificado
    }

    if (!camposValidos) { // Modificado
        exibirToast('Verifique os campos obrigatórios.', true);
        return;
    }
    // Fim da Validação
    
    const id = document.getElementById('idUbsForm').value;
    const dados = {
        nome: document.getElementById('ubsNome').value,
        endereco: document.getElementById('ubsEndereco').value,
        telefone: document.getElementById('ubsTelefone').value,
        horario_funcionamento: document.getElementById('ubsHorario').value,
        cep: document.getElementById('ubsCep').value, // ADICIONADO
        latitude: document.getElementById('ubsLatitude').value || null,
        longitude: document.getElementById('ubsLongitude').value || null,
    };

    try {
        if (estaEditando) {
            await api.atualizarUbs(id, dados);
            exibirToast('UBS atualizada com sucesso!');
        } else {
            await api.cadastrarUbs(dados);
            exibirToast('UBS cadastrada com sucesso!');
        }
        fecharTodosModais();
        carregarUbs();
    } catch (erro) {
        exibirToast(`Erro ao salvar UBS: ${erro.message}`, true);
    }
}

async function excluirUbs(id) {
    abrirConfirmacao(
        'Desativar UBS',
        // MODIFICADO (RF03.4): Mensagem de confirmação ajustada
        'Você tem certeza que deseja desativar esta UBS? Esta ação não poderá ser desfeita.',
        async () => {
            try {
                await api.excluirUbs(id);
                exibirToast('UBS desativada com sucesso!');
                carregarUbs();
            } catch (erro) {
                exibirToast(`Erro ao desativar UBS: ${erro.message}`, true);
            }
        }
    );
}

export function initAdminUbs() {
    modalUbs = document.getElementById('modalUbs');
    formularioUbs = document.getElementById('formularioUbs');
    corpoTabelaUbs = document.getElementById('corpoTabelaUbs');
    modalDetalhesUbs = document.getElementById('modalDetalhesUbs'); // ADICIONADO
    
    // MODIFICADO: Mapeia campos de CEP da UBS
    ubsCepInput = document.getElementById('ubsCep');
    ubsCepValidacao = document.getElementById('validacaoUbsCep');
    ubsCepErro = document.getElementById('erroUbsCep');

    if (!modalUbs || !formularioUbs || !corpoTabelaUbs || !ubsCepInput || !modalDetalhesUbs) { // MODIFICADO
        console.error('Elementos da aba UBS não encontrados.');
        return;
    }

    document.getElementById('abrirModalAdicionarUbs').addEventListener('click', () => abrirModalUbs(null));
    formularioUbs.addEventListener('submit', salvarUbs);
    document.getElementById('buscaUbs').addEventListener('input', renderizarUbs); // ADICIONADO (RF03.1)

    // MODIFICADO: Adiciona listeners de CEP
    ubsCepInput.addEventListener('input', () => formatarCep(ubsCepInput));
    ubsCepInput.addEventListener('blur', () => validarCep(ubsCepInput, ubsCepValidacao));
    ubsCepInput.addEventListener('focus', () => {
        ubsCepValidacao.textContent = '';
        ubsCepValidacao.className = 'validation-message';
        ubsCepErro.textContent = '';
        ubsCepInput.classList.remove('input-success', 'input-error');
    });

    corpoTabelaUbs.addEventListener('click', (e) => {
        // ADICIONADO (RF03.1)
        if (e.target.classList.contains('btn-detalhes-ubs')) {
            abrirModalDetalhesUbs(JSON.parse(e.target.dataset.ubs));
        }
        if (e.target.classList.contains('btn-editar-ubs')) {
            abrirModalUbs(JSON.parse(e.target.dataset.ubs));
        }
        if (e.target.classList.contains('btn-excluir-ubs')) {
            excluirUbs(e.target.dataset.id);
        }
    });

    carregarUbs();
}