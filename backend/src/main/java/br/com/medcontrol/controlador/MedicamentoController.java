package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.AuditoriaServico; // <-- ADICIONADO
import br.com.medcontrol.servicos.LogBuscaServico; // <-- ADICIONADO RF6.3
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
// import java.sql.SQLException; // <-- REMOVIDO (Não usado)
import java.sql.Statement; // <-- ADICIONADO
// import java.sql.Types; // <-- REMOVIDO (Não usado)
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MedicamentoController {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * RF04.1 - Lista todos os medicamentos base (ativos e inativos)
     * MODIFICADO (Item 2): Remove "WHERE ativo = TRUE" para listar todos
     * GET /api/medicamentos
     */
    public void listarTodos(Context ctx) {
        List<Map<String, Object>> listaMedicamentos = new ArrayList<>();
        // MODIFICADO (Item 2): SQL agora busca todos, ativos e inativos
        String sql = "SELECT * FROM medicamentos ORDER BY nome_comercial";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> med = new HashMap<>();
                med.put("id_medicamento", rs.getInt("id_medicamento"));
                med.put("nome_comercial", rs.getString("nome_comercial"));
                med.put("principio_ativo", rs.getString("principio_ativo"));
                med.put("concentracao", rs.getString("concentracao"));
                med.put("apresentacao", rs.getString("apresentacao"));
                med.put("via_administracao", rs.getString("via_administracao"));
                med.put("controlado", rs.getBoolean("controlado"));
                med.put("ativo", rs.getBoolean("ativo")); // <-- Envia o status
                listaMedicamentos.add(med);
            }
            ctx.json(listaMedicamentos);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao listar medicamentos"));
        }
    }

    /**
     * RF04.2 - Cadastra um novo medicamento base
     * POST /api/medicamentos
     */
    public void cadastrar(Context ctx) {
        try {
            Map<String, Object> med = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "INSERT INTO medicamentos (nome_comercial, principio_ativo, concentracao, apresentacao, via_administracao, controlado) VALUES (?, ?, ?, ?, ?, ?)";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                ps.setString(1, (String) med.get("nome_comercial"));
                ps.setString(2, (String) med.get("principio_ativo"));
                ps.setString(3, (String) med.get("concentracao"));
                ps.setString(4, (String) med.get("apresentacao"));
                ps.setString(5, (String) med.get("via_administracao"));
                ps.setObject(6, med.get("controlado")); // Deixa o JDBC tratar Boolean
                
                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                // --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }
                // --- FIM DA MODIFICAÇÃO ---

                int novoId = -1;
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        novoId = generatedKeys.getInt(1);
                    }
                }
                AuditoriaServico.registrarAcao(adminId, "CRIAR", "medicamentos", novoId, med); // MODIFICADO
                // --- FIM DA AUDITORIA ---

                ctx.status(201).json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao cadastrar medicamento"));
        }
    }

    /**
     * RF04.3 - Atualiza um medicamento base
     * PUT /api/medicamentos/{id}
     */
    public void atualizar(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Object> med = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "UPDATE medicamentos SET nome_comercial = ?, principio_ativo = ?, concentracao = ?, apresentacao = ?, via_administracao = ?, controlado = ? WHERE id_medicamento = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setString(1, (String) med.get("nome_comercial"));
                ps.setString(2, (String) med.get("principio_ativo"));
                ps.setString(3, (String) med.get("concentracao"));
                ps.setString(4, (String) med.get("apresentacao"));
                ps.setString(5, (String) med.get("via_administracao"));
                ps.setObject(6, med.get("controlado"));
                ps.setInt(7, id);
                
                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                // --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }
                // --- FIM DA MODIFICAÇÃO ---

                AuditoriaServico.registrarAcao(adminId, "ATUALIZAR", "medicamentos", id, med); // MODIFICADO
                // --- FIM DA AUDITORIA ---

                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao atualizar medicamento"));
        }
    }

    /**
     * RF04.4 - Exclui (logicamente) um medicamento base
     * DELETE /api/medicamentos/{id}
     */
    public void excluir(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            // Adicional: verificar se o medicamento está em algum estoque antes de desativar?
            // Por enquanto, apenas desativa.
            String sql = "UPDATE medicamentos SET ativo = false WHERE id_medicamento = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                ps.executeUpdate();
                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao excluir medicamento"));
        }
    }

    /**
     * ADICIONADO (Item 2): Altera o status (ativo/inativo) de um medicamento
     * PUT /api/medicamentos/{id}/status
     * MODIFICAÇÃO 2: Adiciona transação para remover do estoque ao desativar.
     */
    public void alterarStatus(Context ctx) {
        Connection conn = null; // Declarar fora do try-with-resources
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Boolean> status = mapper.readValue(ctx.body(), new TypeReference<Map<String, Boolean>>() {});
            boolean novoStatus = status.getOrDefault("ativo", false); // Pegar o status

            conn = DB.getConnection();
            if (conn == null) {
                throw new Exception("Não foi possível conectar ao banco de dados.");
            }
            conn.setAutoCommit(false); // Iniciar transação

            // 1. Atualizar o status do medicamento
            String sqlUpdateMed = "UPDATE medicamentos SET ativo = ? WHERE id_medicamento = ?";
            try (PreparedStatement psUpdateMed = conn.prepareStatement(sqlUpdateMed)) {
                psUpdateMed.setBoolean(1, novoStatus);
                psUpdateMed.setInt(2, id);
                psUpdateMed.executeUpdate();
            }

            // MODIFICAÇÃO 2: Se estiver desativando, remover do estoque
            if (!novoStatus) {
                String sqlDeleteEstoque = "DELETE FROM estoque WHERE id_medicamento = ?";
                try (PreparedStatement psDeleteEstoque = conn.prepareStatement(sqlDeleteEstoque)) {
                    psDeleteEstoque.setInt(1, id);
                    psDeleteEstoque.executeUpdate(); 
                }
            }
            
            conn.commit(); // Efetivar transação

            // --- INÍCIO DA AUDITORIA RF08.4 ---
            // --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
            Integer adminId = null;
            try {
                adminId = Integer.parseInt(ctx.header("X-User-ID"));
            } catch (Exception e) { /* ignora */ }
            // --- FIM DA MODIFICAÇÃO ---

            // Loga APÓS o commit da transação
            String acao = novoStatus ? "ATIVAR" : "DESATIVAR";
            AuditoriaServico.registrarAcao(adminId, acao, "medicamentos", id, new HashMap<>(status)); // MODIFICADO
            if (!novoStatus) {
                // Loga a exclusão em massa do estoque associado
                AuditoriaServico.registrarAcao(adminId, "EXCLUIR_EM_MASSA", "estoque", id, Map.of("id_medicamento_desativado", id)); // MODIFICADO
            }
            // --- FIM DA AUDITORIA ---
            
            ctx.json(Map.of("sucesso", true));

        } catch (Exception e) {
            if (conn != null) {
                try {
                    conn.rollback(); // Desfazer em caso de erro
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
            e.printStackTrace(); // Imprimir o erro original
            ctx.status(500).json(Map.of("sucesso", false, "message", "Erro ao alterar status do medicamento."));
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true); // Restaurar auto-commit
                    conn.close(); // Fechar conexão
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    /**
     * ADICIONADO RF6.3 - Realiza a busca de medicamentos no estoque e registra o log.
     * GET /api/medicamentos/search
     */
    public void buscarMedicamento(Context ctx) {
        String termo = ctx.queryParam("nome");
        List<Map<String, Object>> resultados = new ArrayList<>();
        Integer idMedicamentoEncontrado = null; // Para o log
        
        if (termo == null || termo.trim().isEmpty()) {
            ctx.status(400).json(new ArrayList<>());
            return;
        }

        String termoBusca = "%" + termo.trim().toLowerCase() + "%";

        String sql = "SELECT e.id_estoque, e.quantidade, u.nome, u.endereco, m.id_medicamento " +
                     "FROM estoque e " +
                     "JOIN medicamentos m ON e.id_medicamento = m.id_medicamento " +
                     "JOIN ubs u ON e.id_ubs = u.id_ubs " +
                     "WHERE (LOWER(m.nome_comercial) LIKE ? OR LOWER(m.principio_ativo) LIKE ?) " +
                     "AND e.quantidade > 0 AND m.ativo = TRUE AND u.ativo = TRUE " +
                     "ORDER BY u.nome, e.quantidade DESC";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, termoBusca);
            ps.setString(2, termoBusca);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    if (idMedicamentoEncontrado == null) {
                        idMedicamentoEncontrado = rs.getInt("id_medicamento");
                    }
                    resultados.add(Map.of(
                        "id_estoque", rs.getInt("id_estoque"),
                        "quantidade", rs.getInt("quantidade"),
                        "nome", rs.getString("nome"), // Nome da UBS
                        "endereco", rs.getString("endereco")
                    ));
                }
            }
            
            ctx.json(resultados);

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao realizar busca de medicamento."));
        }

        // --- RF6.3: Registrar Log de Busca ---
        try {
            boolean teveResultados = !resultados.isEmpty();
            Integer idUsuario = (ctx.header("X-User-ID") != null) ? Integer.parseInt(ctx.header("X-User-ID")) : null;
            
            LogBuscaServico.registrar(termo, teveResultados, idUsuario, idMedicamentoEncontrado);

        } catch (Exception e) {
            System.err.println("--- FALHA NO LOG DE BUSCA (RF6.3) ---");
            e.printStackTrace();
            // A falha no log não deve interromper a busca do usuário.
        }
    }
}