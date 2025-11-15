package br.com.medcontrol.servicos;

import br.com.medcontrol.db.DB;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;

/**
 * RF6.3 - Serviço para registrar logs de busca de medicamentos.
 */
public class LogBuscaServico {

    /**
     * Registra uma busca de medicamento na tabela log_buscas.
     * @param termo O termo que o usuário pesquisou.
     * @param teveResultados Se a busca retornou algum resultado.
     * @param idUsuario O ID do usuário logado (pode ser nulo).
     * @param idMedicamentoEncontrado O ID do primeiro medicamento encontrado (pode ser nulo).
     */
    public static void registrar(String termo, boolean teveResultados, Integer idUsuario, Integer idMedicamentoEncontrado) {
        
        String sql = "INSERT INTO log_buscas (termo_buscado, teve_resultados, id_usuario, id_medicamento_encontrado) VALUES (?, ?, ?, ?)";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, termo);
            ps.setBoolean(2, teveResultados);

            if (idUsuario != null) {
                ps.setInt(3, idUsuario);
            } else {
                ps.setNull(3, Types.INTEGER);
            }

            if (idMedicamentoEncontrado != null) {
                ps.setInt(4, idMedicamentoEncontrado);
            } else {
                ps.setNull(4, Types.INTEGER);
            }
            
            ps.executeUpdate();
            
        } catch (Exception e) {
            System.err.println("--- FALHA AO REGISTRAR LOG DE BUSCA (RF6.3) ---");
            e.printStackTrace();
            // A falha no log não deve interromper a operação principal do usuário.
        }
    }
}