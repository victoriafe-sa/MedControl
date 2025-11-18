package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp; 
import java.sql.Types;     
import java.time.LocalDateTime; 
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.sql.SQLException; // Importação que faltava
// ADICIONADO: Import necessário para obter o ID da reserva (comprovante)
import java.sql.Statement; 

/**
 * Controlador para o Requisito RF07 - Reserva e Agendamento
 */
public class ReservaController {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * RF07.1 - Criar Reserva
     * Cria uma nova reserva após validar a disponibilidade (Estoque Físico - Reservas Ativas).
     * Retorna um objeto JSON com os dados da reserva (comprovante digital).
     */
    public void criarReserva(Context ctx) {
        Connection conn = null;
        try {
            // Mapeia os dados da requisição
            Map<String, Object> req = mapper.readValue(ctx.body(), new TypeReference<>() {});
            Integer idUsuario = Integer.parseInt(ctx.header("X-User-ID")); 
            
            Integer idMedicamento = Integer.parseInt(String.valueOf(req.get("id_medicamento"))); 
            Integer idUbs = Integer.parseInt(String.valueOf(req.get("id_ubs")));             
            Integer quantidadePedida = Integer.parseInt(String.valueOf(req.get("quantidadeReservada"))); 
            
            LocalDateTime dataHoraReserva = LocalDateTime.parse((String) req.get("dataHoraReserva"));

            conn = DB.getConnection();
            if (conn == null) throw new SQLException("Não foi possível conectar ao banco de dados.");
            
            // Inicia a transação
            conn.setAutoCommit(false); 

            // 1. CALCULAR DISPONIBILIDADE REAL (LÓGICA DA "Opção B")
            // Esta lógica é a mesma usada pelo MedicamentoController e garante que
            // o estoque físico (estoque.quantidade) não seja tocado.
            
            // 1a. Busca o estoque FÍSICO total
            long totalFisico = 0;
            String sqlEstoque = "SELECT COALESCE(SUM(quantidade), 0) FROM estoque " +
                                "WHERE id_medicamento = ? AND id_ubs = ? AND quantidade > 0 AND data_validade > CURDATE()";
            try (PreparedStatement ps = conn.prepareStatement(sqlEstoque)) {
                ps.setInt(1, idMedicamento);
                ps.setInt(2, idUbs);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) totalFisico = rs.getLong(1);
                }
            }

