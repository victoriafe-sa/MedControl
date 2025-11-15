package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.AuditoriaServico;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

/**
 * Controlador para RF5.6 - Registrar Retirada de Medicamento.
 */
public class RetiradaController {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Registra uma nova retirada de medicamento, atualizando o estoque em uma transação.
     * Espera um JSON com: { id_usuario, id_ubs, id_farmaceutico, itens: [{id_estoque, id_medicamento, quantidade}] }
     */
    public void registrarRetirada(Context ctx) {
        Connection conn = null;
        Integer adminId = null;
        int idRetiradaGerada = -1;
        Map<String, Object> req = null;

        try {
            // Pega o ID do admin/farmacêutico logado (que está realizando a operação)
            adminId = Integer.parseInt(ctx.header("X-User-ID"));
            
            // Lê o corpo da requisição
            req = mapper.readValue(ctx.body(), new TypeReference<Map<String, Object>>() {});
            
            Integer idUsuario = (Integer) req.get("id_usuario");
            Integer idUbs = (Integer) req.get("id_ubs");
            // O ID do farmacêutico é o admin logado
            Integer idFarmaceutico = adminId; 
            
            // CORRIGIDO: Adiciona @SuppressWarnings("unchecked") para o aviso
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itens = (List<Map<String, Object>>) req.get("itens");

            if (itens == null || itens.isEmpty() || idUsuario == null || idUbs == null) {
                ctx.status(400).json(Map.of("erro", "Dados insuficientes para registrar a retirada."));
                return;
            }

            conn = DB.getConnection();
            if (conn == null) {
                throw new SQLException("Não foi possível conectar ao banco de dados.");
            }
            
            // --- INÍCIO DA TRANSAÇÃO ---
            conn.setAutoCommit(false);

            // Passo 1: Inserir o registro principal na tabela 'retiradas'
            String sqlRetirada = "INSERT INTO retiradas (id_usuario, id_ubs, id_farmaceutico) VALUES (?, ?, ?)";
            try (PreparedStatement psRetirada = conn.prepareStatement(sqlRetirada, Statement.RETURN_GENERATED_KEYS)) {
                
                psRetirada.setInt(1, idUsuario);
                psRetirada.setInt(2, idUbs);
                psRetirada.setInt(3, idFarmaceutico);
                psRetirada.executeUpdate();

                try (ResultSet rs = psRetirada.getGeneratedKeys()) {
                    if (rs.next()) {
                        idRetiradaGerada = rs.getInt(1);
                    } else {
                        throw new SQLException("Falha ao obter o ID da retirada gerada.");
                    }
                }
            }

            // Passos 2 e 3: Inserir itens e Atualizar estoque
            String sqlItens = "INSERT INTO itens_retiradas (id_retirada, id_medicamento, id_estoque, quantidade) VALUES (?, ?, ?, ?)";
            String sqlEstoque = "UPDATE estoque SET quantidade = quantidade - ? WHERE id_estoque = ? AND quantidade >= ?";
            
            try (PreparedStatement psItens = conn.prepareStatement(sqlItens);
                 PreparedStatement psEstoque = conn.prepareStatement(sqlEstoque)) {

                for (Map<String, Object> item : itens) {
                    int idMedicamento = (Integer) item.get("id_medicamento");
                    int idEstoque = (Integer) item.get("id_estoque");
                    int quantidade = (Integer) item.get("quantidade");

                    // Adiciona ao batch de 'itens_retiradas'
                    psItens.setInt(1, idRetiradaGerada);
                    psItens.setInt(2, idMedicamento);
                    psItens.setInt(3, idEstoque);
                    psItens.setInt(4, quantidade);
                    psItens.addBatch();

                    // Adiciona ao batch de 'estoque'
                    psEstoque.setInt(1, quantidade);
                    psEstoque.setInt(2, idEstoque);
                    psEstoque.setInt(3, quantidade); // Garante que há estoque suficiente
                    psEstoque.addBatch();
                }

                psItens.executeBatch();
                int[] resultadosEstoque = psEstoque.executeBatch();

                // Verifica se alguma atualização de estoque falhou (ex: quantidade < ?)
                for (int resultado : resultadosEstoque) {
                    if (resultado == 0) {
                        throw new SQLException("Falha ao atualizar o estoque. Verifique a quantidade disponível.");
                    }
                }
            }
            
            // Passo 4: Commit
            conn.commit();
            
            // Passo 5: Auditoria (fora da transação principal)
            if (idRetiradaGerada != -1) {
                AuditoriaServico.registrarAcao(adminId, "REGISTRAR_RETIRADA", "retiradas", idRetiradaGerada, req);
            }

            ctx.status(201).json(Map.of("sucesso", true, "id_retirada", idRetiradaGerada));

        } catch (Exception e) {
            // Rollback em caso de erro
            if (conn != null) {
                try {
                    conn.rollback();
                } catch (SQLException ex) {
                    ex.printStackTrace();
                }
            }
            e.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro ao registrar retirada: " + e.getMessage()));
        } finally {
            // Restaura auto-commit e fecha conexão
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}