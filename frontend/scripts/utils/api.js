// frontend/scripts/utils/api.js

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
        const response = await fetch(`${BASE_URL}${endpoint}`, options);

        // Tenta pegar o JSON mesmo se a resposta não for ok (para mensagens de erro)
        const data = await response.json();

        if (!response.ok) {
            // Usa a mensagem do backend se disponível, senão uma padrão
            const error = new Error(data.message || `Erro ${response.status}: ${response.statusText}`);
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

export const api = {
    /**
     * Autentica um usuário.
     * @param {string} emailOuCpf
     * @param {string} senha
     */
    login: (emailOuCpf, senha) => {
        return fetchApi('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOuCpf, senha })
        });
    },

    /**
     * Verifica a existência de email ou CPF/CNS.
     * @param {string} email
     * @param {string} cpf_cns
     * @param {string|number|null} id - O ID do usuário a ser ignorado na verificação (para edições)
     */
    verificarExistencia: (email, cpf_cns, id = null) => {
        return fetchApi('/usuarios/verificar-existencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, cpf_cns, id })
        });
    },

    /**
     * Solicita o envio de um código de verificação por e-mail.
     * @param {string} email
     * @param {string} motivo - 'cadastro', 'recuperacao', 'alteracao'
     */
    enviarCodigoVerificacao: (email, motivo) => {
        return fetchApi('/usuarios/enviar-codigo-verificacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, motivo })
        });
    },

    /**
     * Verifica se um código de verificação é válido.
     * @param {string} email
     * @param {string} codigo
     */
    verificarCodigo: (email, codigo) => {
        return fetchApi('/usuarios/verificar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, codigo })
        });
    },

    /**
     * Registra um novo usuário (usado pelo Admin).
     * @param {object} dadosUsuario - Dados completos do usuário, incluindo senha e codigoVerificacao
     */
    registrarAdmin: (dadosUsuario) => {
        return fetchApi('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosUsuario)
        });
    },

    /**
     * Atualiza um usuário sem verificação de e-mail (quando o e-mail não muda).
     * @param {string|number} id
     * @param {object} dadosUsuario - Dados do usuário (sem senha)
     */
    atualizarUsuario: (id, dadosUsuario) => {
        return fetchApi(`/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosUsuario)
        });
    },

    /**
     * Atualiza um usuário COM verificação de e-mail (quando o e-mail muda).
     * @param {string|number} id
     * @param {object} dadosUsuario - Dados do usuário, incluindo codigoVerificacao
     */
    atualizarUsuarioComVerificacao: (id, dadosUsuario) => {
        return fetchApi(`/users/${id}/update-verified`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosUsuario)
        });
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
        return fetchApi(`/users/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: novoStatus })
        });
    },

    /**
     * Exclui um usuário.
     * @param {string|number} id
     */
    excluirUsuario: (id) => {
        return fetchApi(`/users/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * Verifica a senha do usuário logado (Admin ou Usuário).
     * @param {string|number} adminId - ID do usuário logado
     * @param {string} password - Senha do usuário logado
     */
    verificarSenha: (adminId, password) => {
        // O endpoint /api/admin/verify-password funciona para qualquer usuário
        return fetchApi('/admin/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId, password })
        });
    },

    /**
     * Redefine a senha do usuário (estando logado).
     * @param {string|number} id
     * @param {string} senhaAtual
     * @param {string} novaSenha
     */
    redefinirSenhaLogado: (id, senhaAtual, novaSenha) => {
        return fetchApi(`/users/${id}/redefine-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senhaAtual, novaSenha })
        });
    },

    /**
     * Consulta a API ViaCEP.
     * @param {string} cep
     */
    validarCep: (cep) => {
        return fetchApi(`/cep/${cep}`);
    }
};
