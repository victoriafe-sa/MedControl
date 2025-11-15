package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
// Removido ObjectMapper, que não era usado
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException; // <-- ADICIONADA IMPORTAÇÃO
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador para RF09 - Relatórios e Painel de Gestão.
 */
public class RelatorioController {

    // Removido ObjectMapper, que não era usado

    /**
     * RF09.3 - Retorna os indicadores consolidados para o Dashboard.
     * GET /api/dashboard/indicadores
     */
    public void getIndicadoresDashboard(Context ctx) {
        Map<String, Object> dashboard = new HashMap<>();

        try (Connection conn = DB.getConnection()) {
            
            // 1. Estoque Crítico (Top 5)
            String sqlEstoque = "SELECT m.nome_comercial, e.lote, e.data_validade, e.quantidade, u.nome as nome_ubs " +
                                "FROM estoque e " +
                                "JOIN medicamentos m ON e.id_medicamento = m.id_medicamento " +
                                "JOIN ubs u ON e.id_ubs = u.id_ubs " +
                                "WHERE e.quantidade < 20 AND m.ativo = TRUE " +
                                "ORDER BY e.quantidade ASC, e.data_validade ASC LIMIT 5";
            
            List<Map<String, Object>> estoqueCritico = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(sqlEstoque); ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("nome_comercial", rs.getString("nome_comercial"));
                    item.put("nome_ubs", rs.getString("nome_ubs"));
                    item.put("lote", rs.getString("lote"));
                    item.put("quantidade", rs.getInt("quantidade"));
                    item.put("data_validade", rs.getDate("data_validade"));
                    estoqueCritico.add(item);
                }
            }
            dashboard.put("estoqueCritico", estoqueCritico);

            // 2. Mais Pesquisados (Top 5) - Depende da RF6.3 (log_buscas)
            String sqlBuscas = "SELECT termo_buscado, COUNT(*) as total FROM log_buscas " +
                               "WHERE teve_resultados = true AND data_busca >= CURDATE() - INTERVAL 30 DAY " +
                               "GROUP BY termo_buscado ORDER BY total DESC LIMIT 5";
            
