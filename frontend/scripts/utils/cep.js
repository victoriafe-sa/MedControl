// frontend/scripts/utils/cep.js
import { api } from './api.js';

/**
 * Formata o valor de um input para o padrão de CEP (XXXXX-XXX).
 * @param {HTMLInputElement} inputElement
 */
export function formatarCep(inputElement) {
    if (!inputElement) return;
    let cep = inputElement.value.replace(/\D/g, '');
    cep = cep.substring(0, 8);
    if (cep.length > 5) {
        cep = cep.slice(0, 5) + '-' + cep.slice(5);
    }
    inputElement.value = cep;
}

/**
 * Valida um CEP usando a API e atualiza a UI do input.
 * @param {HTMLInputElement} inputElement - O input do CEP.
 * @param {HTMLElement} validationElement - O elemento <p> para exibir "CEP válido/inválido".
 */
export async function validarCep(inputElement, validationElement) {
    if (!inputElement || !validationElement) return;

    const cep = inputElement.value.replace(/\D/g, '');

    inputElement.classList.remove('input-success', 'input-error');
    validationElement.textContent = '';
    validationElement.className = 'validation-message';

    if (cep.length === 8) {
        try {
            // Usa a função da API centralizada
            await api.validarCep(cep);
            inputElement.classList.add('input-success');
            validationElement.textContent = 'CEP válido';
            validationElement.classList.add('success');
        } catch (error) {
            // A API lança erro se o status não for ok (ex: 404)
            inputElement.classList.add('input-error');
            const mensagem = (error.status === 404) ? 'CEP inválido' : 'Erro ao consultar CEP';
            validationElement.textContent = mensagem;
            validationElement.classList.add('error');
        }
    }
}

/**
 * Preenche o estado de validação de um campo CEP ao carregar um modal.
 * Se o valor já for um CEP completo, marca como válido.
 * @param {HTMLInputElement} inputElement - O input do CEP.
 * @param {HTMLElement} validationElement - O elemento <p> para a mensagem.
 * @param {string} cepValue - O valor do CEP a ser verificado.
 */
export function preencherValidacaoCep(inputElement, validationElement, cepValue) {
    if (!inputElement || !validationElement) return;

    // Limpa o estado
    inputElement.classList.remove('input-success', 'input-error');
    validationElement.textContent = '';
    validationElement.className = 'validation-message';

    // Se o CEP do usuário já for válido (completo, XXXXX-XXX), marca como sucesso.
    if (cepValue && cepValue.length === 9) {
        inputElement.classList.add('input-success');
        validationElement.textContent = 'CEP válido';
        validationElement.classList.add('success');
    }
}
