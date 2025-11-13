package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.AuditoriaServico; // <-- ADICIONADO
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement; // <-- ADICIONADO
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
                int novoId = -1;
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        novoId = generatedKeys.getInt(1);
                    }
                }
                AuditoriaServico.registrarAcao(null, "CRIAR", "medicamentos", novoId, med);
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
                AuditoriaServico.registrarAcao(null, "ATUALIZAR", "medicamentos", id, med);
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
            // Loga APÓS o commit da transação
            String acao = novoStatus ? "ATIVAR" : "DESATIVAR";
            AuditoriaServico.registrarAcao(null, acao, "medicamentos", id, new HashMap<>(status));
            if (!novoStatus) {
                // Loga a exclusão em massa do estoque associado
                AuditoriaServico.registrarAcao(null, "EXCLUIR_EM_MASSA", "estoque", id, Map.of("id_medicamento_desativado", id));
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
}