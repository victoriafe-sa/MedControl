// frontend/scripts/admin/admin-relatorios.js
import { api } from '../utils/api.js';
import { exibirToast } from '../utils/ui.js';

// Armazena a instância do gráfico para destruí-la antes de recriar
let meuGraficoDemanda = null;

// Elementos DOM
let filtroRelatorioUBS, filtroDataInicio, filtroDataFim;
let tabelaRelatorioEstoqueCorpo, tabelaRelatorioDemandaCorpo;
let containerDashboardIndicadores;
let canvasGraficoDemanda;

/**
 * Carrega o filtro de UBS (só precisa ser feito uma vez).
 */
async function carregarFiltros() {
    try {
        const ubsLista = await api.listarUbs();
        filtroRelatorioUBS.innerHTML = '<option value="">Todas as UBS</option>'; // Manter a opção "Todas"
        ubsLista.forEach(ubs => {
            filtroRelatorioUBS.innerHTML += `<option value="${ubs.id_ubs}">${ubs.nome}</option>`;
        });
    } catch (erro) {
        exibirToast("Erro ao carregar filtro de UBS.", true);
    }
}

/**
 * RF09.3 - Carrega os indicadores do dashboard.
 */
async function carregarDashboard() {
    try {
        const indicadores = await api.getIndicadoresDashboard();
        
        // 1. Renderizar Indicadores (Estoque Crítico e Mais Pesquisados)
        renderizarIndicadores(indicadores.estoqueCritico, indicadores.maisPesquisados);

        // 2. Renderizar Gráfico de Demanda
        renderizarGraficoDemanda(indicadores.projecaoDemanda);

    } catch (erro) {
        exibirToast(`Erro ao carregar dashboard: ${erro.message}`, true);
        if (containerDashboardIndicadores) {
            containerDashboardIndicadores.innerHTML = `<p class="text-red-500">Falha ao carregar indicadores.</p>`;
        }
    }
}

/**
 * Renderiza os cards de indicadores.
 * @param {Array} estoqueCritico
 * @param {Array} maisPesquisados
 */
function renderizarIndicadores(estoqueCritico, maisPesquisados) {
    if (!containerDashboardIndicadores) return;

    let htmlEstoque = 'Nenhum item em estado crítico.';
    if (estoqueCritico && estoqueCritico.length > 0) {
        htmlEstoque = '<ul class="list-disc pl-5 space-y-1 text-sm">';
        estoqueCritico.forEach(item => {
            htmlEstoque += `<li><strong>${item.nome_comercial}</strong> (${item.nome_ubs}): ${item.quantidade} un.</li>`;
        });
        htmlEstoque += '</ul>';
    }

    let htmlBuscas = 'Nenhuma busca registrada.';
    if (maisPesquisados && maisPesquisados.length > 0) {
        htmlBuscas = '<ul class="list-disc pl-5 space-y-1 text-sm">';
        maisPesquisados.forEach(item => {
            htmlBuscas += `<li><strong>${item.termo}</strong> (${item.total} buscas)</li>`;
        });
        htmlBuscas += '</ul>';
    }

    containerDashboardIndicadores.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow">
            <h4 class="font-semibold text-lg text-red-600">Estoque Crítico (Top 5)</h4>
            <div class="mt-2">${htmlEstoque}</div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow">
            <h4 class="font-semibold text-lg text-blue-600">Mais Pesquisados (Últimos 30 dias)</h4>
            <div class="mt-2">${htmlBuscas}</div>
        </div>
    `;
}

/**
 * Renderiza o gráfico de projeção de demanda.
 * @param {Array} projecaoDemanda - Lista de {dia, total_itens}
 */
function renderizarGraficoDemanda(projecaoDemanda) {
    if (!canvasGraficoDemanda) return;

    // Destrói o gráfico anterior se ele existir
    if (meuGraficoDemanda) {
        meuGraficoDemanda.destroy();
    }

    const ctx = canvasGraficoDemanda.getContext('2d');
    
    // --- CORREÇÃO: Adicionar verificação de nulidade ---
    // Garante que projecaoDemanda é um array, mesmo que a API falhe
    const dadosProjecao = projecaoDemanda || []; 
    
    // Formata os dados para o Chart.js
    // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE DATA) ---
    // Substitui '-' por '/' para forçar o parse como data local, não UTC
    const labels = dadosProjecao.map(item => 
        new Date(item.dia.replace(/-/g, '/')).toLocaleDateString('pt-BR')
    );
    // --- FIM DA MODIFICAÇÃO ---
    const data = dadosProjecao.map(item => item.total_itens);

    meuGraficoDemanda = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Itens Retirados por Dia',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                borderColor: 'rgba(30, 64, 175, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nº de Itens Retirados' }
                },
                x: {
                     title: { display: true, text: 'Últimos 30 dias' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}


/**
 * RF09.1 - Busca e renderiza o relatório de estoque.
 * @param {string} ubs_id
 */
async function buscarRelatorioEstoque(ubs_id) {
    if (!tabelaRelatorioEstoqueCorpo) return;
    tabelaRelatorioEstoqueCorpo.innerHTML = '<tr><td colspan="6" class="p-4 text-center">Carregando...</td></tr>';
    
    try {
        const dados = await api.getRelatorioEstoque(ubs_id);
        
        tabelaRelatorioEstoqueCorpo.innerHTML = '';
        if (dados.length === 0) {
            tabelaRelatorioEstoqueCorpo.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum item de estoque encontrado.</td></tr>';
            return;
        }

        dados.forEach(item => {
            // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE DATA) ---
            let dataValidade = 'N/A';
            if (item.data_validade) {
                try {
                    let dataObj;
                    if (typeof item.data_validade === 'string') {
                        // Se for string (ex: "2027-10-01"), substitui '-' por '/'
                        dataObj = new Date(item.data_validade.replace(/-/g, '/'));
                    } else if (typeof item.data_validade === 'number') {
                        // Se for número (timestamp), usa diretamente
                        dataObj = new Date(item.data_validade);
                    } else {
                        // Tenta criar a data com o que vier
                        dataObj = new Date(item.data_validade);
                    }
                    
                    // Verifica se a data criada é válida
                    if (isNaN(dataObj.getTime())) {
                        dataValidade = 'Inválida';
                    } else {
                        dataValidade = dataObj.toLocaleDateString('pt-BR');
                    }
                } catch (e) {
                    console.error("Erro ao formatar data:", item.data_validade, e);
                    dataValidade = 'Inválida';
                }
            }
            // --- FIM DA MODIFICAÇÃO ---
            
            let statusCor = 'text-green-600';
            if (item.status === 'Vencido') statusCor = 'text-red-700 bg-red-100 font-bold';
            else if (item.status === 'Crítico') statusCor = 'text-red-600 font-medium';
            else if (item.status === 'Baixo') statusCor = 'text-yellow-600';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3">${item.nome_comercial} (${item.principio_ativo})</td>
                <td class="p-3 text-gray-600">${item.nome_ubs}</td>
                <td class="p-3 text-gray-600">${item.lote}</td>
                <td class="p-3 font-medium">${item.quantidade}</td>
                <td class="p-3">${dataValidade}</td>
                <td class="p-3 ${statusCor}">${item.status}</td>
            `;
            tabelaRelatorioEstoqueCorpo.appendChild(tr);
        });

    } catch (erro) {
        exibirToast(`Erro ao carregar relatório de estoque: ${erro.message}`, true);
        tabelaRelatorioEstoqueCorpo.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">${erro.message}</td></tr>`;
    }
}

