// frontend/scripts/admin/admin-validacao.js
import { api } from '../utils/api.js';
import { exibirToast, abrirConfirmacao } from '../utils/ui.js';

// Caches de dados
let usuariosPacientes = [];
let ubsPermitidas = [];
let estoqueCompleto = [];
let estoqueUbsAtual = [];

// Estado da UI
let cestaDeRetirada = [];
let usuarioLogado = null;

// Elementos DOM
let selectUsuario, selectUbs, selectMedicamento, inputQuantidade,
    btnAdicionarItem, tabelaCestaCorpo, btnConfirmarRetirada,
    containerValidacao;

// --- INÍCIO DA MODIFICAÇÃO RF05.5 ---
let inputCodigoReceita, btnValidarReceita, resultadoValidacaoReceita;
// --- FIM DA MODIFICAÇÃO RF05.5 ---

/**
 * Carrega dados essenciais para os dropdowns.
 * MODIFICADO: Função exportada para ser chamada pelo Admin.js
 */
export async function carregarDadosValidacao() {
    if (!containerValidacao) return; // Guarda
    try {
        // Busca todos os usuários
        const todosUsuarios = await api.listarUsuarios();
        // Filtra apenas pacientes (perfil 'usuario' e ativos)
        usuariosPacientes = todosUsuarios.filter(u => u.perfil === 'usuario' && u.ativo);
        popularSelect(selectUsuario, usuariosPacientes, 'id', 'nome', 'Selecione um paciente...');

        // Busca todas as UBS
        const todasUbs = await api.listarUbs();
        
        ubsPermitidas = todasUbs; // Por enquanto, permite todas
        popularSelect(selectUbs, ubsPermitidas, 'id_ubs', 'nome', 'Selecione uma UBS...');

        // Busca o estoque completo
        estoqueCompleto = await api.listarEstoque();

        // Limpa seleções anteriores (exceto se tiver permissão)
        selectUbs.value = '';
        selectUsuario.value = '';
        cestaDeRetirada = [];
        renderizarCesta();
        carregarEstoqueDaUbs(); // Limpa o select de medicamentos

        // --- INÍCIO DA MODIFICAÇÃO RF05.5 ---
        // Limpa o validador de receita
        if (inputCodigoReceita) inputCodigoReceita.value = '';
        if (resultadoValidacaoReceita) {
            resultadoValidacaoReceita.innerHTML = '';
            resultadoValidacaoReceita.style.display = 'none';
        }
        // --- FIM DA MODIFICAÇÃO RF05.5 ---

    } catch (erro) {
        exibirToast(`Erro ao carregar dados: ${erro.message}`, true);
    }
}

/**
 * Filtra o estoque completo e popula o select de medicamentos.
 */
function carregarEstoqueDaUbs() {
    const idUbsSelecionada = parseInt(selectUbs.value);
    if (isNaN(idUbsSelecionada)) {
        estoqueUbsAtual = [];
        popularSelect(selectMedicamento, [], '', '', 'Selecione uma UBS primeiro...');
        return;
    }

    // Filtra o estoque cacheado para a UBS selecionada
    estoqueUbsAtual = estoqueCompleto.filter(item => 
        item.id_ubs === idUbsSelecionada && item.quantidade > 0
    );

    // Formata o nome para exibição no select
    const estoqueFormatado = estoqueUbsAtual.map(item => ({
        ...item,
        nomeExibicao: `${item.nome_comercial} (Lote: ${item.lote} | Qtd: ${item.quantidade})`
    }));

    popularSelect(selectMedicamento, estoqueFormatado, 'id_estoque', 'nomeExibicao', 'Selecione um medicamento...');
}

// --- INÍCIO DAS FUNÇÕES RF05.5 ---

/**
 * Handler para o clique no botão "Validar Receita".
 */
async function handleValidarReceita() {
    const codigo = inputCodigoReceita.value.trim();
    if (!codigo) {
        exibirToast('Digite um código de receita.', true);
        return;
    }

    resultadoValidacaoReceita.style.display = 'none';
    resultadoValidacaoReceita.className = 'resultado-validacao'; // Limpa classes
    btnValidarReceita.disabled = true;
    btnValidarReceita.textContent = 'Validando...';

    try {
        const resultado = await api.validarReceita(codigo);
        // Sucesso na validação (status 200)
        exibirResultadoValidacao(resultado.mensagem, resultado.status);
    } catch (erro) {
        // Erro (404, 409, 410, 500)
        const data = erro.data || { mensagem: erro.message, status: 'erro' };
        exibirResultadoValidacao(data.mensagem, data.status || 'invalida');
    } finally {
        btnValidarReceita.disabled = false;
        btnValidarReceita.textContent = 'Validar';
    }
}

