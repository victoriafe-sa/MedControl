// frontend/scripts/usuario/usuario-busca.js
// ADICIONADO RF6.3: Importar o 'api' para que o ID do usuário seja logado
import { api } from '../utils/api.js';

/**
 * Inicializa a lógica de busca de medicamentos na tela do usuário.
 * Esta função será expandida na RF05 e RF06.
 */
export function initUsuarioBusca() {
    const formularioBusca = document.getElementById('formularioBusca');
    const inputNomeMedicamento = document.getElementById('nomeMedicamento');
    const containerResultados = document.getElementById('containerResultados');
    const mensagemStatus = document.getElementById('mensagemStatus');

    if (!formularioBusca) return;

    formularioBusca.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNomeMedicamento.value.trim();
        containerResultados.innerHTML = '';

        if (!nome) {
            mensagemStatus.textContent = 'Por favor, digite o nome de um medicamento.';
            return;
        }

        mensagemStatus.textContent = 'Buscando...';

        try {
            // MODIFICADO RF6.3: Troca 'fetch' direto por 'api.buscarMedicamento'
            // Isso garante que o 'X-User-ID' header seja enviado para o log.
            const listaUbs = await api.buscarMedicamento(nome);

            // A API agora retorna erro em caso de falha, então não precisamos checar 'resposta.ok'
            
            if (listaUbs.length > 0) {
                mensagemStatus.textContent = `Resultados para "${nome}":`;
                let htmlResultados = '<ul class="space-y-4">';
                listaUbs.forEach(ubs => {
                    // MODIFICADO RF6.3: O endpoint real retorna 'quantidade', não 'estoque'
                    htmlResultados += `
                        <li class="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                            <div>
                                <p class="font-semibold text-xl text-gray-800">${ubs.nome}</p>
                                <p class="text-gray-600">${ubs.endereco}</p>
                                <p class="text-green-600 font-medium">Estoque: ${ubs.quantidade} unidades</p>
                            </div>
                            <button class="btn-primario py-2 px-6 rounded-lg font-semibold">Reservar</button>
                        </li>`;
                });
                htmlResultados += '</ul>';
                containerResultados.innerHTML = htmlResultados;
            } else {
                mensagemStatus.textContent = `Nenhum resultado encontrado para "${nome}".`;
            }

        } catch (erro) {
            console.error('Erro na busca:', erro);
            // 'api.js' já lança um erro formatado
            mensagemStatus.textContent = erro.message || 'Não foi possível conectar ao servidor.';
        }
    });
}