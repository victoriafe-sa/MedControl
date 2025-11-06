// frontend/scripts/utils/validacao.js

/**
 * Valida se uma string é um e-mail com formato válido.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Valida se uma data de nascimento corresponde a mais de 18 anos.
 * @param {string} dataNasc - Data no formato YYYY-MM-DD.
 * @returns {boolean}
 */
export function isMaisDe18(dataNasc) {
    if (!dataNasc) return false;
    try {
        const hoje = new Date();
        const dezoitoAnosAtras = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
        
        // Corrige o problema de fuso horário ao comparar datas
        // Cria a data de nascimento em UTC para evitar deslocamentos
        const dataNascimentoUTC = new Date(dataNasc + 'T00:00:00Z');
        
        // Ajusta para o fuso horário local (ex: Brasília -3h) se necessário, 
        // mas para esta lógica, comparar UTC com UTC (implícito do 'new Date()') é mais seguro.
        // A forma mais simples é garantir que ambas as datas estão em UTC "meia-noite"
        const dataNascObj = new Date(Date.UTC(
            dataNascimentoUTC.getUTCFullYear(),
            dataNascimentoUTC.getUTCMonth(),
            dataNascimentoUTC.getUTCDate()
        ));
        
        const dezoitoAnosAtrasObj = new Date(Date.UTC(
            dezoitoAnosAtras.getUTCFullYear(),
            dezoitoAnosAtras.getUTCMonth(),
            dezoitoAnosAtras.getUTCDate()
        ));

        return dataNascObj <= dezoitoAnosAtrasObj;
    } catch (e) {
        console.error("Erro ao validar data de nascimento:", e);
        return false;
    }
}
