// frontend/scripts/usuario/usuario-busca.js
import { api } from '../utils/api.js';
// --- ADIÇÃO RF07 ---
// Importa a função para abrir o modal de reserva (que será criada no novo módulo)
import { abrirModalReserva } from './usuario-reservas.js'; 
// --- FIM DA ADIÇÃO RF07 ---

// 🟩 Variáveis globais do mapa e dados
let mapa = null;
let marcadores = [];
let listaUbsCompleta = []; // Armazena as UBSs retornadas da API para reordenação
let medicamentoBuscado = null; // MODIFICADO: Armazena o nome do medicamento buscado

// =========================================================================
// FUNÇÕES DE UTILIDADE (HAERSINE)
// =========================================================================

/**
 * Calcula a distância entre dois pontos (em km) usando a fórmula de Haversine.
 * (Nenhuma alteração nesta função)
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em km
}

// =========================================================================
// FUNÇÕES DE MAPA (LEAFLET)
// =========================================================================

/**
 * Exibe os resultados da busca no mapa Leaflet.
 * MODIFICADO para corrigir o bug 'ubsComCoords is not defined'.
 */
function exibirMapa(listaUbs, latUsuario = null, lngUsuario = null) {
    const divMapa = document.getElementById('mapaUbs');
    if (!divMapa) return;

    // --- INÍCIO DA CORREÇÃO (Bug Mapa) ---
    // Garante que o mapa seja exibido
    divMapa.style.display = 'block';
    // --- FIM DA CORREÇÃO ---

    // 1. Inicializar o Mapa (ou limpar o existente)
    if (mapa) {
        mapa.remove();
    }
    mapa = L.map(divMapa).setView([-15.793889, -47.882778], 10); // Centro de Brasília
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);

    // --- 2. Limpar Marcadores Antigos ---
    marcadores.forEach(m => m.remove());
    marcadores = [];
    const todosPontos = [];

    // --- 3. Adicionar Ícone Padrão ---
    const ubsIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });
    
    // --- INÍCIO DA CORREÇÃO (Bug Mapa) ---
    // O erro 'ubsComCoords is not defined' ocorria aqui.
    // A variável 'ubsComCoords' não existia.
    // Criamos ela filtrando a 'listaUbs' recebida, garantindo que só UBSs
    // com coordenadas válidas (enviadas pelo Controller corrigido) sejam usadas.
    const ubsComCoords = listaUbs.filter(ubs => 
        ubs.latitude != null && ubs.longitude != null
    );
    // --- FIM DA CORREÇÃO ---

    // --- 5. Adicionar Marcadores das UBSs ---
    ubsComCoords.forEach(ubs => { // Agora 'ubsComCoords' está definida
        const lat = parseFloat(ubs.latitude);
        const lng = parseFloat(ubs.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            const distanciaTexto = ubs.distancia ? `Distância: ${ubs.distancia} km<br>` : '';

            // --- MODIFICAÇÃO RF07 ---
            // Altera 'ubs.quantidade' para 'ubs.quantidade_disponivel'
            const marker = L.marker([lat, lng], { icon: ubsIcon })
                .addTo(mapa)
                .bindPopup(`
                    <b>${ubs.nome}</b><br>
                    ${ubs.endereco}<br>
                    Disponível: ${ubs.quantidade_disponivel}<br> 
                    ${distanciaTexto}
                `);
            // --- FIM DA MODIFICAÇÃO ---

            marcadores.push(marker);
            todosPontos.push([lat, lng]);
        }
    });

    // --- 6. Adicionar Marcador do Usuário (se houver) ---
    if (latUsuario != null && lngUsuario != null) {
        const userIcon = L.icon({
             iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', // Ícone vermelho
             iconSize: [25, 41],
             iconAnchor: [12, 41],
             popupAnchor: [1, -34],
        });
        const userMarker = L.marker([latUsuario, lngUsuario], { icon: userIcon })
            .addTo(mapa)
            .bindPopup(`<b>Sua Localização</b>`);
        marcadores.push(userMarker);
        todosPontos.push([latUsuario, lngUsuario]);
    }

    // --- 7. Ajustar Zoom ---
    if (todosPontos.length > 0) {
        mapa.fitBounds(todosPontos, { padding: [50, 50] });
    }
    
    // Força o mapa a recalcular seu tamanho (corrige bug de renderização parcial)
    setTimeout(() => { mapa.invalidateSize() }, 100);
}

