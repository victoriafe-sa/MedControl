// frontend/scripts/usuario/usuario-reservas.js
// Módulo para RF07 (Reservas)

// Importa as funções de API
import { api } from '../utils/api.js'; 
// Importa as funções de UI, incluindo o novo modal de confirmação
import { exibirToast, fecharTodosModais, abrirConfirmacao } from '../utils/ui.js';

// Variável para guardar o container principal da aba "Minhas Reservas"
let containerReservas;
// Variável para injetar o modal de agendamento no DOM
let containerModalReserva; 

/**
 * RF07.2 - Renderiza as reservas do usuário
 * Função principal chamada pelo TelaUsuario.js quando a aba "Minhas Reservas" é clicada.
 */
export async function renderizarReservas() {
    if (!containerReservas) containerReservas = document.getElementById('conteudo-reservas');
    containerReservas.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Minhas Reservas</h2><p class="mt-4 text-lg text-gray-600">Buscando suas reservas...</p></div>`;

    try {
        // 1. Busca os dados da API (GET /api/usuarios/me/reservas)
        const reservas = await api.consultarReservas(); 
        
        // 2. Separa em "Reservas Ativas" e "Histórico"
        const ativas = reservas.filter(r => r.status === 'ATIVA');
        const historico = reservas.filter(r => r.status !== 'ATIVA');

        // 3. Monta o HTML da página
        let html = `
            <div class="bg-white p-8 rounded-xl shadow-lg">
                <h2 class="text-3xl font-bold text-gray-800">Minhas Reservas</h2>
                
                <h3 class="text-2xl font-semibold text-blue-800 mt-6 border-b pb-2">Reservas Ativas</h3>
                <div id="reservas-ativas" class="space-y-4 mt-4">
                    ${ativas.length > 0 ? ativas.map(r => ReservaCard(r)).join('') : '<p class="text-gray-600">Nenhuma reserva ativa encontrada.</p>'}
                </div>

                <h3 class="text-2xl font-semibold text-gray-600 mt-8 border-b pb-2">Histórico</h3>
                <div id="reservas-historico" class="space-y-4 mt-4 opacity-70">
                    ${historico.length > 0 ? historico.map(r => ReservaCard(r)).join('') : '<p class="text-gray-600">Nenhum histórico de reservas.</p>'}
                </div>
            </div>
        `;
        containerReservas.innerHTML = html;
        
        // 4. Adiciona listeners aos botões "Cancelar" e "Reagendar"
        adicionarListenersReservas();

    } catch (err) {
        containerReservas.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-3xl font-bold text-gray-800">Minhas Reservas</h2><p class="mt-4 text-lg text-red-500">Erro ao carregar reservas: ${err.message}</p></div>`;
    }
}

/**
 * Helper que gera o HTML para um card de reserva.
 */
function ReservaCard(r) {
    const isAtiva = r.status === 'ATIVA';
    // Converte a string ISO (ex: "2025-11-20T14:00:00") para um objeto Date
    const dataObj = new Date(r.data_hora_reserva);
    const dataFormatada = dataObj.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    let statusClass = 'text-gray-500';
    if (isAtiva) statusClass = 'text-blue-600';
    else if (r.status === 'RETIRADA') statusClass = 'text-green-600';
    else if (r.status === 'CANCELADA' || r.status === 'EXPIRADA') statusClass = 'text-red-500';

    return `
        <div class="border rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-start">
            <div>
                <span class="text-sm font-bold ${statusClass}">${r.status}</span>
                <p class="text-xl font-semibold">${r.nome_comercial}</p>
                <p class="text-gray-600">${r.nome_ubs}</p>
                <p class="text-gray-600">Data: ${dataFormatada}</p>
                <p class="text-gray-600">Quantidade: ${r.quantidade_reservada}</p>
            </div>
            ${isAtiva ? `
                <div class="flex space-x-2 mt-4 sm:mt-0">
                    <button class="btn-reagendar-reserva btn-secundario text-sm py-1 px-3 rounded-md" style="background-color: #ca8a04; color: white;" data-id="${r.id_reserva}">Reagendar</button>
                    <button class="btn-cancelar-reserva btn-perigo text-sm py-1 px-3 rounded-md" data-id="${r.id_reserva}">Cancelar</button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Adiciona os event listeners para os botões de ação nos cards.
 */
function adicionarListenersReservas() {
    
    // RF07.3 - Cancelar Reserva
    document.querySelectorAll('.btn-cancelar-reserva').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;

            // --- MODIFICAÇÃO: Substitui o confirm() nativo pelo modal moderno ---
            abrirConfirmacao(
                'Cancelar Agendamento', // Título
                'Deseja realmente cancelar este agendamento?', // Mensagem
                async () => { // Callback de confirmação
                    try {
                        await api.cancelarReserva(id);
                        exibirToast('Reserva cancelada.');
                        renderizarReservas(); // Atualiza a UI
                    } catch (err) {
                        exibirToast('Erro ao cancelar: ' + err.message, true);
                    }
                },
                'perigo' // Tipo do botão (vermelho)
            );
            // --- FIM DA MODIFICAÇÃO ---
        });
    });

    // RF07.4 - Reagendar Reserva
    document.querySelectorAll('.btn-reagendar-reserva').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            abrirModalReagendamento(id);
        });
    });
}

