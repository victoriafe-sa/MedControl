// frontend/scripts/utils/auth.js

const USUARIO_STORAGE_KEY = 'medControlUser';

/**
 * Obtém os dados do usuário logado do sessionStorage.
 * @returns {object|null} - O objeto do usuário ou null se não estiver logado.
 */
export function getUsuarioAtual() {
    const dadosUsuario = sessionStorage.getItem(USUARIO_STORAGE_KEY);
    return dadosUsuario ? JSON.parse(dadosUsuario) : null;
}

/**
 * Salva os dados do usuário no sessionStorage.
 * @param {object} usuario - O objeto do usuário.
 */
export function salvarUsuarioSession(usuario) {
    sessionStorage.setItem(USUARIO_STORAGE_KEY, JSON.stringify(usuario));
}

/**
 * Remove os dados do usuário do sessionStorage e redireciona para a Home.
 */
export function fazerLogout() {
    sessionStorage.removeItem(USUARIO_STORAGE_KEY);
    window.location.href = 'Home.html';
}

/**
 * Verifica se o usuário está autenticado. Redireciona se não estiver.
 * @returns {object|null} - O objeto do usuário se estiver logado, ou null e redireciona.
 */
export function verificarAutenticacao() {
    const usuario = getUsuarioAtual();
    if (!usuario) {
        window.location.href = 'TelaLoginCadastro.html';
        return null;
    }
    return usuario;
}

/**
 * Verifica se o usuário autenticado tem permissão para acessar a página de gerenciamento.
 * @param {object} usuario - O objeto do usuário logado.
 */
export function verificarPermissaoAdmin(usuario) {
    const perfisGerenciamento = ['admin', 'farmaceutico', 'gestor_ubs', 'gestor_estoque'];
    if (!usuario || !perfisGerenciamento.includes(usuario.perfil)) {
        window.location.href = 'TelaUsuario.html';
        return false;
    }
    return true;
}