// =========================================================================
// FUNÇÕES DE BUSCA E ORDENAÇÃO
// =========================================================================

/**
 * Renderiza os resultados da busca na lista.
 * MODIFICADO para RF07
 */
function renderizarResultados(listaUbs) {
    const containerResultados = document.getElementById('containerResultados');
    containerResultados.innerHTML = '';
    
    let htmlResultados = '<ul class="space-y-4">';

    listaUbs.forEach(ubs => {
        const distanciaTexto = ubs.distancia ? ` (${ubs.distancia} km)` : '';

        // --- INÍCIO DA MODIFICAÇÃO RF07 ---
        // 1. Altera 'ubs.quantidade' para 'ubs.quantidade_disponivel' (vinda da API)
        // 2. Adiciona o botão "Reservar" com data-attributes para o RF07.1 [cite: 1769-1770]
        htmlResultados += `
            <li class="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                <div>
                    <p class="font-semibold text-xl text-gray-800">${ubs.nome}</p>
                    <p class="text-gray-600">${ubs.endereco}</p>
                    <p class="text-green-600 font-medium">Disponível: ${ubs.quantidade_disponivel} unidades${distanciaTexto}</p>
                </div>
                
                <button class="btn-reservar btn-primario py-2 px-6 rounded-lg font-semibold"
                        data-id-medicamento="${ubs.id_medicamento}"
                        data-id-ubs="${ubs.id_ubs}"
                        data-nome-med="${medicamentoBuscado}" 
                        data-nome-ubs="${ubs.nome}"
                        data-disponivel="${ubs.quantidade_disponivel}">
                    Reservar
                </button>
            </li>`;
        // --- FIM DA MODIFICAÇÃO RF07 ---
    });

    htmlResultados += '</ul>';
    containerResultados.innerHTML = htmlResultados;

    // --- ADIÇÃO RF07 ---
    // Adiciona o event listener para os novos botões
    // Isso delega a ação para a função que será importada de 'usuario-reservas.js'
    document.querySelectorAll('.btn-reservar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dados = e.currentTarget.dataset;
            // Chama a função importada para iniciar o RF07.1
            abrirModalReserva({
                id_medicamento: dados.idMedicamento,
                id_ubs: dados.idUbs,
                nome_medicamento: dados.nomeMed,
                nome_ubs: dados.nomeUbs,
                disponivel: parseInt(dados.disponivel)
            });
        });
    });
    // --- FIM DA ADIÇÃO RF07 ---
}


/**
 * Lida com o resultado de sucesso da Geolocalização.
 * (Nenhuma alteração nesta função, mas usa 'ubs.latitude' e 'ubs.longitude')
 */
function mostrarUbsProximas(posicao) {
    const latUsuario = posicao.coords.latitude;
    const lngUsuario = posicao.coords.longitude;
    const statusGps = document.getElementById('mensagemStatus');
    statusGps.textContent = `Resultados ordenados por proximidade:`;
    
    // 1. Calcular distância e ordenar UBSs
    let ubsOrdenadas = listaUbsCompleta.map(ubs => {
        // --- MODIFICAÇÃO RF07 ---
        // O backend (MedicamentoController) não envia mais lat/lon da UBS
        // O ideal seria o backend enviar. Por ora, esta função pode quebrar
        // ou podemos buscar no cache de UBS (se existir).
        // Assumindo que o backend foi ajustado para também retornar lat/lon
        // da UBS na busca do RF06.
        const ubsLat = parseFloat(ubs.latitude); // Assumindo que a API do RF06 ainda retorna isso
        const ubsLng = parseFloat(ubs.longitude); // Assumindo que a API do RF06 ainda retorna isso
        // --- FIM DA MODIFICAÇÃO ---

        let distancia = 'N/A';
        if (!isNaN(ubsLat) && !isNaN(ubsLng)) {
            distancia = calcularDistancia(latUsuario, lngUsuario, ubsLat, ubsLng).toFixed(1);
        }
        
        return { ...ubs, distancia: distancia };
    }).sort((a, b) => {
        if (a.distancia === 'N/A') return 1;
        if (b.distancia === 'N/A') return -1;
        return a.distancia - b.distancia;
    });

    // 2. Renderizar Lista e Mapa
    renderizarResultados(ubsOrdenadas);
    exibirMapa(ubsOrdenadas, latUsuario, lngUsuario);
}

/**
 * Lida com o erro da Geolocalização.
 * (Nenhuma alteração nesta função)
 */
