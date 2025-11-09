// frontend/scripts/admin/admin-ubs.js
import { api } from '../utils/api.js';
// MODIFICADO: Importa funções de CEP
import { formatarCep, validarCep, preencherValidacaoCep } from '../utils/cep.js';
import { exibirToast, fecharTodosModais, limparErrosFormulario, abrirConfirmacao } from '../utils/ui.js';

let modalUbs, formularioUbs, corpoTabelaUbs, ubsCepInput, ubsCepValidacao, ubsCepErro;
let estaEditando = false;

async function carregarUbs() {
    try {
        const ubsLista = await api.listarUbs();
        corpoTabelaUbs.innerHTML = '';
        if (ubsLista.length === 0) {
            corpoTabelaUbs.innerHTML = `<tr><td colspan="8" class="p-4 text-center">Nenhuma UBS cadastrada.</td></tr>`;
            return;
        }

        ubsLista.forEach(ubs => {
            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-200`;
            tr.innerHTML = `
                <td class="p-4">${ubs.nome}</td>
                <td class="p-4">${ubs.endereco}</td>
                <td class="p-4">${ubs.telefone || 'N/A'}</td>
                <td class="p-4">${ubs.horario_funcionamento || 'N/A'}</td>
                <td class="p-4">${ubs.cep || 'N/A'}</td> <!-- ADICIONADO -->
                <td class="p-4 text-xs">Lat: ${ubs.latitude || 'N/A'}<br>Lon: ${ubs.longitude || 'N/A'}</td>
                <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativa</span></td>
                <td class="p-4 flex space-x-2">
                    <button class="btn-editar-ubs btn-secundario py-1 px-3 rounded-lg text-sm" data-ubs='${JSON.stringify(ubs)}'>Editar</button>
                    <button class="btn-excluir-ubs btn-perigo py-1 px-3 rounded-lg text-sm" data-id="${ubs.id_ubs}">Desativar</button>
                </td>
            `;
            corpoTabelaUbs.appendChild(tr);
        });
    } catch (erro) {
        corpoTabelaUbs.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">${erro.message || 'Falha ao carregar UBS.'}</td></tr>`;
    }
}

function abrirModalUbs(ubs = null) {
    limparErrosFormulario('formularioUbs');
    formularioUbs.reset(); // Limpa o formulário
    
    // MODIFICADO: Limpa validação de CEP
    preencherValidacaoCep(ubsCepInput, ubsCepValidacao, ubs ? ubs.cep : null);
    
    if (ubs) {
        estaEditando = true;
        document.getElementById('tituloModalUbs').textContent = 'Editar UBS';
        document.getElementById('idUbsForm').value = ubs.id_ubs;
        document.getElementById('ubsNome').value = ubs.nome;
        document.getElementById('ubsEndereco').value = ubs.endereco;
        document.getElementById('ubsTelefone').value = ubs.telefone;
        document.getElementById('ubsHorario').value = ubs.horario_funcionamento;
        document.getElementById('ubsCep').value = ubs.cep; // ADICIONADO
        document.getElementById('ubsLatitude').value = ubs.latitude;
        document.getElementById('ubsLongitude').value = ubs.longitude;
    } else {
        estaEditando = false;
        document.getElementById('tituloModalUbs').textContent = 'Adicionar UBS';
        document.getElementById('idUbsForm').value = '';
    }
    modalUbs.classList.add('ativo');
}

async function salvarUbs(e) {
    e.preventDefault();
    
    // MODIFICADO: Validação do CEP
    if (ubsCepInput.value && !ubsCepInput.classList.contains('input-success')) {
        ubsCepErro.textContent = 'Por favor, valide um CEP válido.';
        exibirToast('CEP inválido ou não validado.', true);
        return;
    }
    
    const id = document.getElementById('idUbsForm').value;
    const dados = {
        nome: document.getElementById('ubsNome').value,
        endereco: document.getElementById('ubsEndereco').value,
        telefone: document.getElementById('ubsTelefone').value,
        horario_funcionamento: document.getElementById('ubsHorario').value,
        cep: document.getElementById('ubsCep').value, // ADICIONADO
        latitude: document.getElementById('ubsLatitude').value || null,
        longitude: document.getElementById('ubsLongitude').value || null,
    };

    try {
        if (estaEditando) {
            await api.atualizarUbs(id, dados);
            exibirToast('UBS atualizada com sucesso!');
        } else {
            await api.cadastrarUbs(dados);
            exibirToast('UBS cadastrada com sucesso!');
        }
        fecharTodosModais();
        carregarUbs();
    } catch (erro) {
        exibirToast(`Erro ao salvar UBS: ${erro.message}`, true);
    }
}

async function excluirUbs(id) {
    abrirConfirmacao(
        'Desativar UBS',
        'Tem certeza que deseja desativar esta UBS? Esta ação é uma exclusão lógica.',
        async () => {
            try {
                await api.excluirUbs(id);
                exibirToast('UBS desativada com sucesso!');
                carregarUbs();
            } catch (erro) {
                exibirToast(`Erro ao desativar UBS: ${erro.message}`, true);
            }
        }
    );
}

export function initAdminUbs() {
    modalUbs = document.getElementById('modalUbs');
    formularioUbs = document.getElementById('formularioUbs');
    corpoTabelaUbs = document.getElementById('corpoTabelaUbs');
    
    // MODIFICADO: Mapeia campos de CEP da UBS
    ubsCepInput = document.getElementById('ubsCep');
    ubsCepValidacao = document.getElementById('validacaoUbsCep');
    ubsCepErro = document.getElementById('erroUbsCep');

    if (!modalUbs || !formularioUbs || !corpoTabelaUbs || !ubsCepInput) {
        console.error('Elementos da aba UBS não encontrados.');
        return;
    }

    document.getElementById('abrirModalAdicionarUbs').addEventListener('click', () => abrirModalUbs(null));
    formularioUbs.addEventListener('submit', salvarUbs);

    // MODIFICADO: Adiciona listeners de CEP
    ubsCepInput.addEventListener('input', () => formatarCep(ubsCepInput));
    ubsCepInput.addEventListener('blur', () => validarCep(ubsCepInput, ubsCepValidacao));
    ubsCepInput.addEventListener('focus', () => {
        ubsCepValidacao.textContent = '';
        ubsCepValidacao.className = 'validation-message';
        ubsCepErro.textContent = '';
        ubsCepInput.classList.remove('input-success', 'input-error');
    });

    corpoTabelaUbs.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar-ubs')) {
            abrirModalUbs(JSON.parse(e.target.dataset.ubs));
        }
        if (e.target.classList.contains('btn-excluir-ubs')) {
            excluirUbs(e.target.dataset.id);
        }
    });

    carregarUbs();
}