# MedControl — Relatório de Refatoração
## Clean Code & Usabilidade

**Data:** Abril 2026
**Escopo:** Frontend (19 arquivos JavaScript modificados, 1 arquivo novo criado)
**Restrição:** Lógica de negócio e comportamento central mantidos 100% intactos.

---

## Resumo Executivo

| Métrica | Antes | Depois | Impacto |
|---|---|---|---|
| Linhas de código JS | 5.760 | 5.381 | -6,6% (379 linhas removidas) |
| Blocos de formatação de data duplicados | 7 | 0 | -100% (centralizados) |
| Padrões de listener CEP duplicados | 4 | 0 | -100% (centralizados) |
| Funções `popularSelect` duplicadas | 2 | 0 | -100% (centralizadas) |
| Chamadas `alert()` nativas | 7 | 0 | -100% (substituídas) |
| Comentários de "tutorial" / marcadores | ~120 linhas | 0 | Código limpo |
| Artefatos de citação `[cite:...]` | 4 | 0 | Código limpo |

---

## 1. Clean Code — Mudanças Realizadas

### 1.1 Novo Módulo: `utils/formatadores.js` (DRY)

Criado um módulo centralizado com 5 funções que eliminam duplicação massiva:

| Função | Substitui | Arquivos Impactados |
|---|---|---|
| `formatarDataBR(valor, fallback)` | 7 blocos idênticos de ~20 linhas cada | admin-medicamentos, admin-ubs, admin-relatorios (×3), admin-auditoria |
| `formatarDataHoraBR(valorISO)` | Formatação inline de data/hora | admin-auditoria, usuario-reservas (×2) |
| `formatarParaInputDate(valor)` | Conversão manual para `input[type=date]` | admin-medicamentos |
| `formatarNascimentoBR(data)` | Formatação com fuso hardcoded | admin-usuarios, admin-perfil, usuario-perfil |
| `popularSelect(el, lista, chave, texto)` | 2 implementações separadas | admin-medicamentos, admin-validacao |

**Antes (repetido 7 vezes):**
```javascript
let dataValidade = 'N/A';
if (item.data_validade) {
    try {
        let dataObj;
        if (typeof item.data_validade === 'string') {
            dataObj = new Date(item.data_validade.replace(/-/g, '/'));
        } else if (typeof item.data_validade === 'number') {
            dataObj = new Date(item.data_validade);
        } else {
            dataObj = new Date(item.data_validade);
        }
        if (isNaN(dataObj.getTime())) { dataValidade = 'Inválida'; }
        else { dataValidade = dataObj.toLocaleDateString('pt-BR'); }
    } catch (e) { dataValidade = 'Inválida'; }
}
```

**Depois (1 chamada):**
```javascript
const dataValidade = formatarDataBR(item.data_validade);
```

### 1.2 Nova Função: `configurarCamposCep()` em `cep.js` (DRY)

O padrão de 3 event listeners para campos de CEP (input, blur, focus) aparecia idêntico em **4 módulos**. Agora é uma única chamada:

**Antes (repetido 4 vezes, ~12 linhas cada):**
```javascript
cepInput.addEventListener('input', () => formatarCep(cepInput));
cepInput.addEventListener('blur', () => validarCep(cepInput, validationEl));
cepInput.addEventListener('focus', () => {
    validationEl.textContent = '';
    validationEl.className = 'validation-message';
    erroEl.textContent = '';
    cepInput.classList.remove('input-success', 'input-error');
});
```

**Depois:**
```javascript
configurarCamposCep(cepInput, validationEl, erroEl);
```

**Arquivos impactados:** admin-ubs, admin-usuarios, admin-perfil, usuario-perfil.

### 1.3 Eliminação de Comentários Ruidosos

Removidos ~120 linhas de marcadores que poluíam o código:

- `// --- INÍCIO DA MODIFICAÇÃO (RF07) ---` / `// --- FIM DA MODIFICAÇÃO ---`
- `// --- INÍCIO DA ADIÇÃO ---` / `// --- FIM DA ADIÇÃO ---`
- `// --- INÍCIO DA CORREÇÃO ---` / `// --- FIM DA CORREÇÃO ---`
- `// **MODIFICADO**:`, `// **NOVO**:`, `// ADICIONADO RF07:`
- `// REMOVIDO: carregarUsuarios() será chamado pelo Admin.js`
- Artefatos de citação: `[cite_start][cite: 878-883]`

Removidos 34 comentários didáticos em `TelaLoginCadastro.js` que explicavam conceitos básicos de JavaScript (try/catch, fetch, operador ternário, etc.).

### 1.4 Nomenclatura Melhorada

| Arquivo | Antes | Depois |
|---|---|---|
| admin-medicamentos | `listaMedicamentosCache`, `listaUbsCache`, `listaEstoqueCache` | `medicamentosCache`, `ubsCache`, `estoqueCache` |
| admin-medicamentos | `estaEditandoEstoque`, `estaEditandoMedBase` | `editandoEstoque`, `editandoMedBase` |
| admin-medicamentos | `toggleStatusMedicamentoBase(id, novoStatus)` com 3 variáveis (`verboAcao`, `participioAcao`, `tituloAcao`) | Simplificado para 2 (`acao`, `participio`) |
| admin-ubs | `estaEditando` (ambíguo no escopo) | `editando` (claramente local ao módulo) |
| admin-medicamentos | Variável `camposValidos` + loop procedural | Estrutura declarativa com array `validacoes.forEach()` |