function erroGeolocalizacao(error) {
    const statusGps = document.getElementById('mensagemStatus');
    let mensagemErro = 'Não foi possível obter sua localização. ';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            mensagemErro = "Você negou o acesso à localização.";
            break;
        case error.POSITION_UNAVAILABLE:
            mensagemErro = "Informações de localização indisponíveis.";
            break;
        case error.TIMEOUT:
            mensagemErro = "Tempo limite da solicitação de localização expirado.";
            break;
        default:
            mensagemErro = "Ocorreu um erro desconhecido na geolocalização.";
            break;
    }
    statusGps.textContent = mensagemErro;
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario'); 
    btnBuscarGps.textContent = 'Erro ao usar GPS. Tentar novamente?';
    btnBuscarGps.disabled = false;
}

/**
 * Inicia a tentativa de busca por GPS.
 * (Nenhuma alteração nesta função)
 */
function iniciarBuscaGps() {
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario'); 
    btnBuscarGps.disabled = true;
    btnBuscarGps.textContent = 'Obtendo localização...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(mostrarUbsProximas, erroGeolocalizacao, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        alert("Geolocalização não é suportada por este navegador.");
        btnBuscarGps.disabled = false;
        btnBuscarGps.textContent = 'Ordenar pela localização (GPS)';
    }
}


// =========================================================================
// INICIALIZAÇÃO DA BUSCA
// =========================================================================

/**
 * Lida com a busca inicial de medicamentos.
 * MODIFICADO para RF07
 */
async function handleSearch(e) {
    e.preventDefault();
    
    const inputNomeMedicamento = document.getElementById('nomeMedicamento');
    const containerResultados = document.getElementById('containerResultados');
    const mensagemStatus = document.getElementById('mensagemStatus');
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario'); 
    
    const nome = inputNomeMedicamento.value.trim();
    containerResultados.innerHTML = '';
    listaUbsCompleta = []; 
    // --- MODIFICAÇÃO RF07 ---
    medicamentoBuscado = null; // Limpa o nome do medicamento anterior
    // --- FIM DA MODIFICAÇÃO ---
    if (btnBuscarGps) btnBuscarGps.style.display = 'none';

    if (!nome) {
        mensagemStatus.textContent = 'Por favor, digite o nome de um medicamento.';
        return;
    }

    mensagemStatus.textContent = 'Buscando...';
    document.getElementById('mapaUbs').style.display = 'none'; 

    try {
        // A API agora retorna a disponibilidade calculada (RF06 + RF07)
        const ubsRetornadas = await api.buscarMedicamento(nome);
        
        if (ubsRetornadas && ubsRetornadas.length > 0) {
            mensagemStatus.textContent = `Resultados para "${nome}":`;
            listaUbsCompleta = ubsRetornadas; 
            // --- ADIÇÃO RF07 ---
            medicamentoBuscado = nome; // Salva o nome para usar no botão "Reservar"
            // --- FIM DA ADIÇÃO ---

            if (btnBuscarGps) {
                btnBuscarGps.style.display = 'block';
                btnBuscarGps.textContent = 'Ordenar pela localização (GPS)';
                btnBuscarGps.disabled = false;
            }

            renderizarResultados(listaUbsCompleta);
            exibirMapa(listaUbsCompleta); // <-- Esta chamada agora funciona

        } else {
            mensagemStatus.textContent = `Nenhum resultado encontrado para "${nome}".`;
            document.getElementById('mapaUbs').style.display = 'none';
        }

    } catch (erro) {
        console.error('Erro na busca:', erro);
        mensagemStatus.textContent = erro.message || 'Não foi possível conectar ao servidor.';
        document.getElementById('mapaUbs').style.display = 'none';
    }
}


/**
 * Inicializa os event listeners da tela de busca do usuário.
 */
export function initUsuarioBusca() {
    const formularioBusca = document.getElementById('formularioBusca');
    const btnBuscarGpsUsuario = document.getElementById('btnBuscarGpsUsuario');

    if (formularioBusca) {
        formularioBusca.addEventListener('submit', handleSearch);
    }
    
    if (btnBuscarGpsUsuario) {
        btnBuscarGpsUsuario.addEventListener('click', () => {
             if (listaUbsCompleta.length > 0) {
                 iniciarBuscaGps();
             } else {
                 alert('Busque um medicamento primeiro.');
             }
        });
    }
    
    const mapaUbsDiv = document.getElementById('mapaUbs');
    if (mapaUbsDiv) {
        mapaUbsDiv.style.display = 'none';
    }
}