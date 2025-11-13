package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import io.javalin.http.Context;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RF08.4 - Controlador para buscar logs de auditoria.
 */
public class AuditoriaController {

    public void listarLogs(Context ctx) {
        List<Map<String, Object>> logs = new ArrayList<>();
        
        // Junta com a tabela de usuários para obter o nome, se disponível
        String sql = "SELECT a.*, IFNULL(u.nome, 'Sistema/Não Identificado') as nome_usuario " +
                     "FROM auditoria a " +
                     "LEFT JOIN usuarios u ON a.id_usuario = u.id " +
                     "ORDER BY a.data_log DESC LIMIT 200"; // Limita a 200 logs

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> log = new HashMap<>();
                log.put("id_auditoria", rs.getInt("id_auditoria"));
                log.put("id_usuario", rs.getObject("id_usuario")); // Pode ser nulo
                log.put("nome_usuario", rs.getString("nome_usuario"));
                log.put("acao", rs.getString("acao"));
                log.put("tabela_afetada", rs.getString("tabela_afetada"));
                log.put("registro_id", rs.getInt("registro_id"));
                log.put("detalhes", rs.getString("detalhes"));
                log.put("data_log", rs.getTimestamp("data_log"));
                logs.add(log);
            }
            ctx.json(logs);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao buscar logs de auditoria"));
        }
    }
}