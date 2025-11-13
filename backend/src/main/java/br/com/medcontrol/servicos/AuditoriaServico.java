package br.com.medcontrol.servicos;

import br.com.medcontrol.db.DB; // Importa a classe DB
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.Map;

/**
 * RF08.4 - Serviço para registrar logs de auditoria no banco de dados.
 */
public class AuditoriaServico {

    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Registra uma ação administrativa na tabela de auditoria.
     * Este método é estático para ser facilmente chamado de qualquer controlador.
     * * @param idUsuario O ID do usuário (admin) realizando a ação. Pode ser nulo.
     * @param acao A ação realizada (ex: "CRIAR", "ATUALIZAR", "EXCLUIR").
     * @param tabelaAfetada O nome da tabela que sofreu a ação (ex: "usuarios", "ubs").
     * @param registroId O ID do registro que foi afetado.
     * @param detalhesObj Um Map (geralmente o corpo da requisição) contendo os detalhes do que foi alterado.
     */
    public static void registrarAcao(Integer idUsuario, String acao, String tabelaAfetada, int registroId, Map<String, Object> detalhesObj) {
        
        String sql = "INSERT INTO auditoria (id_usuario, acao, tabela_afetada, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)";
        
        String detalhesJson = null;
        if (detalhesObj != null) {
            try {
                // Remove dados sensíveis dos logs
                detalhesObj.remove("senha");
                detalhesObj.remove("codigoVerificacao");
                detalhesJson = mapper.writeValueAsString(detalhesObj);
            } catch (Exception e) {
                detalhesJson = "{\"erro\": \"Falha ao serializar detalhes.\"}";
            }
        }

        // MODIFICADO: Abre e fecha a própria conexão
        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            if (idUsuario != null) {
                ps.setInt(1, idUsuario);
            } else {
                ps.setNull(1, Types.INTEGER); // id_usuario (admin) - nulo por enquanto
            }
            ps.setString(2, acao);
            ps.setString(3, tabelaAfetada);
            ps.setInt(4, registroId);
            ps.setString(5, detalhesJson);
            
            ps.executeUpdate();
            
        } catch (Exception e) {
            System.err.println("--- FALHA NA AUDITORIA (RF08.4) ---");
            e.printStackTrace();
            // A falha na auditoria não deve interromper a operação principal.
        }
    }
}