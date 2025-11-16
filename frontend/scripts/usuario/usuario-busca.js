// frontend/scripts/usuario/usuario-busca.js
import { api } from '../utils/api.js';

// 🟩 Variáveis globais do mapa e dados
let mapa = null;
let marcadores = [];
let listaUbsCompleta = []; // Armazena as UBSs retornadas da API para reordenação
let medicamentoBuscado = null;

// =========================================================================
// FUNÇÕES DE UTILIDADE (HAERSINE)
// =========================================================================

/**
 * Calcula a distância entre dois pontos (em km) usando a fórmula de Haversine.
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
 * @param {Array} listaUbs - Lista de UBSs com latitude e longitude.
 * @param {number|null} latUsuario - Latitude do usuário (opcional).
 * @param {number|null} lngUsuario - Longitude do usuário (opcional).
 */
function exibirMapa(listaUbs, latUsuario = null, lngUsuario = null) {
    const divMapa = document.getElementById('mapaUbs');
    if (!divMapa) return;

    // Garante que a div do mapa está visível
    divMapa.style.display = 'block'; 

    // --- 1. Determinação do Centro e Zoom Inicial ---
    
    // Filtra UBSs com coordenadas válidas
    const ubsComCoords = listaUbs.filter(ubs => ubs.latitude && ubs.longitude);
    
    // Coordenadas padrão (DF)
    const DF_LAT = -15.7942;
    const DF_LNG = -47.8825;

    let centroLat = latUsuario || (ubsComCoords[0]?.latitude || DF_LAT);
    let centroLng = lngUsuario || (ubsComCoords[0]?.longitude || DF_LNG);
    let zoomInicial = latUsuario ? 13 : (ubsComCoords.length > 0 ? 12 : 10);
    
    if (ubsComCoords.length === 0 && !latUsuario) {
        // Se não houver coordenadas de UBS e nem do usuário, centraliza no DF com zoom 10
        centroLat = DF_LAT;
        centroLng = DF_LNG;
        zoomInicial = 10;
    }

    // --- 2. Criação/Atualização do Mapa ---
    if (!mapa) {
        mapa = L.map('mapaUbs').setView([centroLat, centroLng], zoomInicial);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa);
    } else {
        mapa.setView([centroLat, centroLng], zoomInicial);
    }

    // --- 3. Limpeza de Marcadores Antigos ---
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];
    let todosPontos = [];

    // --- 4. Adicionar Marcador do Usuário ---
    if (latUsuario && lngUsuario) {
         // Ícone vermelho para o usuário (mais visível)
         const userIcon = L.icon({
             iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
             shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
             iconSize: [25, 41],
             iconAnchor: [12, 41],
             popupAnchor: [1, -34],
             shadowSize: [41, 41]
         });

        const userMarker = L.marker([latUsuario, lngUsuario], { icon: userIcon })
            .addTo(mapa)
            .bindPopup("Você está aqui!").openPopup();
            
        marcadores.push(userMarker);
        todosPontos.push([latUsuario, lngUsuario]);
    }
    
    // --- 5. Adicionar Marcadores das UBSs ---
    // Ícone azul padrão para UBSs
    const ubsIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    ubsComCoords.forEach(ubs => {
        // Usa as coordenadas da UBS
        const lat = parseFloat(ubs.latitude);
        const lng = parseFloat(ubs.longitude);

        const distanciaTexto = ubs.distancia ? `Distância: ${ubs.distancia} km<br>` : '';

        const marker = L.marker([lat, lng], { icon: ubsIcon })
            .addTo(mapa)
            .bindPopup(`
                <b>${ubs.nome}</b><br>
                ${ubs.endereco}<br>
                Estoque: ${ubs.quantidade}<br>
                ${distanciaTexto}
            `);

        marcadores.push(marker);
        todosPontos.push([lat, lng]);
    });

    // --- 6. Ajustar Zoom (fitBounds) ---
    if (todosPontos.length > 0) {
        const grupo = L.featureGroup(marcadores);
        mapa.fitBounds(grupo.getBounds(), { padding: [50, 50], maxZoom: 14 }); // Ajuste de padding e zoom máximo para melhor visualização
    }
    
    // Corrige o tamanho do mapa após ser exibido
    setTimeout(() => {
        mapa.invalidateSize();
    }, 150);
}

// =========================================================================
// FUNÇÕES DE BUSCA E ORDENAÇÃO
// =========================================================================

/**
 * Renderiza os resultados da busca na lista.
 */
function renderizarResultados(listaUbs) {
    const containerResultados = document.getElementById('containerResultados');
    containerResultados.innerHTML = '';
    
    let htmlResultados = '<ul class="space-y-4">';

    listaUbs.forEach(ubs => {
        // Adiciona a distância se ela existir (após o cálculo do GPS)
        const distanciaTexto = ubs.distancia ? ` (${ubs.distancia} km)` : '';

        htmlResultados += `
            <li class="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                <div>
                    <p class="font-semibold text-xl text-gray-800">${ubs.nome}</p>
                    <p class="text-gray-600">${ubs.endereco}</p>
                    <p class="text-green-600 font-medium">Estoque: ${ubs.quantidade} unidades${distanciaTexto}</p>
                </div>
                <button class="btn-primario py-2 px-6 rounded-lg font-semibold">Reservar</button>
            </li>`;
    });

    htmlResultados += '</ul>';
    containerResultados.innerHTML = htmlResultados;
}


