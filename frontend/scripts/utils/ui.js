// frontend/scripts/utils/ui.js

/**
 * Fecha todos os modais ativos na página.
 */
export function fecharTodosModais() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('ativo'));
    // Se houver um timer global sendo gerenciado, ele deve ser limpo aqui.
    // Por enquanto, o timer está sendo limpo no módulo que o criou.
}

/**
 * Exibe um toast (notificação flutuante) no canto da tela.
 * @param {string} mensagem - O texto a ser exibido.
 * @param {boolean} [isErro=false] - Se true, exibe o toast com cor de erro.
 */
export function exibirToast(mensagem, isErro = false) {
    const toast = document.createElement('div');
    const corBase = isErro ? 'bg-red-500' : 'bg-green-500';
    toast.className = `fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg ${corBase} z-50`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/**
 * Exibe uma mensagem de feedback (sucesso ou erro) dentro de um modal.
 * @param {HTMLElement} el - O elemento <p> onde a mensagem será exibida.
 * @param {string} texto - O texto da mensagem.
 * @param {boolean} isErro - Define o estilo da mensagem (erro ou sucesso).
 */
export function exibirMensagemNoModal(el, texto, isErro) {
    if (el) {
        el.textContent = texto;
        el.className = 'mensagem ' + (isErro ? 'erro' : 'sucesso');
        el.style.display = 'block';
    }
}

/**
 * Limpa todas as mensagens de erro e classes 'input-error' de um formulário.
 * @param {string} formId - O ID do elemento <form>.
 */
export function limparErrosFormulario(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

/**
 * Inicia um cronômetro regressivo em um elemento da UI.
 * @param {number} duracaoSegundos - Duração total do timer.
 * @param {HTMLElement} timerEl - O elemento <span> que exibirá o tempo.
 * @param {HTMLButtonElement} reenviarBtn - O botão de reenviar, para habilitar no final.
 * @returns {number} - O ID do intervalo (para que possa ser limpo por clearInterval).
 */
export function iniciarTimer(duracaoSegundos, timerEl, reenviarBtn) {
    clearInterval(timerEl.intervalId); // Limpa qualquer timer anterior no elemento
    let tempoRestante = duracaoSegundos;

    if (reenviarBtn) reenviarBtn.disabled = true;

    const atualizarTimer = () => {
        const minutos = Math.floor(tempoRestante / 60).toString().padStart(2, '0');
        const segundos = (tempoRestante % 60).toString().padStart(2, '0');
        
        if(timerEl) timerEl.textContent = `${minutos}:${segundos}`;

        if (tempoRestante <= 0) {
            clearInterval(timerEl.intervalId);
            if(timerEl) timerEl.textContent = "Expirado";
            if (reenviarBtn) reenviarBtn.disabled = false;
        }
        tempoRestante--;
    };

    atualizarTimer(); // Executa imediatamente
    timerEl.intervalId = setInterval(atualizarTimer, 1000);
    
    return timerEl.intervalId;
}

/**
 * ADICIONADO (Item 1): Abre o modal genérico de confirmação.
 * @param {string} titulo
 * @param {string} mensagem
 * @param {function} callback - Função a ser executada ao confirmar.
 * @param {string} [tipo='perigo'] - 'perigo' (vermelho) ou 'primario' (azul)
 */
export function abrirConfirmacao(titulo, mensagem, callback, tipo = 'perigo') {
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    if (!modalConfirmacao) return;

    document.getElementById('tituloConfirmacao').textContent = titulo;
    document.getElementById('mensagemConfirmacao').textContent = mensagem;
    const btnConfirmar = document.getElementById('btnConfirmarAcao');
    
    // Ajusta a cor do botão
    btnConfirmar.classList.remove('btn-perigo', 'btn-primario');
    if (tipo === 'perigo') {
        btnConfirmar.classList.add('btn-perigo');
    } else {
        btnConfirmar.classList.add('btn-primario');
    }
    
    // Clona o botão para remover listeners antigos
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);

    novoBtn.addEventListener('click', () => {
        callback();
        // MODIFICAÇÃO 3: Fecha apenas o modal de confirmação, não todos.
        modalConfirmacao.classList.remove('ativo');
    });
    
    modalConfirmacao.classList.add('ativo');
}