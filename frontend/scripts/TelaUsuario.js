document.addEventListener('DOMContentLoaded', () => {
    let usuarioAtual = null;

    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    function verificarAutenticacao() {
        const dadosUsuario = sessionStorage.getItem('medControlUser');
        if (!dadosUsuario) {
            window.location.href = 'TelaLoginCadastro.html';
            return;
        }
        usuarioAtual = JSON.parse(dadosUsuario);
        document.getElementById('mensagemBoasVindas').textContent = `Bem-vindo(a), ${usuarioAtual.nome.split(' ')[0]}!`;
        renderizarPerfil();
    }

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('medControlUser');
        window.location.href = 'Home.html';
    });
    
    // --- ESTADO & DADOS ---
    let reservasUsuario = [ { id: 1, nome: 'Paracetamol 500mg', ubs: 'UBS 01 - Asa Sul' } ];
    let favoritosUsuario = [ { id: 5, nome: 'Losartana 50mg', ubs: 'UBS 03 - Guará II' } ];
    const historicoUsuario = [ { nome: 'Dipirona 1g', ubs: 'UBS 01 - Asa Sul', data: '15/08/2025'}];
    const notificacoesUsuario = [
        { tipo: 'lembrete', texto: 'Lembrete: Sua reserva de Paracetamol 500mg está pronta para retirada amanhã na UBS 01 - Asa Sul.' },
        { tipo: 'estoque', texto: 'O medicamento Losartana 50mg está disponível novamente na UBS 03 - Guará II.' },
    ];
    const dadosMock = [
        { id: 1, nome: 'Paracetamol 500mg', ubs: 'UBS 01 - Asa Sul', endereco: 'Quadra 614 Sul, Brasília - DF', estoque: 150 },
        { id: 2, nome: 'Ibuprofeno 400mg', ubs: 'UBS 02 - Taguatinga Centro', endereco: 'QNC AE 1, Taguatinga - DF', estoque: 80 },
        { id: 3, nome: 'Amoxicilina 250mg', ubs: 'UBS 05 - Ceilândia Norte', endereco: 'QNN 15, Ceilândia - DF', estoque: 0 },
        { id: 4, nome: 'Dipirona 1g', ubs: 'UBS 01 - Asa Sul', endereco: 'Quadra 614 Sul, Brasília - DF', estoque: 200 },
        { id: 5, nome: 'Losartana 50mg', ubs: 'UBS 03 - Guará II', endereco: 'QE 23, Guará II - DF', estoque: 120 },
    ];

    // --- ELEMENTOS DOM ---
    const containerResultados = document.getElementById('containerResultados'), mensagemStatus = document.getElementById('mensagemStatus');
    const modalEditarPerfil = document.getElementById('modalEditarPerfil'), modalConfirmacao = document.getElementById('modalConfirmacao');
    const conteudoReservas = document.getElementById('conteudo-reservas');
    const conteudoFavoritos = document.getElementById('conteudo-favoritos');
    const conteudoHistorico = document.getElementById('conteudo-historico');
    const conteudoNotificacoes = document.getElementById('conteudo-notificacoes');
    const conteudoPerfil = document.getElementById('conteudo-perfil');
    
    // --- FUNÇÕES ---
    const abrirModal = (modal) => modal.classList.add('ativo');
    const fecharModal = (modal) => modal.classList.remove('ativo');
    
    const exibirToast = (mensagem) => {
        const toast = document.createElement('div');
        toast.className = `fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg bg-green-500`;
        toast.textContent = mensagem; document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    const renderizarPerfil = () => {
        conteudoPerfil.innerHTML = `
            <div><label class="font-semibold">Nome:</label><span id="displayNomeUsuario"> ${usuarioAtual.nome}</span></div>
            <div><label class="font-semibold">Email:</label><span id="displayEmailUsuario"> ${usuarioAtual.email}</span></div>
             <div><label class="font-semibold">CPF/CNS:</label><span> ${usuarioAtual.cpf_cns}</span></div>
            <div><label class="font-semibold">CEP:</label><span> ${usuarioAtual.cep}</span></div>
            <div><label class="font-semibold">Data de Nascimento:</label><span> ${new Date(usuarioAtual.data_nascimento).toLocaleDateString('pt-BR')}</span></div>
            <div class="mt-4">
                 <button id="btnEditarPerfil" class="btn-primario py-2 px-4 rounded-lg text-sm">Editar Perfil</button>
                 <button id="btnExcluirConta" class="btn-perigo ml-4 py-2 px-4 rounded-lg text-sm">Excluir Conta</button>
            </div>
        `;
        document.getElementById('btnEditarPerfil').addEventListener('click', () => abrirModal(modalEditarPerfil));
         document.getElementById('btnExcluirConta').addEventListener('click', () => {
            confirmarAcao({
                titulo: 'Excluir Conta', mensagem: 'Esta ação é permanente. Tem certeza?',
                textoConfirmar: 'Sim, Excluir',
                onConfirm: () => { window.location.href = 'home.html'; }
            });
        });
    };

    const renderizarReservas = () => { /* ... (código existente) ... */ };
    const renderizarFavoritos = () => { /* ... (código existente) ... */ };
    const renderizarHistorico = () => { /* ... (código existente) ... */ };
    const renderizarNotificacoes = () => { /* ... (código existente) ... */ };
    const renderizarResultados = (resultados) => { /* ... (código existente) ... */ };

    const definirAbaAtiva = (nomeAba) => {
        document.querySelectorAll('#nav-abas-usuario .btn-aba').forEach(t => t.classList.remove('ativo'));
        document.querySelectorAll('#area-usuario .conteudo-aba').forEach(c => c.classList.remove('ativo'));
        document.querySelector(`.btn-aba[data-aba="${nomeAba}"]`).classList.add('ativo');
        document.getElementById(`conteudo-${nomeAba}`).classList.add('ativo');
    };
    
    window.handleCliqueFavorito = (medId) => { /* ... (código existente) ... */ };
    window.handleCliqueReserva = (medId) => { /* ... (código existente) ... */ };

    const confirmarAcao = (config) => {
        document.getElementById('tituloConfirmacao').textContent = config.titulo;
        document.getElementById('mensagemConfirmacao').textContent = config.mensagem;
        const btnConfirmar = document.getElementById('btnConfirmarAcao');
        btnConfirmar.textContent = config.textoConfirmar;
        btnConfirmar.onclick = () => { config.onConfirm(); fecharModal(modalConfirmacao); };
        abrirModal(modalConfirmacao);
    };

    window.confirmarCancelarReserva = (resId) => {
        confirmarAcao({
            titulo: 'Cancelar Reserva',
            mensagem: 'Tem certeza que deseja cancelar esta reserva?',
            textoConfirmar: 'Sim, Cancelar',
            onConfirm: () => {
                reservasUsuario = reservasUsuario.filter(r => r.id !== resId);
                renderizarReservas(); exibirToast('Reserva cancelada.');
            }
        });
    };
    
    // --- EVENT LISTENERS ---
    document.getElementById('formularioBusca').addEventListener('submit', (e) => { 
        e.preventDefault(); 
        const consulta = document.getElementById('nomeMedicamento').value.trim().toLowerCase();
        if(!consulta) return;
        mensagemStatus.textContent = 'Buscando...';
        setTimeout(() => {
            const resultados = dadosMock.filter(med => med.nome.toLowerCase().includes(consulta));
            renderizarResultados(resultados);
        }, 800);
    });
    
    document.getElementById('formularioEditarPerfil').addEventListener('submit', (e) => {
        e.preventDefault();
        usuarioAtual.nome = document.getElementById('editarNome').value;
        usuarioAtual.email = document.getElementById('editarEmail').value;
        sessionStorage.setItem('medControlUser', JSON.stringify(usuarioAtual));
        renderizarPerfil();
        fecharModal(modalEditarPerfil); exibirToast('Perfil atualizado com sucesso!');
    });
    
    document.querySelectorAll('.btn-aba').forEach(tab => tab.addEventListener('click', (e) => definirAbaAtiva(e.target.dataset.aba)));
    document.querySelectorAll('.link-aba-nav').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            definirAbaAtiva(e.target.dataset.aba);
            document.getElementById('area-usuario').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // --- INICIALIZAÇÃO ---
    verificarAutenticacao();
    mensagemStatus.textContent = 'Faça uma busca para encontrar medicamentos.';
    renderizarReservas();
    renderizarFavoritos();
    renderizarHistorico();
    renderizarNotificacoes();
});