/**
 * RF09.2 - Busca e renderiza o relatório de demanda.
 * @param {string} inicio
 * @param {string} fim
 */
async function buscarRelatorioDemanda(inicio, fim) {
    if (!tabelaRelatorioDemandaCorpo) return;
    tabelaRelatorioDemandaCorpo.innerHTML = '<tr><td colspan="3" class="p-4 text-center">Carregando...</td></tr>';

    try {
        const dados = await api.getRelatorioDemanda(inicio, fim);
        
        tabelaRelatorioDemandaCorpo.innerHTML = '';
        if (dados.length === 0) {
            tabelaRelatorioDemandaCorpo.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Nenhuma retirada encontrada no período.</td></tr>';
            return;
        }

        dados.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3">${item.nome_comercial}</td>
                <td class="p-3 text-gray-600">${item.principio_ativo}</td>
                <td class="p-3 font-medium">${item.total_retirado}</td>
            `;
            tabelaRelatorioDemandaCorpo.appendChild(tr);
        });

    } catch (erro) {
        exibirToast(`Erro ao carregar relatório de demanda: ${erro.message}`, true);
        tabelaRelatorioDemandaCorpo.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">${erro.message}</td></tr>`;
    }
}

/**
 * Função principal que atualiza todos os componentes da aba.
 * EXPORTADA para ser chamada pelo Admin.js
 */
export function carregarTodosRelatorios() {
    // Adiciona guarda para caso os elementos não estejam prontos
    if (!tabelaRelatorioEstoqueCorpo || !filtroRelatorioUBS) return; 
    
    // Coleta os valores dos filtros
    const filtros = {
        ubs_id: filtroRelatorioUBS.value || '',
        inicio: filtroDataInicio.value || '',
        fim: filtroDataFim.value || ''
    };

    // Carrega os 3 componentes
    carregarDashboard();
    buscarRelatorioEstoque(filtros.ubs_id);
    buscarRelatorioDemanda(filtros.inicio, filtros.fim);
}

/**
 * Inicializa o módulo de relatórios.
 * @param {object} usuarioLogado
 */
export function initAdminRelatorios(usuarioLogado) {
    // MODIFICADO: Previne reinicialização
    if (document.getElementById('graficoDemanda')?.dataset.initialized) return;

    // Mapeamento dos elementos
    filtroRelatorioUBS = document.getElementById('filtroRelatorioUBS');
    filtroDataInicio = document.getElementById('filtroDataInicio');
    filtroDataFim = document.getElementById('filtroDataFim');
    tabelaRelatorioEstoqueCorpo = document.getElementById('tabelaRelatorioEstoqueCorpo');
    tabelaRelatorioDemandaCorpo = document.getElementById('tabelaRelatorioDemandaCorpo');
    containerDashboardIndicadores = document.getElementById('containerDashboardIndicadores');
    canvasGraficoDemanda = document.getElementById('graficoDemanda');

    if (!tabelaRelatorioEstoqueCorpo || !canvasGraficoDemanda) {
        console.warn('Elementos da aba Relatórios ainda não estão no DOM.');
        return;
    }
    canvasGraficoDemanda.dataset.initialized = true; // Marca como inicializado

    // Carregar filtros (só precisa ser feito uma vez)
    carregarFiltros();

    // REMOVIDO: carregarTodosRelatorios() será chamado pelo Admin.js

    // Adicionar Listeners
    document.getElementById('btnAplicarFiltros').addEventListener('click', carregarTodosRelatorios);
}