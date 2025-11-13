package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.AuditoriaServico; // <-- ADICIONADO
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLIntegrityConstraintViolationException; // MODIFICAÇÃO 1: Importado
import java.sql.Statement; // <-- ADICIONADO
import java.sql.Types; // MODIFICAÇÃO 1: Importado
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EstoqueController {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * RF04.1 / RF09.1 - Lista todos os itens de estoque com nomes
     * GET /api/estoque
     */
    public void listarEstoque(Context ctx) {
        List<Map<String, Object>> listaEstoque = new ArrayList<>();
        String sql = "SELECT e.id_estoque, e.quantidade, e.lote, e.data_validade, e.ultima_atualizacao, " +
                     "m.id_medicamento, m.nome_comercial, m.principio_ativo, " +
                     "u.id_ubs, u.nome AS nome_ubs " +
                     "FROM estoque e " +
                     "JOIN medicamentos m ON e.id_medicamento = m.id_medicamento " +
                     "JOIN ubs u ON e.id_ubs = u.id_ubs " +
                     "WHERE m.ativo = TRUE AND u.ativo = TRUE " +
                     "ORDER BY m.nome_comercial, u.nome";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> item = new HashMap<>();
                item.put("id_estoque", rs.getInt("id_estoque"));
                item.put("id_medicamento", rs.getInt("id_medicamento"));
                item.put("id_ubs", rs.getInt("id_ubs"));
                item.put("nome_comercial", rs.getString("nome_comercial"));
                item.put("principio_ativo", rs.getString("principio_ativo"));
                item.put("nome_ubs", rs.getString("nome_ubs"));
                item.put("quantidade", rs.getInt("quantidade"));
                item.put("lote", rs.getString("lote"));
                item.put("data_validade", rs.getDate("data_validade"));
                item.put("ultima_atualizacao", rs.getTimestamp("ultima_atualizacao"));
                listaEstoque.add(item);
            }
            ctx.json(listaEstoque);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao listar estoque"));
        }
    }

    /**
     * MODIFICAÇÃO 1: Novo endpoint para verificar duplicidade de lote
     * POST /api/estoque/verificar-lote
     */
    public void verificarLote(Context ctx) {
        try {
            Map<String, Object> req = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String id_ubs = String.valueOf(req.get("id_ubs"));
            String id_medicamento = String.valueOf(req.get("id_medicamento"));
            String lote = (String) req.get("lote");
            // id_estoque_excluir pode ser null (novo) ou um ID (edição)
            Object idEstoqueObj = req.get("id_estoque_excluir");
            Integer id_estoque_excluir = (idEstoqueObj != null && !idEstoqueObj.toString().isEmpty()) ? Integer.parseInt(idEstoqueObj.toString()) : null;

            // Verifica se o lote existe para a MESMA ubs e MESMO medicamento, IGNORANDO o id do item atual (se estiver editando)
            String sql = "SELECT EXISTS (SELECT 1 FROM estoque WHERE id_ubs = ? AND id_medicamento = ? AND lote = ? AND (? IS NULL OR id_estoque != ?))";
            
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setInt(1, Integer.parseInt(id_ubs));
                ps.setInt(2, Integer.parseInt(id_medicamento));
                ps.setString(3, lote);
                
                if (id_estoque_excluir != null) {
                    ps.setInt(4, id_estoque_excluir);
                    ps.setInt(5, id_estoque_excluir);
                } else {
                    ps.setNull(4, Types.INTEGER);
                    ps.setNull(5, Types.INTEGER);
                }

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next() && rs.getBoolean(1)) {
                        ctx.json(Map.of("existe", true)); // Lote já existe
                    } else {
                        ctx.json(Map.of("existe", false)); // Lote disponível
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao verificar lote"));
        }
    }


    /**
     * RF04.2 - Cadastra um novo item de estoque
     * POST /api/estoque
     */
    public void cadastrarEstoque(Context ctx) {
        try {
            Map<String, Object> item = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "INSERT INTO estoque (id_ubs, id_medicamento, quantidade, lote, data_validade) VALUES (?, ?, ?, ?, ?)";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                ps.setInt(1, Integer.parseInt(String.valueOf(item.get("id_ubs"))));
                ps.setInt(2, Integer.parseInt(String.valueOf(item.get("id_medicamento"))));
                ps.setInt(3, Integer.parseInt(String.valueOf(item.get("quantidade"))));
                ps.setString(4, (String) item.get("lote"));
                ps.setDate(5, Date.valueOf((String) item.get("data_validade")));
                
                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                int novoId = -1;
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        novoId = generatedKeys.getInt(1);
                    }
                }
                AuditoriaServico.registrarAcao(null, "CRIAR", "estoque", novoId, item);
                // --- FIM DA AUDITORIA ---

                ctx.status(201).json(Map.of("sucesso", true));
            }
        // MODIFICAÇÃO 1: Captura específica para violação de constraint
        } catch (SQLIntegrityConstraintViolationException e) {
            if (e.getMessage().contains("uk_medicamento_ubs_lote")) {
                ctx.status(409).json(Map.of("erro", "Este lote já está cadastrado para este medicamento nesta UBS."));
            } else {
                e.printStackTrace();
                ctx.status(500).json(Map.of("erro", "Erro de integridade ao cadastrar estoque."));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao cadastrar estoque"));
        }
    }

    /**
     * RF04.3 - Atualiza um item de estoque
     * PUT /api/estoque/{id}
     */
    public void atualizarEstoque(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Object> item = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "UPDATE estoque SET id_ubs = ?, id_medicamento = ?, quantidade = ?, lote = ?, data_validade = ? WHERE id_estoque = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setInt(1, Integer.parseInt(String.valueOf(item.get("id_ubs"))));
                ps.setInt(2, Integer.parseInt(String.valueOf(item.get("id_medicamento"))));
                ps.setInt(3, Integer.parseInt(String.valueOf(item.get("quantidade"))));
                ps.setString(4, (String) item.get("lote"));
                ps.setDate(5, Date.valueOf((String) item.get("data_validade")));
                ps.setInt(6, id);
                
                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                AuditoriaServico.registrarAcao(null, "ATUALIZAR", "estoque", id, item);
                // --- FIM DA AUDITORIA ---

                ctx.json(Map.of("sucesso", true));
            }
        // MODIFICAÇÃO 1: Captura específica para violação de constraint
        } catch (SQLIntegrityConstraintViolationException e) {
            if (e.getMessage().contains("uk_medicamento_ubs_lote")) {
                ctx.status(409).json(Map.of("erro", "Este lote já está cadastrado para este medicamento nesta UBS."));
            } else {
                e.printStackTrace();
                ctx.status(500).json(Map.of("erro", "Erro de integridade ao atualizar estoque."));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao atualizar estoque"));
        }
    }

    /**
     * RF04.4 - Exclui (fisicamente) um item de estoque
     * DELETE /api/estoque/{id}
     */
    public void excluirEstoque(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            String sql = "DELETE FROM estoque WHERE id_estoque = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                AuditoriaServico.registrarAcao(null, "EXCLUIR", "estoque", id, null);
                // --- FIM DA AUDITORIA ---
                
                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao excluir estoque"));
        }
    }
}