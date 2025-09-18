document.addEventListener('DOMContentLoaded', () => {
    let usuarioAtual = null;

    // --- ELEMENTOS DOM ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentPanels = document.querySelectorAll('.conteudo-principal');
    const modalEditarPerfil = document.getElementById('modalEditarPerfil');
    const modalConfirmacao = document.getElementById('modalConfirmacao');
    
    // --- FUNÇÕES UTILITÁRIAS ---
    const abrirModal = (modal) => modal.classList.add('ativo');
    const fecharModal = (modal) => modal.classList.remove('ativo');
    
    const exibirToast = (mensagem) => {
        const toast = document.createElement('div');
        toast.className = `fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg bg-green-500 z-50`;
        toast.textContent = mensagem; 
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    function verificarAutenticacao() {
        const dadosUsuario = sessionStorage.getItem('medControlUser');
        if (!dadosUsuario) {
            window.location.href = 'TelaLoginCadastro.html';
            return;
        }
        usuarioAtual = JSON.parse(dadosUsuario);
        document.getElementById('userInfoSidebar').innerHTML = `<p class="font-semibold text-gray-800">${usuarioAtual.nome}</p><p class="text-gray-600">${usuarioAtual.email}</p>`;
        
        // Carrega os dados da primeira aba visível
        renderizarPerfil();
        renderizarReservas();
        renderizarFavoritos();
        renderizarHistorico();
        renderizarNotificacoes();
    }

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('medControlUser');
        window.location.href = 'Home.html';
    });

    // --- NAVEGAÇÃO DA BARRA LATERAL ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const aba = link.dataset.aba;

            sidebarLinks.forEach(l => l.classList.remove('ativo'));
            link.classList.add('ativo');

            contentPanels.forEach(p => p.classList.add('hidden'));
            document.getElementById(`conteudo-${aba}`).classList.remove('hidden');
        });
    });

    // --- LÓGICA DE CADA SEÇÃO ---

    // 1. BUSCAR MEDICAMENTO
    document.getElementById('formularioBusca').addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        const consulta = document.getElementById('nomeMedicamento').value.trim();
        if(!consulta) return;
        const mensagemStatus = document.getElementById('mensagemStatus');
        mensagemStatus.textContent = 'Buscando...';

        try {
             const resposta = await fetch(`http://localhost:7071/api/medicamentos/search?nome=${encodeURIComponent(consulta)}`);
             const resultados = await resposta.json();
             if(resposta.ok){
                renderizarResultadosBusca(resultados);
             } else {
                mensagemStatus.textContent = 'Erro ao buscar medicamento.';
             }
        } catch(error) {
            console.error("Erro na busca:", error);
            mensagemStatus.textContent = 'Falha na conexão com o servidor.';
        }
    });

    const renderizarResultadosBusca = (resultados) => {
        const container = document.getElementById('containerResultados');
        const mensagemStatus = document.getElementById('mensagemStatus');
        container.innerHTML = '';
        if (resultados.length === 0) {
            mensagemStatus.textContent = 'Nenhum medicamento encontrado.';
            return;
        }
        mensagemStatus.textContent = `${resultados.length} resultado(s) encontrado(s):`;
        resultados.forEach(med => {
            container.innerHTML += `<div class="bg-white p-6 rounded-lg shadow-md"><p class="font-bold text-lg">${med.nome}</p><p class="text-gray-600">${med.ubs} - ${med.endereco}</p><p class="font-medium mt-2">Estoque: ${med.estoque > 0 ? med.estoque : 'Indisponível'}</p></div>`;
        });
    };

    // 2. MEU PERFIL
    const renderizarPerfil = () => {
        const container = document.getElementById('conteudo-perfil');
        // Adiciona T00:00:00 para evitar problemas de fuso horário que podem mudar a data
        const dataFormatada = new Date(usuarioAtual.data_nascimento + 'T00:00:00-03:00').toLocaleDateString('pt-BR');

        container.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-lg">
                <div class="flex justify-between items-center mb-8 border-b pb-4">
                    <h2 class="text-3xl font-bold text-gray-800">Meu Perfil</h2>
                    <button id="btnEditarPerfil" class="btn-primario py-2 px-5 rounded-lg text-base font-semibold">Editar Perfil</button>
                </div>
                <div class="space-y-5 text-lg">
                    <div><label class="font-semibold text-gray-600">Nome:</label><span class="ml-2 text-gray-800">${usuarioAtual.nome}</span></div>
                    <div><label class="font-semibold text-gray-600">Email:</label><span class="ml-2 text-gray-800">${usuarioAtual.email}</span></div>
                    <div><label class="font-semibold text-gray-600">CPF/CNS:</label><span class="ml-2 text-gray-800">${usuarioAtual.cpf_cns}</span></div>
                    <div><label class="font-semibold text-gray-600">CEP:</label><span class="ml-2 text-gray-800">${usuarioAtual.cep}</span></div>
                    <div><label class="font-semibold text-gray-600">Data de Nascimento:</label><span class="ml-2 text-gray-800">${dataFormatada}</span></div>
                </div>
            </div>
        `;
        document.getElementById('btnEditarPerfil').addEventListener('click', abrirModalEdicaoPerfil);
    };

    const abrirModalEdicaoPerfil = () => {
        limparErrosEdicao();
        document.getElementById('editarNome').value = usuarioAtual.nome;
        document.getElementById('editarEmail').value = usuarioAtual.email;
        document.getElementById('editarCpfCns').value = usuarioAtual.cpf_cns;
        document.getElementById('editarCep').value = usuarioAtual.cep;
        document.getElementById('editarNascimento').value = usuarioAtual.data_nascimento;
        abrirModal(modalEditarPerfil);
    };

    const limparErrosEdicao = () => {
        document.querySelectorAll('#formularioEditarPerfil .input-error').forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll('#formularioEditarPerfil .error-message').forEach(el => el.textContent = '');
    };
    
    const isMaisDe18 = (dataNasc) => {
        if (!dataNasc) return false; 
        const hoje = new Date();
        const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
        const dataNascimento = new Date(dataNasc);
        const dataNascimentoUTC = new Date(dataNascimento.getUTCFullYear(), dataNascimento.getUTCMonth(), dataNascimento.getUTCDate());
        return dataNascimentoUTC <= dezoitoAnosAtras;
    };
    
    const validarFormularioEdicao = () => {
        limparErrosEdicao();
        let isValid = true;
        const fields = [
            { id: 'editarNome', errorId: 'erroEditarNome', message: 'O nome é obrigatório.' },
            { id: 'editarEmail', errorId: 'erroEditarEmail', message: 'O e-mail é obrigatório.' },
            { id: 'editarCpfCns', errorId: 'erroEditarCpfCns', message: 'O CPF/CNS é obrigatório.' },
            { id: 'editarCep', errorId: 'erroEditarCep', message: 'O CEP é obrigatório.' },
            { id: 'editarNascimento', errorId: 'erroEditarNascimento', message: 'A data de nascimento é obrigatória.' }
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorEl = document.getElementById(field.errorId);
            if (!input.value.trim()) {
                input.classList.add('input-error');
                errorEl.textContent = field.message;
                isValid = false;
            }
        });
        
        const nascimentoInput = document.getElementById('editarNascimento');
        const erroNascimentoEl = document.getElementById('erroEditarNascimento');
        if (nascimentoInput.value && !isMaisDe18(nascimentoInput.value)) {
            nascimentoInput.classList.add('input-error');
            erroNascimentoEl.textContent = 'Você deve ter 18 anos ou mais.';
            isValid = false;
        }

        return isValid;
    };


    document.getElementById('formularioEditarPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!validarFormularioEdicao()) return;

        const dadosAtualizados = {
            nome: document.getElementById('editarNome').value,
            email: document.getElementById('editarEmail').value,
            cpf_cns: document.getElementById('editarCpfCns').value,
            cep: document.getElementById('editarCep').value,
            data_nascimento: document.getElementById('editarNascimento').value,
        };

        try {
            const response = await fetch(`http://localhost:7071/api/users/${usuarioAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados)
            });

            if (response.ok) {
                usuarioAtual = { ...usuarioAtual, ...dadosAtualizados };
                sessionStorage.setItem('medControlUser', JSON.stringify(usuarioAtual));
                
                renderizarPerfil();
                fecharModal(modalEditarPerfil); 
                exibirToast('Perfil atualizado com sucesso!');
            } else {
                 const erro = await response.json();
                 if (erro.field) {
                    const errorId = `erroEditar${erro.field.charAt(0).toUpperCase() + erro.field.slice(1).replace('_', '')}`;
                    const inputId = `editar${erro.field.charAt(0).toUpperCase() + erro.field.slice(1).replace('_', '')}`;
                    const errorEl = document.getElementById(errorId);
                    const inputEl = document.getElementById(inputId);
                    
                    if(errorEl && inputEl){
                        errorEl.textContent = `Este ${erro.field === 'cpf_cns' ? 'CPF/CNS' : 'e-mail'} já está em uso.`;
                        inputEl.classList.add('input-error');
                    }
                 } else {
                    alert(`Erro ao atualizar: ${erro.message}`);
                 }
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro de conexão ao tentar atualizar o perfil.');
        }
    });

    // Funções de placeholder para as outras seções
    const renderizarReservas = () => { document.getElementById('conteudo-reservas').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Minhas Reservas</h2><p class="mt-4 text-lg">Suas reservas de medicamentos aparecerão aqui.</p></div>'; };
    const renderizarFavoritos = () => { document.getElementById('conteudo-favoritos').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Favoritos</h2><p class="mt-4 text-lg">Seus medicamentos favoritados aparecerão aqui para fácil acesso.</p></div>'; };
    const renderizarHistorico = () => { document.getElementById('conteudo-historico').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Histórico</h2><p class="mt-4 text-lg">Seu histórico de medicamentos retirados será exibido aqui.</p></div>'; };
    const renderizarNotificacoes = () => { document.getElementById('conteudo-notificacoes').innerHTML = '<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Notificações</h2><p class="mt-4 text-lg">Alertas e lembretes importantes sobre suas reservas e medicamentos.</p></div>'; };

    // Fechar modais
    document.querySelectorAll('.btnFecharModal').forEach(btn => btn.addEventListener('click', () => fecharModal(modalEditarPerfil)));
    document.getElementById('btnCancelarConfirmacao').addEventListener('click', () => fecharModal(modalConfirmacao));

    // --- INICIALIZAÇÃO ---
    verificarAutenticacao();
});