/**
 * Helper para gerar os próximos 7 DIAS ÚTEIS clicáveis.
 * Esta função agora pula Sábados (6) e Domingos (0).
 */
function gerarOpcoesDeData() {
    let diasHtml = '';
    const hoje = new Date();
    const formatador = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });

    let diasAdicionados = 0;
    let diasVerificados = 0; // Dias corridos a partir de hoje

    // Continua o loop até encontrar 7 dias úteis (Seg-Sex)
    while (diasAdicionados < 7) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + diasVerificados);
        
        const diaDaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado

        // Se NÃO for Sábado (6) ou Domingo (0)
        if (diaDaSemana !== 0 && diaDaSemana !== 6) {
            
            let texto = '';
            if (diasVerificados === 0) {
                texto = "Hoje";
            } 
            else if (diasVerificados === 1 && diasAdicionados === 1) {
                texto = "Amanhã";
            }
            else {
                texto = formatador.format(data).replace('.', '');
            }

            const valor = data.toISOString().split('T')[0];
            
            diasHtml += `<button type="button" class="slot-botao" data-valor="${valor}">${texto}</button>`;
            
            diasAdicionados++; 
        }
        
        diasVerificados++; 
    }
    return diasHtml;
}

/**
 * Helper para gerar os horários clicáveis (09:00 - 18:00).
 */
function gerarOpcoesDeHorario() {
    let horariosHtml = '';
    for (let h = 9; h <= 18; h++) {
        const valor = `${h.toString().padStart(2, '0')}:00`; // "09:00"
        horariosHtml += `<button type="button" class="slot-botao" data-valor="${valor}">${valor}</button>`;
    }
    return horariosHtml;
}

/**
 * Função exportada para o usuario-busca.js
 * Abre o modal para RF07.1 - Criar Reserva
 * @param {object} dados - { id_medicamento, id_ubs, nome_medicamento, nome_ubs, disponivel }
 */
