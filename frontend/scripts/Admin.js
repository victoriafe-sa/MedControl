// frontend/scripts/Admin.js
import { verificarAutenticacao, verificarPermissaoAdmin, fazerLogout, getUsuarioAtual } from './utils/auth.js';
import { fecharTodosModais } from './utils/ui.js';
// --- MODIFICADO: Importar init E carregar ---
import { initAdminUsuarios, carregarUsuarios } from './admin/admin-usuarios.js';
import { initAdminPerfil } from './admin/admin-perfil.js';
import { initAdminUbs, carregarUbs } from './admin/admin-ubs.js';
import { initAdminFarmaceuticos, carregarFarmaceuticos } from './admin/admin-farmaceuticos.js';
import { initAdminMedicamentos, carregarDadosMedicamentos } from './admin/admin-medicamentos.js';
import { initAdminAuditoria, carregarLogs } from './admin/admin-auditoria.js';
import { initAdminValidacao, carregarDadosValidacao } from './admin/admin-validacao.js';
import { initAdminRelatorios, carregarTodosRelatorios } from './admin/admin-relatorios.js';

// --- Mapeamento de inicialização (só roda 1 vez para configurar listeners) ---
const funcoesInitAba = {
    'usuarios': initAdminUsuarios,
    'medicamentos': initAdminMedicamentos,
    'ubs': initAdminUbs,
    'farmaceuticos': initAdminFarmaceuticos,
    'validacao': initAdminValidacao,
    'relatorios': initAdminRelatorios,
    'auditoria': initAdminAuditoria,
};

// --- Mapeamento de recarga (roda toda vez que a aba é ativada) ---
const funcoesRecarregarAba = {
    'usuarios': carregarUsuarios,
    'medicamentos': carregarDadosMedicamentos,
    'ubs': carregarUbs,
    'farmaceuticos': carregarFarmaceuticos,
    'validacao': carregarDadosValidacao,
    'relatorios': carregarTodosRelatorios,
    'auditoria': carregarLogs,
};


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
            'farmaceuticos': document.querySelector('[data-aba="farmaceuticos"]'),
            'validacao': document.querySelector('[data-aba="validacao"]'),
            'relatorios': document.querySelector('[data-aba="relatorios"]'),
            'auditoria': document.querySelector('[data-aba="auditoria"]')
        };

        const permissoes = {
            // --- INÍCIO DA MODIFICAÇÃO RF05/RF08 ---
            'admin': ['usuarios', 'medicamentos', 'ubs', 'farmaceuticos', 'validacao', 'relatorios', 'auditoria'],
            'farmaceutico': ['validacao'], // Pode validar receita (RF05.5) e registrar retirada (RF05.6)
            'gestor_estoque': ['medicamentos'], // Pode ver medicamentos/estoque
            'gestor_ubs': ['ubs', 'medicamentos', 'validacao', 'relatorios'] // Modificado RF09 e RF5.6
            // --- FIM DA MODIFICAÇÃO RF05/RF08 ---
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

            // --- MODIFICADO: Inicializa TODOS os módulos permitidos de uma vez ---
            abasVisiveis.forEach(nomeAba => {
                const initFn = funcoesInitAba[nomeAba];
                if (initFn) {
                    initFn(getUsuarioAtual()); // Roda a inicialização (seta listeners)
                }
            });

            // Carrega os dados da primeira aba visível
            const recarregarFn = funcoesRecarregarAba[primeiraAba];
            if (recarregarFn) {
                recarregarFn();
            }
        }
    };

    // --- Navegação ---
    document.getElementById('btnSair').addEventListener('click', fazerLogout);

    document.querySelectorAll('.btn-aba').forEach(aba => {
        aba.addEventListener('click', () => {
            const nomeAba = aba.dataset.aba;
            
            // --- Se a aba já está ativa, não faz nada ---
            if (aba.classList.contains('ativo')) return;

            document.querySelectorAll('.btn-aba').forEach(a => a.classList.remove('ativo'));
            document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativo'));
            
            aba.classList.add('ativo');
            const conteudoId = `conteudo-${nomeAba}`;
            const conteudoEl = document.getElementById(conteudoId);
            if (conteudoEl) {
                conteudoEl.classList.add('ativo');
            }
            
            // --- MODIFICADO: Chama a função de recarregar dados CADA VEZ que a aba é clicada ---
            const recarregarFn = funcoesRecarregarAba[nomeAba];
            if (recarregarFn) {
                recarregarFn();
            }
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