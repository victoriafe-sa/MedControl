// frontend/scripts/TelaUsuario.js
import { verificarAutenticacao, fazerLogout, getUsuarioAtual } from './utils/auth.js';
import { fecharTodosModais } from './utils/ui.js';
import { initUsuarioPerfil, renderizarPerfil } from './usuario/usuario-perfil.js';
import { initUsuarioBusca } from './usuario/usuario-busca.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    const usuarioAtual = verificarAutenticacao();
    if (!usuarioAtual) return;

    // Se for um perfil de admin, redireciona para o painel de admin
    const perfisGerenciamento = ['admin', 'farmaceutico', 'gestor_ubs', 'gestor_estoque'];
    if (perfisGerenciamento.includes(usuarioAtual.perfil)) {
        window.location.href = 'Admin.html';
        return;
    }

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
            
            // Re-renderiza o perfil toda vez que a aba é clicada (para garantir dados atualizados)
            if (aba === 'perfil') {
                renderizarPerfil();
            }
        });
    });

    // --- LOGOUT ---
    document.getElementById('btnSair').addEventListener('click', fazerLogout);

    // --- INICIALIZAÇÃO DOS MÓDULOS ---
    initUsuarioPerfil(usuarioAtual);
    initUsuarioBusca();
    
    // --- PLACEHOLDERS (serão movidos para seus próprios módulos no futuro) ---
    const renderizarReservas = () => { document.getElementById('conteudo-reservas').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Minhas Reservas</h2><p class="mt-4 text-lg">Suas reservas de medicamentos aparecerão aqui.</p></div>'; };
    const renderizarFavoritos = () => { document.getElementById('conteudo-favoritos').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Favoritos</h2><p class="mt-4 text-lg">Seus medicamentos favoritados aparecerão aqui para fácil acesso.</p></div>'; };
    const renderizarHistorico = () => { document.getElementById('conteudo-historico').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Histórico</h2><p class="mt-4 text-lg">Seu histórico de medicamentos retirados será exibido aqui.</p></div>'; };
    const renderizarNotificacoes = () => { document.getElementById('conteudo-notificacoes').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Notificações</h2><p class="mt-4 text-lg">Alertas e lembretes importantes sobre suas reservas e medicamentos.</p></div>'; };

    renderizarReservas();
    renderizarFavoritos();
    renderizarHistorico();
    renderizarNotificacoes();

    // --- EVENTOS DE FECHAR MODAIS ---
    document.querySelectorAll('.btnFecharModal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    
    // Listener para fechar modal clicando fora (se necessário)
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            fecharTodosModais();
        }
    });
});
