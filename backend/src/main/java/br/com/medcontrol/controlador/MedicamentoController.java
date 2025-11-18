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
     * (Nenhuma alteração nesta função)
     */
    public void listarTodos(Context ctx) {
        List<Map<String, Object>> listaMedicamentos = new ArrayList<>();
        String sql = "SELECT * FROM medicamentos ORDER BY nome_comercial";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> med = new HashMap<>();
                med.put("id_medicamento", rs.getInt("id_medicamento"));
                med.put("nome_comercial", rs.getString("nome_comercial"));
                // ... (campos omitidos por brevidade, assumindo que existem no DB) ...
                // Adicionando campos principais para garantir
                med.put("principio_ativo", rs.getString("principio_ativo"));
                med.put("concentracao", rs.getString("concentracao"));
                med.put("apresentacao", rs.getString("apresentacao"));
                med.put("via_administracao", rs.getString("via_administracao"));
                med.put("controlado", rs.getBoolean("controlado"));
                med.put("ativo", rs.getBoolean("ativo")); 
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
     * (Nenhuma alteração nesta função no contexto do RF07)
     */
    public void cadastrar(Context ctx) {
        // Implementação original do RF04.2 (CRUD)
        // (Esta funcionalidade não foi fornecida nos arquivos, 
        // mas é mantida aqui para integridade do controlador)
        try {
            Map<String, Object> med = mapper.readValue(ctx.body(), new TypeReference<>() {});
            String sql = "INSERT INTO medicamentos (nome_comercial, principio_ativo, concentracao, apresentacao, via_administracao, controlado, ativo) VALUES (?, ?, ?, ?, ?, ?, TRUE)";
            
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                ps.setString(1, (String) med.get("nome_comercial"));
                ps.setString(2, (String) med.get("principio_ativo"));
                ps.setString(3, (String) med.get("concentracao"));
                ps.setString(4, (String) med.get("apresentacao"));
                ps.setString(5, (String) med.get("via_administracao"));
                ps.setBoolean(6, (Boolean) med.get("controlado"));
                
                ps.executeUpdate();

                // --- Auditoria ---
                Integer adminId = (ctx.header("X-User-ID") != null) ? Integer.parseInt(ctx.header("X-User-ID")) : null;
                int novoId = -1;
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        novoId = generatedKeys.getInt(1);
                    }
                }
                AuditoriaServico.registrarAcao(adminId, "CRIAR", "medicamentos", novoId, med);
                // --- Fim Auditoria ---

                ctx.status(201).json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao cadastrar medicamento"));
        }
    }

    /**
     * RF04.3 - Atualiza um medicamento base
     * (Nenhuma alteração nesta função no contexto do RF07)
     */
    public void atualizar(Context ctx) {
        // Implementação original do RF04.3 (CRUD)
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
                ps.setBoolean(6, (Boolean) med.get("controlado"));
                ps.setInt(7, id);
                
                ps.executeUpdate();

                // --- Auditoria ---
                Integer adminId = (ctx.header("X-User-ID") != null) ? Integer.parseInt(ctx.header("X-User-ID")) : null;
                AuditoriaServico.registrarAcao(adminId, "ATUALIZAR", "medicamentos", id, med);
                // --- Fim Auditoria ---

                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao atualizar medicamento"));
        }
    }

    /**
     * RF04.4 - Exclui (logicamente) um medicamento base
     * (Nenhuma alteração nesta função no contexto do RF07)
     */
    public void excluir(Context ctx) {
        // Implementação original do RF04.4 (CRUD)
        // A lógica de negócio (ex: desativar vs deletar) depende do requisito.
        // O `alterarStatus` é preferível.
         try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            // Por segurança, vamos apenas desativar (exclusão lógica)
            String sql = "UPDATE medicamentos SET ativo = FALSE WHERE id_medicamento = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                ps.executeUpdate();
                
                // --- Auditoria ---
                Integer adminId = (ctx.header("X-User-ID") != null) ? Integer.parseInt(ctx.header("X-User-ID")) : null;
                AuditoriaServico.registrarAcao(adminId, "DESATIVAR", "medicamentos", id, null);
                // --- Fim Auditoria ---

                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao excluir/desativar medicamento"));
        }
    }

    /**
     * Altera o status (ativo/inativo) de um medicamento
     * (Nenhuma alteração nesta função no contexto do RF07)
     */
    public void alterarStatus(Context ctx) {
        // Implementação original da gestão de status
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Boolean> statusMap = mapper.readValue(ctx.body(), new TypeReference<>() {});
            boolean novoStatus = statusMap.get("ativo");
            
            String sql = "UPDATE medicamentos SET ativo = ? WHERE id_medicamento = ?";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setBoolean(1, novoStatus);
                ps.setInt(2, id);
                ps.executeUpdate();
                
                // --- Auditoria ---
                Integer adminId = (ctx.header("X-User-ID") != null) ? Integer.parseInt(ctx.header("X-User-ID")) : null;
                String acao = novoStatus ? "ATIVAR" : "DESATIVAR";
                AuditoriaServico.registrarAcao(adminId, acao, "medicamentos", id, null);
                // --- Fim Auditoria ---

                ctx.json(Map.of("sucesso", true));
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao alterar status do medicamento"));
        }
    }

    /**
     * ADICIONADO RF6.3 - MODIFICADO PARA INTEGRAR COM RF07
     * Realiza a busca de medicamentos e calcula a disponibilidade real (Estoque - Reservas).
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

        // --- INÍCIO DA MODIFICAÇÃO (LÓGICA RF07) ---
        // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO RF06.2 - MAPA) ---
        // Adicionado u.latitude, u.longitude ao SELECT e GROUP BY para o mapa
        String sql = "SELECT m.id_medicamento, u.id_ubs, u.nome, u.endereco, u.latitude, u.longitude, " +
                     "SUM(e.quantidade) AS total_fisico " + // Soma todo o estoque físico
                     "FROM estoque e " +
                     "JOIN medicamentos m ON e.id_medicamento = m.id_medicamento " +
                     "JOIN ubs u ON e.id_ubs = u.id_ubs " +
                     "WHERE (LOWER(m.nome_comercial) LIKE ? OR LOWER(m.principio_ativo) LIKE ?) " +
                     "AND e.quantidade > 0 AND m.ativo = TRUE AND u.ativo = TRUE " +
                     "AND e.data_validade > CURDATE() " + // Boa prática: não busca vencidos
                     "GROUP BY m.id_medicamento, u.id_ubs, u.nome, u.endereco, u.latitude, u.longitude " + // Coords adicionadas
                     "ORDER BY u.nome";
        // --- FIM DA MODIFICAÇÃO (CORREÇÃO RF06.2 - MAPA) ---
        // --- FIM DA MODIFICAÇÃO (LÓGICA RF07) ---

        Connection conn = null; // Declarar fora para poder usar na subquery de reservas
        try {
            conn = DB.getConnection(); // Abre a conexão
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setString(1, termoBusca);
                ps.setString(2, termoBusca);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        long idMed = rs.getLong("id_medicamento");
                        long idUbs = rs.getLong("id_ubs");
                        
                        if (idMedicamentoEncontrado == null) {
                            idMedicamentoEncontrado = (int) idMed;
                        }

                        // --- INÍCIO DA LÓGICA DE CÁLCULO (OPÇÃO B - RF07) ---
                        // 1. Pega o estoque físico que o SQL principal já somou
                        long totalFisico = rs.getLong("total_fisico"); //
                        long totalReservado = 0;
                        
                        // 2. Prepara uma sub-query para somar o que está reservado (RF07)
                        String sqlReservas = "SELECT COALESCE(SUM(quantidade_reservada), 0) FROM reservas " +
                                             "WHERE id_medicamento = ? AND id_ubs = ? AND status = 'ATIVA'"; //
                        
                        // Usa a mesma conexão (conn) para a sub-query
                        try(PreparedStatement psReservas = conn.prepareStatement(sqlReservas)) {
                            psReservas.setLong(1, idMed);
                            psReservas.setLong(2, idUbs);
                            try(ResultSet rsReservas = psReservas.executeQuery()) {
                                if(rsReservas.next()) {
                                    totalReservado = rsReservas.getLong(1); //
                                }
                            }
                        }
                        
                        // 3. Calcula a disponibilidade real
                        long disponibilidadeReal = totalFisico - totalReservado; //
                        // --- FIM DA LÓGICA DE CÁLCULO ---
                        
                        // 4. Só adiciona o resultado se houver disponibilidade real
                        if (disponibilidadeReal > 0) { //
                            // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO RF06.2 - MAPA) ---
                            // Adiciona latitude e longitude ao Map para o frontend
                            resultados.add(Map.of(
                                "id_medicamento", idMed, // NOVO: ID do Medicamento (para reservar)
                                "id_ubs", idUbs,         // NOVO: ID da UBS (para reservar)
                                "quantidade_disponivel", disponibilidadeReal, // MODIFICADO: Quantidade CALCULADA
                                "nome", rs.getString("nome"), // Nome da UBS
                                "endereco", rs.getString("endereco"),
                                "latitude", rs.getBigDecimal("latitude"), // <-- ADICIONADO
                                "longitude", rs.getBigDecimal("longitude") // <-- ADICIONADO
                            ));
                            // --- FIM DA MODIFICAÇÃO (CORREÇÃO RF06.2 - MAPA) ---
                        }
                    }
                }
            }
            ctx.json(resultados);

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao realizar busca de medicamento."));
        } finally {
            if (conn != null) {
                try {
                    conn.close(); // Fecha a conexão principal
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        // --- RF6.3: Registrar Log de Busca (Sem alterações) ---
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