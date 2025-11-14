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

public class UBSController {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * RF03.1 - Lista todas as UBS ativas
     * GET /api/ubs
     */
    public void listarTodas(Context ctx) {
        List<Map<String, Object>> listaUbs = new ArrayList<>();
        String sql = "SELECT * FROM ubs WHERE ativo = TRUE ORDER BY nome";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> ubs = new HashMap<>();
                ubs.put("id_ubs", rs.getInt("id_ubs"));
                ubs.put("nome", rs.getString("nome"));
                ubs.put("endereco", rs.getString("endereco"));
                ubs.put("telefone", rs.getString("telefone"));
                ubs.put("horario_funcionamento", rs.getString("horario_funcionamento"));
                ubs.put("cep", rs.getString("cep")); // ADICIONADO
                ubs.put("latitude", rs.getBigDecimal("latitude"));
                ubs.put("longitude", rs.getBigDecimal("longitude"));
                ubs.put("ativo", rs.getBoolean("ativo"));
                listaUbs.add(ubs);
            }
            ctx.json(listaUbs);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao listar UBS"));
        }
    }

    /**
     * RF03 - Busca uma UBS específica por ID
     * GET /api/ubs/{id}
     */
    public void buscarPorId(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            String sql = "SELECT * FROM ubs WHERE id_ubs = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        Map<String, Object> ubs = new HashMap<>();
                        ubs.put("id_ubs", rs.getInt("id_ubs"));
                        ubs.put("nome", rs.getString("nome"));
                        ubs.put("endereco", rs.getString("endereco"));
                        ubs.put("telefone", rs.getString("telefone"));
                        ubs.put("horario_funcionamento", rs.getString("horario_funcionamento"));
                        ubs.put("cep", rs.getString("cep")); // ADICIONADO
                        ubs.put("latitude", rs.getBigDecimal("latitude"));
                        ubs.put("longitude", rs.getBigDecimal("longitude"));
                        ubs.put("ativo", rs.getBoolean("ativo"));
                        ctx.json(ubs);
                    } else {
                        ctx.status(404).json(Map.of("erro", "UBS não encontrada"));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao buscar UBS"));
        }
    }

    /**
     * RF03.2 - Cadastra uma nova UBS
     * POST /api/ubs
     */
    public void cadastrar(Context ctx) {
        try {
            Map<String, Object> ubs = mapper.readValue(ctx.body(), new TypeReference<>() {});
            // MODIFICADO: Adiciona CEP
            String sql = "INSERT INTO ubs (nome, endereco, telefone, horario_funcionamento, cep, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                ps.setString(1, (String) ubs.get("nome"));
                ps.setString(2, (String) ubs.get("endereco"));
                ps.setString(3, (String) ubs.get("telefone"));
                ps.setString(4, (String) ubs.get("horario_funcionamento"));
                ps.setString(5, (String) ubs.get("cep")); // ADICIONADO
                ps.setObject(6, ubs.get("latitude"));
                ps.setObject(7, ubs.get("longitude"));
                
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
                AuditoriaServico.registrarAcao(adminId, "CRIAR", "ubs", novoId, ubs); // MODIFICADO
                // --- FIM DA AUDITORIA ---    

                ctx.status(201).json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao cadastrar UBS"));
        }
    }

    /**
     * RF03.3 - Atualiza uma UBS existente
     * PUT /api/ubs/{id}
     */
    public void atualizar(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Object> ubs = mapper.readValue(ctx.body(), new TypeReference<>() {});
            // MODIFICADO: Adiciona CEP
            String sql = "UPDATE ubs SET nome = ?, endereco = ?, telefone = ?, horario_funcionamento = ?, cep = ?, latitude = ?, longitude = ? WHERE id_ubs = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setString(1, (String) ubs.get("nome"));
                ps.setString(2, (String) ubs.get("endereco"));
                ps.setString(3, (String) ubs.get("telefone"));
                ps.setString(4, (String) ubs.get("horario_funcionamento"));
                ps.setString(5, (String) ubs.get("cep")); // ADICIONADO
                ps.setObject(6, ubs.get("latitude"));
                ps.setObject(7, ubs.get("longitude"));
                ps.setInt(8, id);

                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                // --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }
                // --- FIM DA MODIFICAÇÃO ---

                AuditoriaServico.registrarAcao(adminId, "ATUALIZAR", "ubs", id, ubs); // MODIFICADO
                // --- FIM DA AUDITORIA ---

                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao atualizar UBS"));
        }
    }

    /**
     * RF03.4 - Exclui (logicamente) uma UBS
     * DELETE /api/ubs/{id}
     */
    public void excluir(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            String sql = "UPDATE ubs SET ativo = false WHERE id_ubs = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                ps.executeUpdate();

                // --- INÍCIO DA AUDITORIA RF08.4 ---
                // --- INÍCIO DA MODIFICAÇÃO (AUDITORIA) ---
                Integer adminId = null;
                try {
                    adminId = Integer.parseInt(ctx.header("X-User-ID"));
                } catch (Exception e) { /* ignora */ }
                // --- FIM DA MODIFICAÇÃO ---

                AuditoriaServico.registrarAcao(adminId, "DESATIVAR", "ubs", id, null); // MODIFICADO
                // --- FIM DA AUDITORIA ---
                
                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao excluir UBS"));
        }
    }
}