/**
 * Exibe o resultado da validação da receita na UI.
 * @param {string} mensagem
 * @param {string} status ('valida', 'invalida', 'aviso', 'erro')
 */
function exibirResultadoValidacao(mensagem, status) {
    if (!resultadoValidacaoReceita) return;

    resultadoValidacaoReceita.textContent = mensagem;
    resultadoValidacaoReceita.className = 'resultado-validacao'; // Reseta

    if (status === 'valida') {
        resultadoValidacaoReceita.classList.add('valida');
    } else if (status === 'aviso') {
        resultadoValidacaoReceita.classList.add('aviso');
    } else {
        resultadoValidacaoReceita.classList.add('invalida');
    }

    resultadoValidacaoReceita.style.display = 'block';
}

// --- FIM DAS FUNÇÕES RF05.5 ---


/**
 * Adiciona o item selecionado à cesta de retirada.
 */
function adicionarItemCesta() {
    const idEstoque = parseInt(selectMedicamento.value);
    const quantidade = parseInt(inputQuantidade.value);

    // Validações
    if (isNaN(idEstoque)) {
        exibirToast('Selecione um medicamento.', true);
        return;
    }
    if (isNaN(quantidade) || quantidade <= 0) {
        exibirToast('Insira uma quantidade válida.', true);
        return;
    }

    const itemEstoque = estoqueUbsAtual.find(item => item.id_estoque === idEstoque);
    if (!itemEstoque) {
        exibirToast('Item de estoque não encontrado.', true);
        return;
    }
    
    if (quantidade > itemEstoque.quantidade) {
        exibirToast(`Quantidade indisponível. Máximo: ${itemEstoque.quantidade}`, true);
        return;
    }

    // Verifica se já está na cesta
    const itemNaCesta = cestaDeRetirada.find(item => item.id_estoque === idEstoque);
    if (itemNaCesta) {
        exibirToast('Este item (lote) já está na cesta.', true);
        return;
    }

    // Adiciona à cesta
    cestaDeRetirada.push({
        id_estoque: itemEstoque.id_estoque,
        id_medicamento: itemEstoque.id_medicamento,
        nome_comercial: itemEstoque.nome_comercial,
        lote: itemEstoque.lote,
        quantidade: quantidade
    });

    renderizarCesta();
    
    // Limpa campos
    selectMedicamento.value = '';
    inputQuantidade.value = '';
}

/**
 * Remove um item da cesta.
 * @param {number} idEstoque
 */
function removerItemCesta(idEstoque) {
    cestaDeRetirada = cestaDeRetirada.filter(item => item.id_estoque !== idEstoque);
    renderizarCesta();
}

/**
 * Renderiza a tabela da cesta de retirada.
 */
