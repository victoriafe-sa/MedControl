// frontend/scripts/usuario/usuario-busca.js

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
            // No futuro, isso chamará api.buscarMedicamento(nome)
            // Por enquanto, usamos o mesmo mock da Home.js
            const resposta = await fetch(`http://localhost:7071/api/medicamentos/search?nome=${encodeURIComponent(nome)}`);
            const listaUbs = await resposta.json();

            if (resposta.ok) {
                if (listaUbs.length > 0) {
                    mensagemStatus.textContent = `Resultados para "${nome}":`;
                    let htmlResultados = '<ul class="space-y-4">';
                    listaUbs.forEach(ubs => {
                        htmlResultados += `
                            <li class="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                                <div>
                                    <p class="font-semibold text-xl text-gray-800">${ubs.nome}</p>
                                    <p class="text-gray-600">${ubs.endereco}</p>
                                    <p class="text-green-600 font-medium">Estoque: ${ubs.estoque} unidades</p>
                                </div>
                                <button class="btn-primario py-2 px-6 rounded-lg font-semibold">Reservar</button>
                            </li>`;
                    });
                    htmlResultados += '</ul>';
                    containerResultados.innerHTML = htmlResultados;
                } else {
                    mensagemStatus.textContent = `Nenhum resultado encontrado para "${nome}".`;
                }
            } else {
                mensagemStatus.textContent = 'Erro ao buscar. Tente novamente.';
            }
        } catch (erro) {
            console.error('Erro na busca:', erro);
            mensagemStatus.textContent = 'Não foi possível conectar ao servidor.';
        }
    });
}