/**
 * Lida com o resultado de sucesso da Geolocalização.
 */
function mostrarUbsProximas(posicao) {
    const latUsuario = posicao.coords.latitude;
    const lngUsuario = posicao.coords.longitude;
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario');

    // 1. Calcular distância e ordenar UBSs
    let ubsOrdenadas = listaUbsCompleta.map(ubs => {
        // USANDO ubs.latitude e ubs.longitude
        const ubsLat = parseFloat(ubs.latitude);
        const ubsLng = parseFloat(ubs.longitude);

        let distancia = 'N/A';
        if (!isNaN(ubsLat) && !isNaN(ubsLng)) {
            distancia = calcularDistancia(latUsuario, lngUsuario, ubsLat, ubsLng).toFixed(1);
        }
        
        return { ...ubs, distancia: distancia };
    }).sort((a, b) => {
        if (a.distancia === 'N/A') return 1;
        if (b.distancia === 'N/A') return -1;
        return parseFloat(a.distancia) - parseFloat(b.distancia);
    });

    btnBuscarGps.textContent = 'Ordenar pela localização (GPS) ✔️';
    btnBuscarGps.disabled = false;
    document.getElementById('mensagemStatus').textContent = `Resultados para "${medicamentoBuscado}" (Ordenados por proximidade):`;
    
    // 2. Renderizar a lista e o mapa ordenados
    renderizarResultados(ubsOrdenadas);
    exibirMapa(ubsOrdenadas, latUsuario, lngUsuario);
}

/**
 * Lida com o erro da Geolocalização.
 */
function erroGeolocalizacao(error) {
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario');
    btnBuscarGps.textContent = 'Ordenar pela localização (GPS)';
    btnBuscarGps.disabled = false;
    
    let msg = (error && error.code === error.PERMISSION_DENIED) 
        ? "Permissão de localização negada. A lista não será ordenada por distância."
        : "Erro ao obter a localização. Tente novamente.";
    
    document.getElementById('mensagemStatus').textContent = msg;
    
    // Exibe o mapa mesmo sem o GPS do usuário, forçando a re-renderização
    exibirMapa(listaUbsCompleta);
}

/**
 * Inicia a tentativa de busca por GPS.
 */
function iniciarBuscaGps() {
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario');
    btnBuscarGps.textContent = 'Buscando Localização...';
    btnBuscarGps.disabled = true;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            mostrarUbsProximas, // Sucesso
            erroGeolocalizacao,  // Erro
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Geolocalização não é suportada por este navegador.");
        erroGeolocalizacao();
    }
}


// =========================================================================
// INICIALIZAÇÃO DA BUSCA
// =========================================================================

/**
 * Lida com a busca inicial de medicamentos.
 */
async function handleSearch(e) {
    e.preventDefault();
    
    const inputNomeMedicamento = document.getElementById('nomeMedicamento');
    const containerResultados = document.getElementById('containerResultados');
    const mensagemStatus = document.getElementById('mensagemStatus');
    const btnBuscarGps = document.getElementById('btnBuscarGpsUsuario'); 
    
    const nome = inputNomeMedicamento.value.trim();
    containerResultados.innerHTML = '';
    listaUbsCompleta = []; // Limpa resultados anteriores
    medicamentoBuscado = null;
    if (btnBuscarGps) btnBuscarGps.style.display = 'none';

    if (!nome) {
        mensagemStatus.textContent = 'Por favor, digite o nome de um medicamento.';
        return;
    }

    mensagemStatus.textContent = 'Buscando...';
    document.getElementById('mapaUbs').style.display = 'none'; // Esconde o mapa durante a busca

    try {
        const ubsRetornadas = await api.buscarMedicamento(nome);
        
        if (ubsRetornadas && ubsRetornadas.length > 0) {
            mensagemStatus.textContent = `Resultados para "${nome}":`;
            listaUbsCompleta = ubsRetornadas; // Salva para reordenação
            medicamentoBuscado = nome;

            if (btnBuscarGps) {
                btnBuscarGps.style.display = 'block';
                btnBuscarGps.textContent = 'Ordenar pela localização (GPS)';
                btnBuscarGps.disabled = false;
            }

            // Exibe os resultados (lista e mapa)
            renderizarResultados(listaUbsCompleta);
            exibirMapa(listaUbsCompleta);

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
    
    // Garante que o mapa esteja oculto no carregamento inicial da página
    const mapaUbsDiv = document.getElementById('mapaUbs');
    if (mapaUbsDiv) {
        mapaUbsDiv.style.display = 'none';
    }
}