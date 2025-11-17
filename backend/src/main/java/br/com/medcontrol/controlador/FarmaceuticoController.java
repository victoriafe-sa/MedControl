package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.AuditoriaServico;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador para RF05.1 a RF05.4 - Gerenciamento de Farmacêuticos
 */
public class FarmaceuticoController {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * RF05.1 - Lista todos os farmacêuticos ativos
     * GET /api/farmaceuticos
     */
    public void listar(Context ctx) {
        List<Map<String, Object>> listaFarmaceuticos = new ArrayList<>();
        String sql = "SELECT * FROM farmaceuticos WHERE ativo = TRUE ORDER BY nome";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> farmaceutico = new HashMap<>();
                farmaceutico.put("id_farmaceutico", rs.getInt("id_farmaceutico"));
                farmaceutico.put("nome", rs.getString("nome"));
                farmaceutico.put("crf", rs.getString("crf"));
                farmaceutico.put("especialidade", rs.getString("especialidade"));
                farmaceutico.put("ativo", rs.getBoolean("ativo"));
                listaFarmaceuticos.add(farmaceutico);
            }
            ctx.json(listaFarmaceuticos);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao listar farmacêuticos"));
        }
    }

    /**
     * RF05.2 - Cadastra um novo farmacêutico
     * POST /api/farmaceuticos
     */
    public void cadastrar(Context ctx) {
        try {
            Map<String, Object> farmaceutico = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "INSERT INTO farmaceuticos (nome, crf, especialidade) VALUES (?, ?, ?)";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                ps.setString(1, (String) farmaceutico.get("nome"));
                ps.setString(2, (String) farmaceutico.get("crf"));
                ps.setString(3, (String) farmaceutico.get("especialidade"));
                
                ps.executeUpdate();

                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }

                int novoId = -1;
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        novoId = generatedKeys.getInt(1);
                    }
                }
                AuditoriaServico.registrarAcao(adminId, "CRIAR", "farmaceuticos", novoId, farmaceutico);

                ctx.status(201).json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao cadastrar farmacêutico"));
        }
    }

    /**
     * RF05.3 - Atualiza um farmacêutico existente
     * PUT /api/farmaceuticos/{id}
     */
    public void atualizar(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Object> farmaceutico = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "UPDATE farmaceuticos SET nome = ?, crf = ?, especialidade = ? WHERE id_farmaceutico = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setString(1, (String) farmaceutico.get("nome"));
                ps.setString(2, (String) farmaceutico.get("crf"));
                ps.setString(3, (String) farmaceutico.get("especialidade"));
                ps.setInt(4, id);

                ps.executeUpdate();

                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }

                AuditoriaServico.registrarAcao(adminId, "ATUALIZAR", "farmaceuticos", id, farmaceutico);

                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao atualizar farmacêutico"));
        }
    }

    /**
     * RF05.4 - Exclui (logicamente) um farmacêutico
     * DELETE /api/farmaceuticos/{id}
     */
    public void excluir(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            String sql = "UPDATE farmaceuticos SET ativo = false WHERE id_farmaceutico = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                ps.executeUpdate();

                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }

                AuditoriaServico.registrarAcao(adminId, "DESATIVAR", "farmaceuticos", id, null);
                
                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao desativar farmacêutico"));
        }
    }
}