            // 1b. Busca o total já RESERVADO (ATIVO)
            long totalReservado = 0;
            String sqlReservas = "SELECT COALESCE(SUM(quantidade_reservada), 0) FROM reservas " +
                                 "WHERE id_medicamento = ? AND id_ubs = ? AND status = 'ATIVA'";
            try (PreparedStatement ps = conn.prepareStatement(sqlReservas)) {
                ps.setInt(1, idMedicamento);
                ps.setInt(2, idUbs);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) totalReservado = rs.getLong(1);
                }
            }

            // 1c. Calcula a disponibilidade real
            long disponibilidadeReal = totalFisico - totalReservado;

            // 2. VALIDAR
            if (quantidadePedida > disponibilidadeReal) {
                conn.rollback();
                ctx.status(400).json(Map.of("message", "Quantidade indisponível. Disponível: " + disponibilidadeReal)); 
                return;
            }

            // 3. INSERIR A RESERVA
            String sqlInsert = "INSERT INTO reservas (id_usuario, id_medicamento, id_ubs, quantidade_reservada, data_hora_reserva, status) " +
                               "VALUES (?, ?, ?, ?, ?, 'ATIVA')";

            // --- INÍCIO DA MODIFICAÇÃO (Comprovante Digital RF07.1) ---
            int idReservaGerada = -1;
            Map<String, Object> reservaCriada = new HashMap<>();

            // Prepara o statement para retornar o ID gerado (Statement.RETURN_GENERATED_KEYS)
            try (PreparedStatement ps = conn.prepareStatement(sqlInsert, Statement.RETURN_GENERATED_KEYS)) {
                ps.setInt(1, idUsuario);
                ps.setInt(2, idMedicamento);
                ps.setInt(3, idUbs);
                ps.setInt(4, quantidadePedida);
                ps.setTimestamp(5, Timestamp.valueOf(dataHoraReserva));
                ps.executeUpdate();

                // Obtém o ID gerado (nosso "código de confirmação")
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        idReservaGerada = rs.getInt(1);
                    } else {
                        throw new SQLException("Falha ao obter o ID da reserva gerada.");
                    }
                }
            }
            // --- FIM DA MODIFICAÇÃO ---

            conn.commit(); // Confirma a transação

            // --- INÍCIO DA MODIFICAÇÃO (Comprovante Digital RF07.1) ---
            // Monta o objeto de retorno (o comprovante) para o frontend
            reservaCriada.put("id_reserva", idReservaGerada);
            reservaCriada.put("id_usuario", idUsuario);
            reservaCriada.put("id_medicamento", idMedicamento);
            reservaCriada.put("id_ubs", idUbs);
            reservaCriada.put("quantidade_reservada", quantidadePedida);
            reservaCriada.put("data_hora_reserva", dataHoraReserva.toString()); // Envia como ISO string
            reservaCriada.put("status", "ATIVA");

            // Retorna o objeto da reserva criada
            ctx.status(201).json(Map.of("sucesso", true, "reserva", reservaCriada));
            // --- FIM DA MODIFICAÇÃO ---

        } catch (Exception e) {
            if (conn != null) try { conn.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            e.printStackTrace();
            ctx.status(500).json(Map.of("message", "Erro ao criar reserva: " + e.getMessage()));
        } finally {
            if (conn != null) try { conn.setAutoCommit(true); conn.close(); } catch (SQLException e) { e.printStackTrace(); }
        }
    }

    /**
     * RF07.3 - Cancelar Reserva
     * Atualiza o status de uma reserva 'ATIVA' para 'CANCELADA'.
     */
    public void cancelarReserva(Context ctx) {
        try {
            Integer idReserva = Integer.parseInt(ctx.pathParam("id"));
            Integer idUsuario = Integer.parseInt(ctx.header("X-User-ID"));

            String sql = "UPDATE reservas SET status = 'CANCELADA' " +
                         "WHERE id_reserva = ? AND id_usuario = ? AND status = 'ATIVA'";
            
            try (Connection conn = DB.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, idReserva);
                ps.setInt(2, idUsuario);
                
                int rowsAffected = ps.executeUpdate();
                
                if (rowsAffected > 0) {
                    ctx.status(200).json(Map.of("sucesso", true, "message", "Reserva cancelada."));
                } else {
                    ctx.status(404).json(Map.of("erro", "Reserva não encontrada ou já não estava ativa."));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao cancelar reserva: " + e.getMessage()));
        }
    }

    /**
     * RF07.2 - Consultar Reservas do Usuário
     * Retorna uma lista de reservas (ativas e histórico) do usuário logado.
     */
    public void consultarReservas(Context ctx) {
        List<Map<String, Object>> reservas = new ArrayList<>();
        Integer idUsuario = Integer.parseInt(ctx.header("X-User-ID"));
        
        String sql = "SELECT r.*, m.nome_comercial, u.nome as nome_ubs " +
                     "FROM reservas r " +
                     "JOIN medicamentos m ON r.id_medicamento = m.id_medicamento " +
                     "JOIN ubs u ON r.id_ubs = u.id_ubs " +
                     "WHERE r.id_usuario = ? " +
                     "ORDER BY r.data_hora_reserva DESC";

        try (Connection conn = DB.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idUsuario);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("id_reserva", rs.getInt("id_reserva"));
                    r.put("nome_comercial", rs.getString("nome_comercial"));
                    r.put("nome_ubs", rs.getString("nome_ubs"));
                    r.put("quantidade_reservada", rs.getInt("quantidade_reservada"));
                    
                    // Converte o LocalDateTime para uma String ISO (ex: "2025-11-18T13:30:00")
                    r.put("data_hora_reserva", rs.getTimestamp("data_hora_reserva").toLocalDateTime().toString());
                    
                    r.put("status", rs.getString("status"));
                    reservas.add(r);
                }
            }
            ctx.json(reservas);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao buscar reservas: " + e.getMessage()));
        }
    }
    
    /**
     * RF07.4 - Reagendar Reserva
     * Atualiza a data/hora de uma reserva 'ATIVA'.
     */
    public void reagendarReserva(Context ctx) {
        try {
            Integer idReserva = Integer.parseInt(ctx.pathParam("id"));
            Integer idUsuario = Integer.parseInt(ctx.header("X-User-ID"));
            Map<String, String> req = mapper.readValue(ctx.body(), new TypeReference<>() {});
            LocalDateTime novaDataHora = LocalDateTime.parse(req.get("novaDataHora"));

            String sql = "UPDATE reservas SET data_hora_reserva = ? " +
                         "WHERE id_reserva = ? AND id_usuario = ? AND status = 'ATIVA'";
            
            try (Connection conn = DB.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setTimestamp(1, Timestamp.valueOf(novaDataHora));
                ps.setInt(2, idReserva);
                ps.setInt(3, idUsuario);
                
                int rowsAffected = ps.executeUpdate();
                
                if (rowsAffected > 0) {
                    ctx.status(200).json(Map.of("sucesso", true, "message", "Reserva reagendada."));
                } else {
                    ctx.status(404).json(Map.of("erro", "Reserva não encontrada ou não está ativa."));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao reagendar: " + e.getMessage()));
        }
    }
}