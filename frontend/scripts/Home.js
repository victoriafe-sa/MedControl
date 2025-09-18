 document.addEventListener('DOMContentLoaded', () => {
    const modalBusca = document.getElementById('modalBusca');
    const btnAbrirModalBusca = document.getElementById('btnAbrirModalBusca');
    const btnFecharModalBusca = document.getElementById('btnFecharModalBusca');
    const formularioBusca = document.getElementById('formularioBusca');
    const inputNomeMedicamento = document.getElementById('inputNomeMedicamento');
    const resultadosBusca = document.getElementById('resultadosBusca');
    const containerBuscaCep = document.getElementById('containerBuscaCep');

    btnAbrirModalBusca.addEventListener('click', () => {
        inputNomeMedicamento.value = '';
        resultadosBusca.innerHTML = '';
        containerBuscaCep.style.display = 'none';
        modalBusca.style.display = 'flex';
    });

    btnFecharModalBusca.addEventListener('click', () => { modalBusca.style.display = 'none'; });
    window.addEventListener('click', (evento) => { if (evento.target == modalBusca) { modalBusca.style.display = 'none'; } });

    formularioBusca.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nomeMedicamento = inputNomeMedicamento.value.trim();
        containerBuscaCep.style.display = 'none';

        if (!nomeMedicamento) {
            resultadosBusca.innerHTML = `<p class="text-red-600 text-center">Por favor, digite o nome de um medicamento.</p>`;
            return;
        }
        resultadosBusca.innerHTML = `<p class="text-gray-600 text-center">Buscando...</p>`;

        try {
            const resposta = await fetch(`http://localhost:7071/api/medicamentos/search?nome=${encodeURIComponent(nomeMedicamento)}`);
            const listaUbs = await resposta.json();

            if (resposta.ok) {
                if (listaUbs.length > 0) {
                    let htmlResultados = `<p class="text-green-600 font-semibold text-lg text-center mb-4">Medicamento disponível nestas UBS:</p>
                                          <ul class="space-y-3 ubs-list">`;
                    listaUbs.forEach(ubs => {
                        htmlResultados += `<li class="p-3 bg-gray-100 rounded-md flex justify-between items-center">
                                                <div>
                                                    <p class="font-semibold text-gray-800">${ubs.nome}</p>
                                                    <p class="text-sm text-gray-600">${ubs.endereco}</p>
                                                </div>
                                                <button onclick="window.location.href='TelaLoginCadastro.html'" class="btn-detalhes">
                                                    Detalhes
                                                </button>
                                            </li>`;
                    });
                    htmlResultados += `</ul>`;
                    resultadosBusca.innerHTML = htmlResultados;
                    containerBuscaCep.style.display = 'block';
                } else {
                    resultadosBusca.innerHTML = `<p class="text-red-600 font-semibold text-lg text-center">Medicamento indisponível em nossa rede no momento.</p>`;
                }
            } else {
                resultadosBusca.innerHTML = `<p class="text-red-600 text-center">Erro ao buscar. Tente novamente.</p>`;
            }
        } catch (erro) {
            console.error('Erro na busca:', erro);
            resultadosBusca.innerHTML = `<p class="text-red-600 text-center">Não foi possível conectar ao servidor.</p>`;
        }
    });
});

