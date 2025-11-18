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
    // --- INÍCIO DA MODIFICAÇÃO ---
    tabelaRelatorioDemandaCorpo.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Carregando...</td></tr>';
    // --- FIM DA MODIFICAÇÃO ---

    try {
        const dados = await api.getRelatorioDemanda(inicio, fim);
        
        tabelaRelatorioDemandaCorpo.innerHTML = '';
        if (dados.length === 0) {
            // --- INÍCIO DA MODIFICAÇÃO ---
            tabelaRelatorioDemandaCorpo.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Nenhuma retirada encontrada no período.</td></tr>';
            // --- FIM DA MODIFICAÇÃO ---
            return;
        }

        dados.forEach(item => {
            // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DATA INVÁLIDA) ---
            let dataRetirada = 'N/A';
            // O backend agora envia "YYYY-MM-DD" como string ou null.
            if (item.dia_retirada && typeof item.dia_retirada === 'string') {
                try {
                    // `item.dia_retirada` está no formato "YYYY-MM-DD".
                    // `new Date("YYYY-MM-DD")` pode interpretar como UTC (meia-noite).
                    // `new Date("YYYY/MM/DD")` interpreta como data local.
                    // Substituir hífens por barras resolve o problema de fuso horário.
                    const dataObj = new Date(item.dia_retirada.replace(/-/g, '/')); 
                    
                    if (isNaN(dataObj.getTime())) {
                        dataRetirada = 'Inválida'; // Fallback caso a string seja "0000-00-00" etc.
                    } else {
                        dataRetirada = dataObj.toLocaleDateString('pt-BR');
                    }
                } catch (e) {
                    console.error("Erro ao formatar data de retirada:", item.dia_retirada, e);
                    dataRetirada = 'Inválida';
                }
            }
            // Se item.dia_retirada for null, continua como 'N/A'.
            // --- FIM DA MODIFICAÇÃO (CORREÇÃO DATA INVÁLIDA) ---

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 font-medium whitespace-nowrap">${dataRetirada}</td>
                <td class="p-3">${item.nome_comercial}</td>
                <td class="p-3 text-gray-600">${item.principio_ativo}</td>
                <td class="p-3 font-medium">${item.total_retirado}</td>
            `;
            // --- FIM DA MODIFICAÇÃO ---
            tabelaRelatorioDemandaCorpo.appendChild(tr);
        });

    } catch (erro) {
        exibirToast(`Erro ao carregar relatório de demanda: ${erro.message}`, true);
        // --- INÍCIO DA MODIFICAÇÃO ---
        tabelaRelatorioDemandaCorpo.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">${erro.message}</td></tr>`;
        // --- FIM DA MODIFICAÇÃO ---
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
    
    // ***** INÍCIO DA MODIFICAÇÃO *****
    const btnBaixarRelatorio = document.getElementById('btnBaixarRelatorio');
    // ***** FIM DA MODIFICAÇÃO *****

    if (!tabelaRelatorioEstoqueCorpo || !canvasGraficoDemanda || !btnBaixarRelatorio) { // Modificado
        console.warn('Elementos da aba Relatórios ainda não estão no DOM.');
        return;
    }
    canvasGraficoDemanda.dataset.initialized = true; // Marca como inicializado

    // Carregar filtros (só precisa ser feito uma vez)
    carregarFiltros();

    // REMOVIDO: carregarTodosRelatorios() será chamado pelo Admin.js

    // Adicionar Listeners
    document.getElementById('btnAplicarFiltros').addEventListener('click', carregarTodosRelatorios);
    
    // ***** INÍCIO DA MODIFICAÇÃO *****
    btnBaixarRelatorio.addEventListener('click', baixarRelatorioHTML);
    // ***** FIM DA MODIFICAÇÃO *****
}

// ***** INÍCIO DA MODIFICAÇÃO *****
/**
 * Gera um arquivo HTML auto-contido com os dados atuais da aba de relatórios e
 * inicia o download no navegador.
 */
function baixarRelatorioHTML() {
    // 1. Obter os dados atuais dos filtros e relatórios
    const dataFiltro = new Date().toLocaleString('pt-BR');
    const ubsFiltro = filtroRelatorioUBS.options[filtroRelatorioUBS.selectedIndex].text;
    const dataInicioFiltro = filtroDataInicio.value ? new Date(filtroDataInicio.value.replace(/-/g, '/')).toLocaleDateString('pt-BR') : 'N/A';
    const dataFimFiltro = filtroDataFim.value ? new Date(filtroDataFim.value.replace(/-/g, '/')).toLocaleDateString('pt-BR') : 'N/A';

    // 2. Obter HTML dos relatórios
    const dashboardIndicadoresHTML = containerDashboardIndicadores.innerHTML;
    // Pega o HTML do container .bg-white que envolve o relatório
    const relatorioEstoqueHTML = document.getElementById('tabelaRelatorioEstoqueCorpo').closest('.bg-white').innerHTML;
    const relatorioDemandaHTML = document.getElementById('tabelaRelatorioDemandaCorpo').closest('.bg-white').innerHTML;
    
    // 3. Obter imagem do gráfico como Base64
    let graficoImgSrc = '';
    try {
        if (meuGraficoDemanda) {
            // toBase64Image() é um método do Chart.js para exportar o canvas
            graficoImgSrc = meuGraficoDemanda.toBase64Image('image/png');
        }
    } catch (e) {
        console.error("Erro ao converter gráfico para imagem:", e);
        graficoImgSrc = ''; // Continua sem o gráfico se falhar
    }

    // 4. Montar o HTML final do arquivo
    // Inclui a CDN do Tailwind e estilos básicos para garantir a formatação
    const htmlCompleto = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório MedControl</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .bg-white { background-color: #ffffff; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .mb-4 { margin-bottom: 1rem; }
        .text-xl { font-size: 1.25rem; }
        .font-semibold { font-weight: 600; }
        .text-gray-800 { color: #1f2937; }
        .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .lg\\:grid-cols-3 { @media (min-width: 1024px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .lg\\:col-span-1 { @media (min-width: 1024px) { grid-column: span 1 / span 1; } }
        .lg\\:col-span-2 { @media (min-width: 1024px) { grid-column: span 2 / span 2; } }
        .gap-6 { gap: 1.5rem; }
        .h-full { height: 100%; }
        .w-full { width: 100%; }
        .text-lg { font-size: 1.125rem; }
        .text-red-600 { color: #dc2626; }
        .text-blue-600 { color: #2563eb; }
        .mt-2 { margin-top: 0.5rem; }
        .list-disc { list-style-type: disc; }
        .pl-5 { padding-left: 1.25rem; }
        .text-sm { font-size: 0.875rem; }
        .overflow-x-auto { overflow-x: auto; }
        .table-auto { table-layout: auto; }
        .text-left { text-align: left; }
        .bg-gray-100 { background-color: #f3f4f6; }
        .text-gray-600 { color: #4b5563; }
        .p-3 { padding: 0.75rem; }
        .font-medium { font-weight: 500; }
        .text-red-700 { color: #b91c1c; }
        .bg-red-100 { background-color: #fee2e2; }
        .font-bold { font-weight: 700; }
        .text-yellow-600 { color: #d97706; }
        .text-green-600 { color: #16a34a; }
        .whitespace-nowrap { white-space: nowrap; }
        .border-b { border-bottom-width: 1px; }
        .border-gray-200 { border-color: #e5e7eb; }
        .text-center { text-align: center; }
        .text-gray-500 { color: #6b7280; }
        h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #1e3a8a; }
        h3 { font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; }
        h4 { font-size: 1.25rem; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.75rem; border: 1px solid #e5e7eb; text-align: left; }
        thead { background-color: #f3f4f6; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .shadow-md, .shadow { box-shadow: none; }
            .bg-gray-100 { background-color: #f3f4f6 !important; }
            .btn-sucesso, .btn-primario { display: none; }
        }
    </style>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">Relatório de Gestão MedControl</h1>
        
        <div class="bg-white p-4 rounded-xl shadow-md mb-8">
            <h3 class="text-lg font-semibold mb-2">Filtros Aplicados (em ${dataFiltro})</h3>
            <p><strong>UBS:</strong> ${ubsFiltro}</p>
            <p><strong>Data Início Demanda:</strong> ${dataInicioFiltro}</p>
            <p><strong>Data Fim Demanda:</strong> ${dataFimFiltro}</p>
        </div>

        <h3 class="text-xl font-semibold mb-4">Dashboard de Gestão</h3>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-1 space-y-4">
                ${dashboardIndicadoresHTML}
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-md" style="height: 400px;">
                <h4 class="font-semibold text-lg mb-4">Projeção de Demanda (Últimos 30 dias)</h4>
                ${graficoImgSrc ? `<img src="${graficoImgSrc}" alt="Gráfico de Demanda" class="w-full h-full" style="object-fit: contain;">` : '<p class="text-gray-500">Gráfico não pôde ser carregado.</p>'}
            </div>
        </div>

        <div class="space-y-8">
            <div class="bg-white rounded-xl shadow-md overflow-x-auto">
                ${relatorioEstoqueHTML}
            </div>
            <div class="bg-white rounded-xl shadow-md overflow-x-auto">
                ${relatorioDemandaHTML}
            </div>
        </div>
    </div>
</body>
</html>
    `;

    // 5. Criar e acionar o link de download
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_MedControl_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    exibirToast("Relatório baixado com sucesso!");
}
// ***** FIM DA MODIFICAÇÃO *****