export function abrirModalReserva(dados) {
    if (!containerModalReserva) {
        containerModalReserva = document.getElementById('modal-reserva-container');
    }

    containerModalReserva.innerHTML = `
        <div id="modalReserva" class="modal ativo">
            <div class="bg-white w-full max-w-lg p-8 rounded-xl shadow-2xl m-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Agendar Retirada</h2>
                    <button class="btnFecharModal text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                </div>
                <form id="formAgendamento">
                    <p class="text-lg font-semibold">${dados.nome_medicamento}</p>
                    <p class="text-gray-600 mb-4">${dados.nome_ubs}</p>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Data da Retirada</label>
                            <div id="container-data" class="slot-container">
                                ${gerarOpcoesDeData()}
                            </div>
                            <p id="erroReservaData" class="error-message"></p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Horário da Retirada (09:00 - 18:00)</label>
                            <div id="container-horario" class="slot-container">
                                ${gerarOpcoesDeHorario()}
                            </div>
                            <p id="erroReservaHorario" class="error-message"></p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700">Quantidade (Disponível: ${dados.disponivel})</label>
                            <input type="number" id="reservaQuantidade" class="mt-1 block w-full px-3 py-2 bg-gray-100 rounded-md" min="1" max="${dados.disponivel}" value="1" required>
                            <p id="erroReservaQuantidade" class="error-message"></p>
                        </div>
                    </div>
                    
                    <div class="pt-6 flex gap-4">
                        <button type="button" class="btnFecharModal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button>
                        <button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Confirmar Reserva</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // --- Lógica de Interação do Novo Modal ---
    const modal = document.getElementById('modalReserva');
    const form = document.getElementById('formAgendamento');
    const containerData = document.getElementById('container-data');
    const containerHorario = document.getElementById('container-horario');

    modal.querySelectorAll('.btnFecharModal').forEach(btn => btn.addEventListener('click', fecharTodosModais));
    
    containerData.addEventListener('click', (e) => {
        if (e.target.classList.contains('slot-botao')) {
            containerData.querySelectorAll('.slot-botao').forEach(btn => btn.classList.remove('selecionado'));
            e.target.classList.add('selecionado');
            document.getElementById('erroReservaData').textContent = '';
        }
    });

    containerHorario.addEventListener('click', (e) => {
        if (e.target.classList.contains('slot-botao')) {
            containerHorario.querySelectorAll('.slot-botao').forEach(btn => btn.classList.remove('selecionado'));
            e.target.classList.add('selecionado');
            document.getElementById('erroReservaHorario').textContent = '';
        }
    });

    // --- MODIFICADO: Adiciona fluxo de comprovante ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dataSelecionada = containerData.querySelector('.slot-botao.selecionado')?.dataset.valor;
        const horarioSelecionado = containerHorario.querySelector('.slot-botao.selecionado')?.dataset.valor;
        const quantidade = parseInt(document.getElementById('reservaQuantidade').value);
        
        // Validações
        let formValido = true;
        if (!dataSelecionada) {
            document.getElementById('erroReservaData').textContent = 'Selecione uma data.';
            formValido = false;
        }
        if (!horarioSelecionado) {
            document.getElementById('erroReservaHorario').textContent = 'Selecione um horário.';
            formValido = false;
        }
        if (!quantidade || quantidade <= 0) {
            document.getElementById('erroReservaQuantidade').textContent = 'Quantidade deve ser ao menos 1.';
            formValido = false;
        }
        if (quantidade > dados.disponivel) {
             document.getElementById('erroReservaQuantidade').textContent = `Máximo de ${dados.disponivel} unidades.`;
             formValido = false;
        }
        if (!formValido) return;

        const dataHoraReserva = `${dataSelecionada}T${horarioSelecionado}`;

        try {
            // 1. Chama a API e espera a resposta (que contém o comprovante)
            const resposta = await api.criarReserva({
                id_medicamento: dados.id_medicamento,
                id_ubs: dados.id_ubs,
                quantidadeReservada: quantidade,
                dataHoraReserva: dataHoraReserva
            });

            exibirToast('Reserva criada com sucesso!');
            fecharTodosModais(); // Fecha o modal de agendamento
            
            // 2. Chama a nova função para abrir o modal de comprovante
            abrirModalComprovante(resposta.reserva, dados);
            
            // 3. Atualiza a aba "Minhas Reservas" se ela estiver ativa
            if (document.getElementById('conteudo-reservas').classList.contains('ativo')) {
                renderizarReservas();
            }
            // 4. Recarrega a busca (RF06) para atualizar a disponibilidade na tela principal
            document.querySelector('#formularioBusca button[type="submit"]').click();

        } catch (err) {
            exibirToast(`Erro: ${err.message}`, true);
            document.getElementById('erroReservaQuantidade').textContent = err.message;
        }
    });
}

/**
 * ADICIONADO: Abre um modal com o comprovante digital da reserva (RF07.1).
 * @param {object} reserva - O objeto da reserva retornado pelo backend.
 * @param {object} dadosBusca - Os dados da busca (para nomes).
 */
function abrirModalComprovante(reserva, dadosBusca) {
    if (!containerModalReserva) return; 

    const dataFormatada = new Date(reserva.data_hora_reserva).toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // Usa o id_reserva como "Código de Confirmação"
    containerModalReserva.innerHTML = `
        <div id="modalComprovante" class="modal ativo">
            <div class="bg-white w-full max-w-lg p-8 rounded-xl shadow-2xl m-4 text-center">
                <svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Reserva Confirmada!</h2>
                <p class="text-gray-600 mb-6">Seu agendamento foi realizado com sucesso.</p>

                <div class="text-left bg-gray-50 p-6 rounded-lg border space-y-3">
                    <p><strong>Código de Confirmação:</strong> <span class="font-mono text-lg text-blue-800">${reserva.id_reserva}</span></p>
                    <p><strong>Medicamento:</strong> ${dadosBusca.nome_medicamento}</p>
                    <p><strong>Local:</strong> ${dadosBusca.nome_ubs}</p>
                    <p><strong>Data e Hora:</strong> ${dataFormatada}</p>
                    <p><strong>Quantidade:</strong> ${reserva.quantidade_reservada} unidades</p>
                </div>
                
                <button type="button" class="btnFecharModal w-full btn-primario py-3 rounded-lg font-semibold mt-8">OK, Entendi</button>
            </div>
        </div>
    `;

    // Adiciona o listener para o botão de fechar
    containerModalReserva.querySelector('.btnFecharModal').addEventListener('click', () => {
        fecharTodosModais();
        // Após fechar o comprovante, força a recarga da aba de reservas
        // para o caso do usuário navegar para lá em seguida.
        renderizarReservas();
    });
}


/**
 * Abre o modal para RF07.4 - Reagendar Reserva
 */
function abrirModalReagendamento(reservaId) {
    if (!containerModalReserva) {
        containerModalReserva = document.getElementById('modal-reserva-container');
    }

    containerModalReserva.innerHTML = `
        <div id="modalReagendamento" class="modal ativo">
            <div class="bg-white w-full max-w-lg p-8 rounded-xl shadow-2xl m-4">
                <h2 class="text-2xl font-bold text-gray-800">Reagendar (RF07.4)</h2>
                <form id="formReagendamento" class="mt-4 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nova Data</label>
                        <div id="container-data-reag" class="slot-container">
                            ${gerarOpcoesDeData()}
                        </div>
                        <p id="erroDataReag" class="error-message"></p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Novo Horário</label>
                        <div id="container-horario-reag" class="slot-container">
                            ${gerarOpcoesDeHorario()}
                        </div>
                        <p id="erroHorarioReag" class="error-message"></p>
                    </div>
                    <div class="pt-4 flex gap-4">
                        <button type="button" class="btnFecharModal w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold">Cancelar</button>
                        <button type="submit" class="w-full btn-primario py-3 rounded-lg font-semibold">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const containerDataReag = document.getElementById('container-data-reag');
    containerDataReag.addEventListener('click', (e) => {
        if (e.target.classList.contains('slot-botao')) {
            containerDataReag.querySelectorAll('.slot-botao').forEach(btn => btn.classList.remove('selecionado'));
            e.target.classList.add('selecionado');
            document.getElementById('erroDataReag').textContent = '';
        }
    });

    const containerHorarioReag = document.getElementById('container-horario-reag');
    containerHorarioReag.addEventListener('click', (e) => {
        if (e.target.classList.contains('slot-botao')) {
            containerHorarioReag.querySelectorAll('.slot-botao').forEach(btn => btn.classList.remove('selecionado'));
            e.target.classList.add('selecionado');
            document.getElementById('erroHorarioReag').textContent = '';
        }
    });

    document.getElementById('modalReagendamento').querySelectorAll('.btnFecharModal').forEach(btn => btn.addEventListener('click', fecharTodosModais));

    document.getElementById('formReagendamento').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dataSelecionada = containerDataReag.querySelector('.slot-botao.selecionado')?.dataset.valor;
        const horarioSelecionado = containerHorarioReag.querySelector('.slot-botao.selecionado')?.dataset.valor;

        if (!dataSelecionada || !horarioSelecionado) {
            document.getElementById('erroDataReag').textContent = !dataSelecionada ? 'Selecione uma data.' : '';
            document.getElementById('erroHorarioReag').textContent = !horarioSelecionado ? 'Selecione um horário.' : '';
            return;
        }

        const novaDataHora = `${dataSelecionada}T${horarioSelecionado}`;
        
        try {
            await api.reagendarReserva(reservaId, { novaDataHora: novaDataHora }); 
            exibirToast('Reserva reagendada com sucesso!');
            fecharTodosModais();
            renderizarReservas();
        } catch (err) {
            alert('Erro ao reagendar: ' + err.message);
        }
    });
}

/**
 * Inicializa o módulo (chamado por TelaUsuario.js)
 */
export function initUsuarioReservas(usuario) {
    containerReservas = document.getElementById('conteudo-reservas');
    
    // Busca o container onde os modais de reserva serão injetados
    containerModalReserva = document.getElementById('modal-reserva-container');
    if (!containerModalReserva) {
        // Se não existir no HTML, cria dinamicamente
        containerModalReserva = document.createElement('div');
        containerModalReserva.id = "modal-reserva-container";
        document.body.appendChild(containerModalReserva);
    }
}