            List<Map<String, Object>> maisPesquisados = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(sqlBuscas); ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    maisPesquisados.add(Map.of(
                        "termo", rs.getString("termo_buscado"),
                        "total", rs.getInt("total")
                    ));
                }
            } catch (SQLException e) {
                // Ignora se a tabela log_buscas ainda não existir
                System.err.println("Aviso: Tabela 'log_buscas' pode não existir. " + e.getMessage());
            }
            dashboard.put("maisPesquisados", maisPesquisados);

            // 3. Projeção de Demanda (Retiradas nos últimos 30 dias) - Depende da RF5.6 (retiradas)
            String sqlDemanda = "SELECT DATE(data_retirada) as dia, COUNT(DISTINCT id_retirada) as total_retiradas, SUM(ir.quantidade) as total_itens " +
                                "FROM retiradas r " +
                                "JOIN itens_retiradas ir ON r.id_retirada = ir.id_retirada " +
                                "WHERE r.data_retirada >= CURDATE() - INTERVAL 30 DAY " +
                                "GROUP BY dia ORDER BY dia ASC";
            
            List<Map<String, Object>> projecaoDemanda = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(sqlDemanda); ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    projecaoDemanda.add(Map.of(
                        "dia", rs.getString("dia"),
                        "total_itens", rs.getInt("total_itens")
                    ));
                }
            } catch (SQLException e) {
                // Ignora se a tabela retiradas ainda não existir
                System.err.println("Aviso: Tabela 'retiradas' pode não existir. " + e.getMessage());
            }
            dashboard.put("projecaoDemanda", projecaoDemanda);

            ctx.json(dashboard);

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao buscar indicadores do dashboard."));
        }
    }

    /**
     * RF09.1 - Relatório de Posição de Estoque (com status).
     * GET /api/relatorios/estoque
     */
    public void getRelatorioEstoque(Context ctx) {
        String ubsId = ctx.queryParam("ubs_id");
        List<Map<String, Object>> relatorioEstoque = new ArrayList<>();
        
        StringBuilder sqlBuilder = new StringBuilder(
            "SELECT e.id_estoque, e.quantidade, e.lote, e.data_validade, " +
            "m.nome_comercial, m.principio_ativo, u.nome AS nome_ubs " +
            "FROM estoque e " +
            "JOIN medicamentos m ON e.id_medicamento = m.id_medicamento " +
            "JOIN ubs u ON e.id_ubs = u.id_ubs " +
            "WHERE m.ativo = TRUE AND u.ativo = TRUE "
        );

        if (ubsId != null && !ubsId.isEmpty()) {
            sqlBuilder.append("AND u.id_ubs = ? ");
        }
        sqlBuilder.append("ORDER BY m.nome_comercial, u.nome, e.data_validade");

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sqlBuilder.toString())) {
            
            if (ubsId != null && !ubsId.isEmpty()) {
                ps.setInt(1, Integer.parseInt(ubsId));
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("nome_comercial", rs.getString("nome_comercial"));
                    item.put("principio_ativo", rs.getString("principio_ativo"));
                    item.put("nome_ubs", rs.getString("nome_ubs"));
                    item.put("lote", rs.getString("lote"));
                    item.put("quantidade", rs.getInt("quantidade"));
                    
                    Date dataValidade = rs.getDate("data_validade");
                    item.put("data_validade", dataValidade);
                    
                    // Lógica de Status (em Java)
                    String status;
                    if (dataValidade != null && dataValidade.toLocalDate().isBefore(LocalDate.now())) {
                        status = "Vencido";
                    } else if (rs.getInt("quantidade") < 20) {
                        status = "Crítico";
                    } else if (rs.getInt("quantidade") < 50) {
                        status = "Baixo";
                    } else {
                        status = "OK";
                    }
                    item.put("status", status);
                    
                    relatorioEstoque.add(item);
                }
            }
            ctx.json(relatorioEstoque);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao gerar relatório de estoque."));
        }
    }

    /**
     * RF09.2 - Relatório de Demanda (Medicamentos mais retirados).
     * GET /api/relatorios/demanda
     */
    public void getRelatorioDemanda(Context ctx) {
        String dataInicio = ctx.queryParam("inicio");
        String dataFim = ctx.queryParam("fim");
        
        List<Map<String, Object>> relatorioDemanda = new ArrayList<>();
        
        // SQL para medicamentos mais retirados
        StringBuilder sqlBuilder = new StringBuilder(
            "SELECT m.nome_comercial, m.principio_ativo, SUM(ir.quantidade) as total_retirado " +
            "FROM retiradas r " +
            "JOIN itens_retiradas ir ON r.id_retirada = ir.id_retirada " +
            "JOIN medicamentos m ON ir.id_medicamento = m.id_medicamento "
        );

        // Tratamento de datas (simplificado)
        List<Object> params = new ArrayList<>();
        if (dataInicio != null && !dataInicio.isEmpty() && dataFim != null && !dataFim.isEmpty()) {
            sqlBuilder.append("WHERE r.data_retirada BETWEEN ? AND ? ");
            params.add(dataInicio);
            params.add(dataFim);
        }

        sqlBuilder.append("GROUP BY m.id_medicamento, m.nome_comercial, m.principio_ativo ");
        sqlBuilder.append("ORDER BY total_retirado DESC");

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sqlBuilder.toString())) {
            
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    relatorioDemanda.add(Map.of(
                        "nome_comercial", rs.getString("nome_comercial"),
                        "principio_ativo", rs.getString("principio_ativo"),
                        "total_retirado", rs.getInt("total_retirado")
                    ));
                }
            }
            ctx.json(relatorioDemanda);
        } catch (SQLException e) {
             // Ignora se as tabelas de retirada não existirem
             System.err.println("Aviso: Tabelas 'retiradas' podem não existir. " + e.getMessage());
             ctx.json(relatorioDemanda); // Retorna lista vazia
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao gerar relatório de demanda."));
        }
    }
}