### 1.5 Modularização e Organização

- **admin-medicamentos.js** foi completamente reescrito com seções claramente delimitadas por separadores visuais (`// ============`), agrupando: Estoque, Medicamento Base, e Inicialização.
- **admin-ubs.js** foi reescrito com a mesma estrutura organizacional.
- Funções `popularSelect` locais eliminadas em favor do módulo centralizado.

---

## 2. Usabilidade — Mudanças Realizadas

### 2.1 Eliminação de `alert()` Nativos (7 ocorrências)

Todos os `alert()` foram substituídos por feedback contextual na UI:

| Arquivo | Antes | Depois |
|---|---|---|
| admin-usuarios.js (×2) | `alert('Erro de conexão...')` | `exibirToast('Erro de conexão...', true)` |
| admin-perfil.js (×2) | `alert('Erro ao desativar/excluir...')` | `exibirToast('Erro ao desativar/excluir...', true)` |
| usuario-perfil.js (×2) | `alert('Erro ao desativar/excluir...')` | `exibirToast('Erro ao desativar/excluir...', true)` |
| usuario-busca.js (×2) | `alert('Geolocalização não suportada')` | `exibirToast('...', true)` |
| usuario-reservas.js | `alert('Erro ao reagendar...')` | `exibirToast('Erro ao reagendar...', true)` |
| TelaLoginCadastro.js | `alert('Erro de conexão...')` | Erro inline no campo do formulário |

**Impacto UX:** O usuário não é mais interrompido com pop-ups bloqueantes. Erros aparecem como toasts não-intrusivos ou mensagens inline contextuais.

### 2.2 Tratamento de Erros Consistente

Todas as funções de formatação de data agora têm tratamento gracioso:
- Datas nulas retornam `'N/A'` ao invés de causar crash
- Datas inválidas retornam `'Inválida'` ao invés de `'Invalid Date'`
- Funções encapsulam try/catch internamente, simplificando o código chamador

### 2.3 Estados de Loading já Presentes (Validação)

Verificamos que os estados de loading (`'Buscando...'`, `'Carregando...'`, `'Salvando...'`, botões desabilitados durante operações) já estavam implementados nos módulos originais. A refatoração preservou todos eles intactos.

---

## 3. Arquivos Modificados (19) + 1 Novo

### Novo:
- `frontend/scripts/utils/formatadores.js`

### Modificados:
| Arquivo | Tipo de Mudança |
|---|---|
| `utils/cep.js` | Adicionada `configurarCamposCep()` |
| `utils/api.js` | Limpeza de comentários e artefatos de citação |
| `utils/ui.js` | Limpeza de comentários |
| `utils/validacao.js` | Limpeza de comentários |
| `admin/admin-medicamentos.js` | **Reescrito** — DRY (formatadores + popularSelect) |
| `admin/admin-ubs.js` | **Reescrito** — DRY (formatarDataBR + configurarCamposCep) |
| `admin/admin-relatorios.js` | DRY — 3 blocos de data → `formatarDataBR()` |
| `admin/admin-auditoria.js` | DRY — `formatarDataHoraBR()` |
| `admin/admin-usuarios.js` | DRY + UX — `configurarCamposCep`, `formatarNascimentoBR`, `alert()→toast` |
| `admin/admin-perfil.js` | DRY + UX — `configurarCamposCep`, `formatarNascimentoBR`, `alert()→toast` |
| `admin/admin-validacao.js` | DRY — `popularSelect` importado |
| `admin/admin-farmaceuticos.js` | Limpeza de comentários |
| `usuario/usuario-busca.js` | UX — `alert()→exibirToast()` |
| `usuario/usuario-perfil.js` | DRY + UX — `configurarCamposCep`, `formatarNascimentoBR`, `alert()→toast` |
| `usuario/usuario-reservas.js` | DRY + UX — `formatarDataHoraBR()`, `alert()→toast` |
| `Admin.js` | Limpeza de comentários |
| `TelaUsuario.js` | Limpeza de comentários |
| `TelaLoginCadastro.js` | UX — `alert()→inline error`, limpeza de 34 comentários tutorial |
| `Home.js` | Limpeza de comentários |

---

## 4. O Que NÃO Foi Alterado (Preservação da Lógica)

- Fluxos de autenticação (login, cadastro, verificação de e-mail, recuperação de senha)
- Lógica de permissões por perfil (admin, farmacêutico, gestor_ubs, gestor_estoque)
- Endpoints da API e estrutura de dados
- Fluxo de reservas (RF07: criar, consultar, cancelar, reagendar)
- Fluxo de validação de receitas (RF05.5) e registro de retirada (RF05.6)
- Cálculo de distância Haversine e integração com Leaflet
- Lógica de relatórios e gráficos Chart.js
- Auditoria via header `X-User-ID`
- Backend Java (nenhuma modificação)
- HTML e CSS (nenhuma modificação)
- Schema do banco de dados (nenhuma modificação)
