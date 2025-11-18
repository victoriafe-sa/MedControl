// frontend/scripts/utils/api.js
// --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
// Importa a função para buscar o usuário logado
import { getUsuarioAtual } from './auth.js';
// --- FIM DA MODIFICAÇÃO ---

const BASE_URL = 'http://localhost:7071/api';

/**
 * Função base para requisições fetch, tratando erros comuns.
 * @param {string} endpoint - O endpoint da API (ex: /login)
 * @param {object} options - As opções do fetch (method, headers, body)
 * @returns {Promise<object>} - O JSON da resposta
 * @throws {Error} - Lança um erro se a requisição falhar
 */
async function fetchApi(endpoint, options = {}) {
    try {
        // --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
        // Adiciona o ID do usuário logado ao header para auditoria
        const usuarioLogado = getUsuarioAtual();
        if (usuarioLogado && usuarioLogado.id) {
            // Garante que o objeto headers exista
            if (!options.headers) {
                options.headers = {};
            }
            // Adiciona o ID do usuário em um header customizado
            // O backend irá ler este header para salvar o log de auditoria
            options.headers['X-User-ID'] = usuarioLogado.id;
        }
        // --- FIM DA MODIFICAÇÃO ---

        const response = await fetch(`${BASE_URL}${endpoint}`, options);

        // Tenta pegar o JSON mesmo se a resposta não for ok (para mensagens de erro)
        const data = await response.json();

        if (!response.ok) {
            // Usa a mensagem do backend se disponível, senão uma padrão
            const error = new Error(data.message || data.erro || `Erro ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data; // Anexa dados extras (ex: { field: 'email' })
            throw error;
        }

        return data;
    } catch (error) {
        // Se 'error' já for um erro customizado, apenas o relança
        if (error.status) {
            throw error;
        }
        // Se for um erro de rede (ex: servidor offline)
        console.error('Erro de conexão:', error);
        throw new Error('Erro de conexão com o servidor.');
    }
}

// Opções padrão para requisições POST/PUT
const defaultPostOptions = (dados) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
});

const defaultPutOptions = (dados) => ({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
});

export const api = {
    /**
     * Autentica um usuário.
     * @param {string} emailOuCpf
     * @param {string} senha
     */
    login: (emailOuCpf, senha) => {
        return fetchApi('/login', defaultPostOptions({ emailOuCpf, senha }));
    },

    /**
     * Verifica a existência de email ou CPF/CNS.
     * @param {string} email
     * @param {string} cpf_cns
     * @param {string|number|null} id - O ID do usuário a ser ignorado na verificação (para edições)
     */
    verificarExistencia: (email, cpf_cns, id = null) => {
        return fetchApi('/usuarios/verificar-existencia', defaultPostOptions({ email, cpf_cns, id }));
    },

    /**
     * Solicita o envio de um código de verificação por e-mail.
     * @param {string} email
     * @param {string} motivo - 'cadastro', 'recuperacao', 'alteracao'
     */
    enviarCodigoVerificacao: (email, motivo) => {
        return fetchApi('/usuarios/enviar-codigo-verificacao', defaultPostOptions({ email, motivo }));
    },

    /**
     * Verifica se um código de verificação é válido.
     * @param {string} email
     * @param {string} codigo
     */
    verificarCodigo: (email, codigo) => {
        return fetchApi('/usuarios/verificar-codigo', defaultPostOptions({ email, codigo }));
    },

    /**
     * Registra um novo usuário (usado pelo Admin).
     * @param {object} dadosUsuario - Dados completos do usuário, incluindo senha e codigoVerificacao
     */
    registrarAdmin: (dadosUsuario) => {
        return fetchApi('/users', defaultPostOptions(dadosUsuario));
    },

    /**
     * Atualiza um usuário sem verificação de e-mail (quando o e-mail não muda).
     * @param {string|number} id
     * @param {object} dadosUsuario - Dados do usuário (sem senha)
     */
    atualizarUsuario: (id, dadosUsuario) => {
        return fetchApi(`/users/${id}`, defaultPutOptions(dadosUsuario));
    },

    /**
     * Atualiza um usuário COM verificação de e-mail (quando o e-mail muda).
     * @param {string|number} id
     * @param {object} dadosUsuario - Dados do usuário, incluindo codigoVerificacao
     */
    atualizarUsuarioComVerificacao: (id, dadosUsuario) => {
        return fetchApi(`/users/${id}/update-verified`, defaultPutOptions(dadosUsuario));
    },

    /**
     * Busca todos os usuários.
     */
    listarUsuarios: () => {
        return fetchApi('/users');
    },

    /**
     * Altera o status (ativo/inativo) de um usuário.
     * @param {string|number} id
     * @param {boolean} novoStatus
     */
    alterarStatusUsuario: (id, novoStatus) => {
        return fetchApi(`/users/${id}/status`, defaultPutOptions({ ativo: novoStatus }));
    },

    /**
     * Exclui um usuário.
     * @param {string|number} id
     */
    excluirUsuario: (id) => {
        return fetchApi(`/users/${id}`, { method: 'DELETE' });
    },

    /**
     * Verifica a senha do usuário logado (Admin ou Usuário).
     * @param {string|number} adminId - ID do usuário logado
     * @param {string} password - Senha do usuário logado
     */
    verificarSenha: (adminId, password) => {
        return fetchApi('/admin/verify-password', defaultPostOptions({ adminId, password }));
    },

    /**
     * Redefine a senha do usuário (estando logado).
     * @param {string|number} id
     * @param {string} senhaAtual
     * @param {string} novaSenha
     */
    redefinirSenhaLogado: (id, senhaAtual, novaSenha) => {
        return fetchApi(`/users/${id}/redefine-password`, defaultPostOptions({ senhaAtual, novaSenha }));
    },

    /**
     * Consulta a API ViaCEP.
     * @param {string} cep
     */
    validarCep: (cep) => {
        return fetchApi(`/cep/${cep}`);
    },

    // --- NOVAS FUNÇÕES RF03 (UBS) ---
    listarUbs: () => fetchApi('/ubs'),
    cadastrarUbs: (dados) => fetchApi('/ubs', defaultPostOptions(dados)),
    atualizarUbs: (id, dados) => fetchApi(`/ubs/${id}`, defaultPutOptions(dados)),
    excluirUbs: (id) => fetchApi(`/ubs/${id}`, { method: 'DELETE' }),

    // --- NOVAS FUNÇÕES RF04 (Medicamento Base) ---
    listarMedicamentos: () => fetchApi('/medicamentos'),
    cadastrarMedicamento: (dados) => fetchApi('/medicamentos', defaultPostOptions(dados)),
    atualizarMedicamento: (id, dados) => fetchApi(`/medicamentos/${id}`, defaultPutOptions(dados)),
    excluirMedicamento: (id) => fetchApi(`/medicamentos/${id}`, { method: 'DELETE' }),
    alterarStatusMedicamento: (id, novoStatus) => {
        return fetchApi(`/medicamentos/${id}/status`, defaultPutOptions({ ativo: novoStatus }));
    },

    // --- NOVAS FUNÇÕES RF04 (Estoque) ---
    listarEstoque: () => fetchApi('/estoque'),
    cadastrarEstoque: (dados) => fetchApi('/estoque', defaultPostOptions(dados)),
    atualizarEstoque: (id, dados) => fetchApi(`/estoque/${id}`, defaultPutOptions(dados)),
    excluirEstoque: (id) => fetchApi(`/estoque/${id}`, { method: 'DELETE' }),
    verificarLote: (dados) => fetchApi('/estoque/verificar-lote', defaultPostOptions(dados)),

    // --- FUNÇÕES RF05.1-RF05.4 (Farmacêuticos) ---
    listarFarmaceuticos: () => fetchApi('/farmaceuticos'),
    cadastrarFarmaceutico: (dados) => fetchApi('/farmaceuticos', defaultPostOptions(dados)),
    atualizarFarmaceutico: (id, dados) => fetchApi(`/farmaceuticos/${id}`, defaultPutOptions(dados)),
    excluirFarmaceutico: (id) => fetchApi(`/farmaceuticos/${id}`, { method: 'DELETE' }),

    // --- FUNÇÃO RF05.5 (Validar Receita) ---
    validarReceita: (codigo) => fetchApi(`/receitas/validar/${codigo}`),
    
    // --- RF08.4: AUDITORIA ---
    listarLogsAuditoria: () => fetchApi('/auditoria'),
    
    // --- ADICIONADO RF10: REGISTRAR RETIRADA ---
    registrarRetirada: (dados) => fetchApi('/retiradas', defaultPostOptions(dados)),

    // --- ADICIONADO RF06: BUSCAR MEDICAMENTO (PARA LOG) ---
    buscarMedicamento: (nome) => fetchApi(`/medicamentos/search?nome=${encodeURIComponent(nome)}`),

    // --- ADICIONADO RF09: RELATÓRIOS ---
    getRelatorioEstoque: (ubs_id) => fetchApi(`/relatorios/estoque?ubs_id=${ubs_id}`),
    getRelatorioDemanda: (inicio, fim) => fetchApi(`/relatorios/demanda?inicio=${inicio}&fim=${fim}`),
    getIndicadoresDashboard: () => fetchApi('/dashboard/indicadores'),

    // --- INÍCIO DA ADIÇÃO (RF07) ---
    // Adiciona os 4 métodos necessários para o RF07
    
    /**
     * Cria uma nova reserva. (RF07.1) [cite_start][cite: 878-883]
     * POST /api/reservas
     * @param {object} dadosReserva - { id_medicamento, id_ubs, quantidadeReservada, dataHoraReserva }
     */
    criarReserva: (dadosReserva) => {
        return fetchApi('/reservas', defaultPostOptions(dadosReserva));
    },

    /**
     * Busca as reservas do usuário logado. (RF07.2) [cite_start][cite: 884-886]
     * GET /api/usuarios/me/reservas
     */
    consultarReservas: () => {
        return fetchApi('/usuarios/me/reservas');
    },

    /**
     * Cancela uma reserva ativa. (RF07.3) [cite_start][cite: 887-890]
     * PUT /api/reservas/{id}/cancelar
     * @param {string|number} id 
     */
    cancelarReserva: (id) => {
        // Envia um PUT sem corpo
        return fetchApi(`/reservas/${id}/cancelar`, { method: 'PUT' });
    },

    /**
     * Reagenda uma reserva ativa. (RF07.4) [cite_start][cite: 891-894]
     * PUT /api/reservas/{id}/reagendar
     * @param {string|number} id 
     * @param {object} dadosReagendamento - { novaDataHora: "YYYY-MM-DDTHH:MM" }
     */
    reagendarReserva: (id, dadosReagendamento) => {
        return fetchApi(`/reservas/${id}/reagendar`, defaultPutOptions(dadosReagendamento));
    }
    // --- FIM DA ADIÇÃO (RF07) ---
};