function renderizarCesta() {
    tabelaCestaCorpo.innerHTML = '';
    if (cestaDeRetirada.length === 0) {
        tabelaCestaCorpo.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Cesta vazia</td></tr>';
        return;
    }

    cestaDeRetirada.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3">${item.nome_comercial}</td>
            <td class="p-3 text-gray-600">${item.lote}</td>
            <td class="p-3 font-medium">${item.quantidade}</td>
            <td class="p-3">
                <button class="btn-remover-cesta btn-perigo py-1 px-2 rounded text-xs" data-id-estoque="${item.id_estoque}">Remover</button>
            </td>
        `;
        tabelaCestaCorpo.appendChild(tr);
    });
}

/**
 * Confirma a retirada, enviando os dados para a API.
 */
function confirmarRetirada() {
    const idUsuario = parseInt(selectUsuario.value);
    const idUbs = parseInt(selectUbs.value);

    if (isNaN(idUsuario)) {
        exibirToast('Selecione o paciente.', true);
        return;
    }
    if (isNaN(idUbs)) {
        exibirToast('Selecione a UBS.', true);
        return;
    }
    if (cestaDeRetirada.length === 0) {
        exibirToast('Adicione pelo menos um item à cesta.', true);
        return;
    }

    const dadosRetirada = {
        id_usuario: idUsuario,
        id_ubs: idUbs,
        id_farmaceutico: usuarioLogado.id, // O admin logado é o farmacêutico
        itens: cestaDeRetirada.map(item => ({
            id_estoque: item.id_estoque,
            id_medicamento: item.id_medicamento,
            quantidade: item.quantidade
        }))
    };
    
    abrirConfirmacao(
        'Confirmar Retirada',
        `Você confirma a retirada de ${cestaDeRetirada.length} tipo(s) de medicamento(s) para o paciente selecionado? Esta ação atualizará o estoque.`,
        async () => {
            try {
                await api.registrarRetirada(dadosRetirada);
                exibirToast('Retirada registrada com sucesso!');
                
                // Limpa tudo
                cestaDeRetirada = [];
                renderizarCesta();
                selectUsuario.value = '';
                // Não reseta a UBS, o usuário pode querer fazer outra retirada
                
                // Recarrega o estoque (pois ele mudou)
                estoqueCompleto = await api.listarEstoque();
                
                // --- CORREÇÃO: Atualiza o dropdown de medicamentos da UBS selecionada ---
                carregarEstoqueDaUbs(); 
                
            } catch (erro) {
                exibirToast(`Erro ao confirmar retirada: ${erro.message}`, true);
            }
        }
    );
}

/**
 * Utilitário para popular selects.
 */
function popularSelect(selectEl, lista, valorKey, textoKey, placeholder) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    lista.forEach(item => {
        selectEl.innerHTML += `<option value="${item[valorKey]}">${item[textoKey]}</option>`;
    });
}

/**
 * Inicializa o módulo de validação/retirada.
 * @param {object} usuario - O usuário admin/farmacêutico logado.
 */
export function initAdminValidacao(usuario) {
    // MODIFICADO: Previne reinicialização
    if (document.getElementById('containerValidacao')?.dataset.initialized) return;
    
    usuarioLogado = usuario;
    
    // Mapeamento dos elementos (RF05.6)
    containerValidacao = document.getElementById('containerValidacao');
    selectUsuario = document.getElementById('validacaoSelectUsuario');
    selectUbs = document.getElementById('validacaoSelectUbs');
    selectMedicamento = document.getElementById('validacaoSelectMedicamento');
    inputQuantidade = document.getElementById('validacaoQuantidade');
    btnAdicionarItem = document.getElementById('validacaoBtnAdicionar');
    tabelaCestaCorpo = document.getElementById('validacaoTabelaCestaCorpo');
    btnConfirmarRetirada = document.getElementById('validacaoBtnConfirmar');

    // --- INÍCIO DA MODIFICAÇÃO RF05.5 ---
    // Mapeamento dos elementos (RF05.5)
    inputCodigoReceita = document.getElementById('inputCodigoReceita');
    btnValidarReceita = document.getElementById('btnValidarReceita');
    resultadoValidacaoReceita = document.getElementById('resultadoValidacaoReceita');
    // --- FIM DA MODIFICAÇÃO RF05.5 ---

    if (!containerValidacao || !selectUsuario || !selectUbs || !selectMedicamento) {
        console.warn('Elementos da aba Validação ainda não estão no DOM.');
        return;
    }
    containerValidacao.dataset.initialized = true; // Marca como inicializado

    // REMOVIDO: carregarDadosIniciais() será chamado pelo Admin.js

    // Adicionar Listeners (RF05.6)
    selectUbs.addEventListener('change', carregarEstoqueDaUbs);
    btnAdicionarItem.addEventListener('click', adicionarItemCesta);
    btnConfirmarRetirada.addEventListener('click', confirmarRetirada);
    
    tabelaCestaCorpo.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-cesta')) {
            const idEstoque = parseInt(e.target.dataset.idEstoque);
            removerItemCesta(idEstoque);
        }
    });

    // --- INÍCIO DA MODIFICAÇÃO RF05.5 ---
    // Adicionar Listener (RF05.5)
    btnValidarReceita.addEventListener('click', handleValidarReceita);
    // --- FIM DA MODIFICAÇÃO RF05.5 ---
}