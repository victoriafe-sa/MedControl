// frontend/scripts/Admin.js
import { verificarAutenticacao, verificarPermissaoAdmin, fazerLogout, getUsuarioAtual } from './utils/auth.js';
import { fecharTodosModais } from './utils/ui.js';
import { initAdminUsuarios } from './admin/admin-usuarios.js';
import { initAdminPerfil } from './admin/admin-perfil.js';
import { initAdminUbs } from './admin/admin-ubs.js'; // <-- NOVO
import { initAdminMedicamentos } from './admin/admin-medicamentos.js'; // <-- NOVO
import { initAdminAuditoria } from './admin/admin-auditoria.js'; // <-- ADICIONADO RF08.3

document.addEventListener('DOMContentLoaded', () => {
    // --- Autenticação e Inicialização ---
    const usuarioAtual = verificarAutenticacao();
    if (!usuarioAtual) return;
    if (!verificarPermissaoAdmin(usuarioAtual)) return;

    document.getElementById('boasVindasAdmin').textContent = `Olá, ${usuarioAtual.nome.split(' ')[0]}!`;

    // --- Lógica de Visibilidade das Abas ---
    const configurarVisibilidadeAbas = (perfil) => {
        const abas = {
            'usuarios': document.querySelector('[data-aba="usuarios"]'),
            'medicamentos': document.querySelector('[data-aba="medicamentos"]'),
            'ubs': document.querySelector('[data-aba="ubs"]'),
            'validacao': document.querySelector('[data-aba="validacao"]'),
            'relatorios': document.querySelector('[data-aba="relatorios"]'),
            'auditoria': document.querySelector('[data-aba="auditoria"]')
        };

        const permissoes = {
            'admin': ['usuarios', 'medicamentos', 'ubs', 'validacao', 'relatorios', 'auditoria'],
            'farmaceutico': ['validacao'],
            'gestor_estoque': ['medicamentos'], // Pode ver medicamentos/estoque
            'gestor_ubs': ['ubs', 'medicamentos', 'relatorios'] // Pode ver ubs, estoque e validação 
        };

        // Esconde todas as abas e conteúdos primeiro
        Object.values(abas).forEach(aba => {
            if (aba) aba.style.display = 'none';
        });
        document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativo'));

        const abasVisiveis = permissoes[perfil] || [];
        
        // Mostra as abas permitidas
        abasVisiveis.forEach(nomeAba => {
            if (abas[nomeAba]) {
                abas[nomeAba].style.display = ''; // Reseta para o padrão
            }
        });

        // Ativa a primeira aba visível
        if (abasVisiveis.length > 0) {
            const primeiraAba = abasVisiveis[0];
            const primeiraAbaBtn = abas[primeiraAba];
            const primeiroConteudo = document.getElementById(`conteudo-${primeiraAba}`);

            document.querySelectorAll('.btn-aba').forEach(a => a.classList.remove('ativo'));
            if (primeiraAbaBtn) primeiraAbaBtn.classList.add('ativo');
            if (primeiroConteudo) primeiroConteudo.classList.add('ativo');

            // Inicializa o módulo da primeira aba ativa
            inicializarModuloAba(primeiraAba, primeiraAbaBtn);
        }
    };

    // --- Inicialização de Módulos ---
    const inicializarModuloAba = (nomeAba, abaBtn) => {
        if (abaBtn && abaBtn.dataset.initialized) return; // Já inicializado

        if (nomeAba === 'usuarios') {
            initAdminUsuarios(getUsuarioAtual());
        } else if (nomeAba === 'medicamentos') {
            initAdminMedicamentos(getUsuarioAtual());
        } else if (nomeAba === 'ubs') {
            initAdminUbs(getUsuarioAtual());
        } else if (nomeAba === 'auditoria') { // <-- ADICIONADO RF08.3
            initAdminAuditoria(getUsuarioAtual()); // <-- ADICIONADO RF08.3
        }

        if (abaBtn) abaBtn.dataset.initialized = true;
    };


    // --- Navegação ---
    document.getElementById('btnSair').addEventListener('click', fazerLogout);

    document.querySelectorAll('.btn-aba').forEach(aba => {
        aba.addEventListener('click', () => {
            document.querySelectorAll('.btn-aba').forEach(a => a.classList.remove('ativo'));
            document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativo'));
            aba.classList.add('ativo');
            const conteudoId = `conteudo-${aba.dataset.aba}`;
            const conteudoEl = document.getElementById(conteudoId);
            if (conteudoEl) {
                conteudoEl.classList.add('ativo');
            }
            
            // Inicializa o módulo da aba clicada (apenas na primeira vez)
            inicializarModuloAba(aba.dataset.aba, aba);
        });
    });

    // --- Inicialização dos Módulos ---
    configurarVisibilidadeAbas(usuarioAtual.perfil);
    
    // Inicializa o módulo de perfil (que cuida do botão "Meu Perfil")
    initAdminPerfil(usuarioAtual);
    
    // Adiciona listeners para fechar modais
    document.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    document.getElementById('btnCancelarConfirmacao').addEventListener('click', fecharTodosModais);
});