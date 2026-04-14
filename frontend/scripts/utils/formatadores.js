// frontend/scripts/utils/formatadores.js

/**
 * Formata uma data (string, timestamp ou objeto Date) para o padrão brasileiro (DD/MM/AAAA).
 * Lida com diferentes formatos de entrada e retorna um fallback seguro.
 * @param {string|number|Date|null} valor - O valor da data a ser formatado.
 * @param {string} [fallback='N/A'] - Texto retornado caso a data seja inválida ou nula.
 * @returns {string} - A data formatada ou o texto de fallback.
 */
export function formatarDataBR(valor, fallback = 'N/A') {
    if (valor == null) return fallback;

    try {
        let dataObj;

        if (typeof valor === 'string') {
            // "YYYY-MM-DD" → substitui '-' por '/' para forçar parse como data local (evita fuso UTC)
            dataObj = new Date(valor.replace(/-/g, '/'));
        } else if (typeof valor === 'number') {
            dataObj = new Date(valor);
        } else {
            dataObj = new Date(valor);
        }

        if (isNaN(dataObj.getTime())) return 'Inválida';

        return dataObj.toLocaleDateString('pt-BR');
    } catch (e) {
        console.error('Erro ao formatar data:', valor, e);
        return 'Inválida';
    }
}

/**
 * Formata uma data ISO ("YYYY-MM-DDTHH:MM:SS") para exibição completa (DD/MM/AAAA HH:MM).
 * @param {string} valorISO - String ISO da data.
 * @param {string} [fallback='N/A'] - Texto de fallback.
 * @returns {string}
 */
export function formatarDataHoraBR(valorISO, fallback = 'N/A') {
    if (!valorISO) return fallback;

    try {
        const dataObj = new Date(valorISO);
        if (isNaN(dataObj.getTime())) return 'Inválida';

        return dataObj.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Erro ao formatar data/hora:', valorISO, e);
        return 'Inválida';
    }
}

/**
 * Converte uma data para o formato YYYY-MM-DD (necessário para input[type="date"]).
 * Usa coordenadas UTC para evitar deslocamento de fuso horário.
 * @param {string|number|Date|null} valor - O valor da data.
 * @returns {string} - Data em formato YYYY-MM-DD ou string vazia.
 */
export function formatarParaInputDate(valor) {
    if (valor == null) return '';

    try {
        const dataObj = new Date(valor);
        if (isNaN(dataObj.getTime())) return '';

        const ano = dataObj.getUTCFullYear();
        const mes = (dataObj.getUTCMonth() + 1).toString().padStart(2, '0');
        const dia = dataObj.getUTCDate().toString().padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    } catch (e) {
        console.error('Erro ao formatar data para input:', valor, e);
        return '';
    }
}

/**
 * Formata uma data de nascimento (YYYY-MM-DD) para exibição brasileira,
 * forçando o fuso de Brasília para evitar deslocamento de dia.
 * @param {string|null} dataNascimento - Data no formato YYYY-MM-DD.
 * @returns {string}
 */
export function formatarNascimentoBR(dataNascimento) {
    if (!dataNascimento) return 'Não informada';

    try {
        const dataObj = new Date(dataNascimento + 'T00:00:00-03:00');
        if (isNaN(dataObj.getTime())) return 'Inválida';
        return dataObj.toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Inválida';
    }
}

/**
 * Popula um elemento <select> com opções a partir de uma lista de objetos.
 * @param {HTMLSelectElement|string} seletorOuElemento - O elemento ou seu ID.
 * @param {Array<object>} lista - A lista de objetos.
 * @param {string} chaveValor - A propriedade do objeto usada como `value`.
 * @param {string} chaveTexto - A propriedade do objeto usada como texto visível.
 * @param {string} [placeholder='Selecione...'] - Texto da primeira opção vazia.
 */
export function popularSelect(seletorOuElemento, lista, chaveValor, chaveTexto, placeholder = 'Selecione...') {
    const select = typeof seletorOuElemento === 'string'
        ? document.getElementById(seletorOuElemento)
        : seletorOuElemento;

    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;

    lista.forEach(item => {
        const option = document.createElement('option');
        option.value = item[chaveValor];
        option.textContent = item[chaveTexto];
        select.appendChild(option);
    });
}
