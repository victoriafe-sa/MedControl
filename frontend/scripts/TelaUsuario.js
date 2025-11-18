// frontend/scripts/TelaUsuario.js
import { verificarAutenticacao, fazerLogout, getUsuarioAtual } from './utils/auth.js';
import { fecharTodosModais } from './utils/ui.js';
import { initUsuarioPerfil, renderizarPerfil } from './usuario/usuario-perfil.js';
import { initUsuarioBusca } from './usuario/usuario-busca.js';
// --- ADIÇÃO RF07 ---
// Importa as funções do novo módulo de reservas
import { initUsuarioReservas, renderizarReservas } from './usuario/usuario-reservas.js';
// --- FIM DA ADIÇÃO RF07 ---

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    const usuarioAtual = verificarAutenticacao();
    if (!usuarioAtual) return;

    // ... (código original de verificação de admin) ...

    // --- Renderização Inicial ---
    document.getElementById('userInfoSidebar').innerHTML = `<p class="font-semibold text-gray-800">${usuarioAtual.nome}</p><p class="text-gray-600">${usuarioAtual.email}</p>`;
    
    // --- NAVEGAÇÃO DA BARRA LATERAL ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentPanels = document.querySelectorAll('.conteudo-principal');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const aba = link.dataset.aba;
            
            sidebarLinks.forEach(l => l.classList.remove('ativo'));
            link.classList.add('ativo');
            
            contentPanels.forEach(p => p.classList.add('hidden'));
            const painelAtivo = document.getElementById(`conteudo-${aba}`);
            if (painelAtivo) {
                painelAtivo.classList.remove('hidden');
            }
            
            // --- MODIFICAÇÃO RF07 ---
            // Adiciona a chamada de renderização para a nova aba de reservas
            if (aba === 'perfil') {
                renderizarPerfil();
            } else if (aba === 'reservas') {
                // Chama a função importada do novo módulo
                renderizarReservas(); 
            }
            // --- FIM DA MODIFICAÇÃO RF07 ---
        });
    });

    // --- LOGOUT ---
    document.getElementById('btnSair').addEventListener('click', fazerLogout);

    // --- INICIALIZAÇÃO DOS MÓDULOS ---
    initUsuarioPerfil(usuarioAtual);
    initUsuarioBusca();
    // --- ADIÇÃO RF07 ---
    // Inicializa o novo módulo de reservas
    initUsuarioReservas(usuarioAtual);
    // --- FIM DA ADIÇÃO RF07 ---
    
    // --- PLACEHOLDERS (MODIFICADO) ---
    // --- MODIFICAÇÃO RF07 ---
    // Remove o placeholder de 'renderizarReservas', pois agora ele é um módulo real.
    // const renderizarReservas = () => { ... }; // <- REMOVIDO
    // --- FIM DA MODIFICAÇÃO RF07 ---
    const renderizarFavoritos = () => { document.getElementById('conteudo-favoritos').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Favoritos</h2><p class="mt-4 text-lg">Seus medicamentos favoritados aparecerão aqui para fácil acesso.</p></div>'; };
    const renderizarHistorico = () => { document.getElementById('conteudo-historico').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Histórico</h2><p class="mt-4 text-lg">Seu histórico de medicamentos retirados será exibido aqui.</p></div>'; };
    const renderizarNotificacoes = () => { document.getElementById('conteudo-notificacoes').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Notificações</h2><p class="mt-4 text-lg">Alertas e lembretes importantes sobre suas reservas e medicamentos.</p></div>'; };

    // renderizarReservas(); // <- REMOVIDO
    renderizarFavoritos();
    renderizarHistorico();
    renderizarNotificacoes();

    // --- EVENTOS DE FECHAR MODAIS ---
    // (Nenhuma alteração nesta seção)
    document.querySelectorAll('.btnFecharModal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            fecharTodosModais();
        }
    });
});