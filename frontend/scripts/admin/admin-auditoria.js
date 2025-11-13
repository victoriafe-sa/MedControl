// frontend/scripts/admin/admin-auditoria.js
import { api } from '../utils/api.js';
import { exibirToast } from '../utils/ui.js';

let corpoTabelaAuditoria;

async function carregarLogs() {
    if (!corpoTabelaAuditoria) return;
    corpoTabelaAuditoria.innerHTML = `<tr><td colspan="6" class="p-4 text-center">Carregando logs...</td></tr>`;

    try {
        const logs = await api.listarLogsAuditoria();
        
        if (logs.length === 0) {
            corpoTabelaAuditoria.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum log de auditoria encontrado.</td></tr>`;
            return;
        }

        corpoTabelaAuditoria.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-200`;

            // Formata a data
            const dataLog = new Date(log.data_log).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'America/Sao_Paulo' // Ajuste para o fuso horário de Brasília
            });

            // Formata os detalhes para exibição
            let detalhes = log.detalhes || '{}';
            try {
                // Tenta formatar o JSON para melhor leitura
                const obj = JSON.parse(detalhes);
                detalhes = Object.entries(obj)
                    .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                    .join('<br>');
            } catch (e) {
                // Se não for JSON, apenas exibe o texto
                detalhes = log.detalhes;
            }

            tr.innerHTML = `
                <td class="p-3 text-sm whitespace-nowrap">${dataLog}</td>
                <td class="p-3 text-sm">${log.nome_usuario} (ID: ${log.id_usuario || 'N/A'})</td>
                <td class="p-3 text-sm font-medium">${log.acao}</td>
                <td class="p-3 text-sm text-gray-600">${log.tabela_afetada}</td>
                <td class="p-3 text-sm text-gray-600">${log.registro_id}</td>
                <td class="p-3 text-xs text-gray-700" style="max-width: 300px; overflow-wrap: break-word;">${detalhes}</td>
            `;
            corpoTabelaAuditoria.appendChild(tr);
        });

    } catch (erro) {
        corpoTabelaAuditoria.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar logs.'}</td></tr>`;
        exibirToast(`Erro ao carregar logs: ${erro.message}`, true);
    }
}

export function initAdminAuditoria(usuarioLogado) {
    corpoTabelaAuditoria = document.getElementById('corpoTabelaAuditoria');
    const btnRecarregarLogs = document.getElementById('btnRecarregarLogs');

    if (!corpoTabelaAuditoria || !btnRecarregarLogs) {
        console.error('Elementos da aba Auditoria não encontrados.');
        return;
    }

    // Apenas 'admin' pode ver auditoria (conforme Admin.js)
    if (usuarioLogado.perfil !== 'admin') {
        document.getElementById('conteudo-auditoria').innerHTML = '<p class="text-red-500">Acesso negado.</p>';
        return;
    }

    btnRecarregarLogs.addEventListener('click', carregarLogs);

    carregarLogs();
}