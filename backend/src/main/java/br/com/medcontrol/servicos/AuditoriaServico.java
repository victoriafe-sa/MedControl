package br.com.medcontrol.servicos;

import br.com.medcontrol.db.DB; // Importa a classe DB
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet; // <-- ADICIONADO
import java.sql.Types;
import java.util.ArrayList; // <-- ADICIONADO
import java.util.HashMap; // <-- ADICIONADO
import java.util.List; // <-- ADICIONADO
import java.util.Map;

/**
 * RF08.4 - Serviço para registrar logs de auditoria no banco de dados.
 */
public class AuditoriaServico {

    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Busca o nome de uma entidade em outra tabela para enriquecer o log.
     * @param tabela Tabela (ex: "usuarios", "ubs")
     * @param id O ID a ser buscado
     * @return O nome encontrado ou "ID: {id}" como fallback.
     */
    private static String getNome(String tabela, Integer id) {
        if (id == null) return "N/A";
        
        String sql;
        String nameColumn;

        // Define a consulta SQL com base na tabela
        switch (tabela) {
            case "usuarios":
                sql = "SELECT nome FROM usuarios WHERE id = ?";
                nameColumn = "nome";
                break;
            case "ubs":
                sql = "SELECT nome FROM ubs WHERE id_ubs = ?";
                nameColumn = "nome";
                break;
            case "medicamentos":
                sql = "SELECT nome_comercial FROM medicamentos WHERE id_medicamento = ?";
                nameColumn = "nome_comercial";
                break;
            case "farmaceuticos":
                sql = "SELECT nome FROM farmaceuticos WHERE id_farmaceutico = ?";
                nameColumn = "nome";
                break;
            default:
                return "ID: " + id;
        }

        // Este helper abre sua própria conexão para buscar o nome
        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString(nameColumn);
                }
            }
        } catch (Exception e) {
            System.err.println("Erro no helper de auditoria (getNome): " + e.getMessage());
        }
        return "ID: " + id; // Fallback se não encontrar
    }


    /**
     * Registra uma ação administrativa na tabela de auditoria.
     * Este método é estático para ser facilmente chamado de qualquer controlador.
     * @param idUsuario O ID do usuário (admin) realizando a ação. Pode ser nulo.
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
                // --- INÍCIO DA MODIFICAÇÃO (Enriquecer Detalhes) ---
                // Criar uma cópia para não modificar o objeto original
                Map<String, Object> detalhesEnriquecidos = new HashMap<>(detalhesObj);

                // Remove dados sensíveis
                detalhesEnriquecidos.remove("senha");
                detalhesEnriquecidos.remove("codigoVerificacao");

                // Adiciona nomes com base no tipo de alvo
                switch (tabelaAfetada) {
                    case "retiradas":
                        // O "id_usuario" aqui é o *paciente*
                        Integer idPaciente = null;
                        if (detalhesEnriquecidos.get("id_usuario") != null) {
                           idPaciente = Integer.parseInt(detalhesEnriquecidos.remove("id_usuario").toString());
                        }
                        
                        Integer idUbs = null;
                         if (detalhesEnriquecidos.get("id_ubs") != null) {
                            idUbs = Integer.parseInt(detalhesEnriquecidos.remove("id_ubs").toString());
                         }
                        
                        // O "id_farmaceutico" já é o ID do admin que está no log principal (idUsuario)
                        detalhesEnriquecidos.remove("id_farmaceutico"); 
                        
                        detalhesEnriquecidos.put("paciente", getNome("usuarios", idPaciente));
                        detalhesEnriquecidos.put("ubs", getNome("ubs", idUbs));
                        
                        // --- INÍCIO DA CORREÇÃO (Itens [object Object]) ---
                        if (detalhesEnriquecidos.containsKey("itens") && detalhesEnriquecidos.get("itens") instanceof java.util.List) {
                            try {
                                // Cast para uma lista de mapas
                                @SuppressWarnings("unchecked")
                                List<Map<String, Object>> itensOriginais = (List<Map<String, Object>>) detalhesEnriquecidos.get("itens");
                                
                                // Criar uma nova lista para as strings formatadas
                                List<String> itensFormatados = new ArrayList<>();
                                
                                for (Map<String, Object> item : itensOriginais) {
                                    Integer idMed = Integer.parseInt(item.get("id_medicamento").toString());
                                    Integer qtd = Integer.parseInt(item.get("quantidade").toString());
                                    String nomeMed = getNome("medicamentos", idMed);
                                    
                                    // Formata o item de forma legível
                                    itensFormatados.add(String.format("%s (Qtd: %d)", nomeMed, qtd));
                                }
                                
                                // Substituir a lista de objetos pela lista de strings legíveis
                                detalhesEnriquecidos.put("itens", itensFormatados);
                                
                            } catch (Exception e) {
                                // Se falhar a formatação, pelo menos não quebra
                                detalhesEnriquecidos.put("itens", "Erro ao formatar lista de itens");
                                e.printStackTrace();
                            }
                        }
                        // --- FIM DA CORREÇÃO ---
                        break;
                        
                    case "estoque":
                        Integer idMed = Integer.parseInt(detalhesEnriquecidos.remove("id_medicamento").toString());
                        Integer idUbsEstoque = Integer.parseInt(detalhesEnriquecidos.remove("id_ubs").toString());
                        
                        detalhesEnriquecidos.put("medicamento", getNome("medicamentos", idMed));
                        detalhesEnriquecidos.put("ubs", getNome("ubs", idUbsEstoque));
                        break;
                        
                    case "usuarios":
                        detalhesEnriquecidos.put("nome_alvo", detalhesEnriquecidos.get("nome"));
                        break;
                    case "ubs":
                        detalhesEnriquecidos.put("nome_alvo", detalhesEnriquecidos.get("nome"));
                        break;
                    case "medicamentos":
                        detalhesEnriquecidos.put("nome_alvo", detalhesEnriquecidos.get("nome_comercial"));
                        break;
                    case "farmaceuticos":
                        detalhesEnriquecidos.put("nome_alvo", detalhesEnriquecidos.get("nome"));
                        break;
                }
                // --- FIM DA MODIFICAÇÃO ---

                // Serializa o novo mapa enriquecido
                detalhesJson = mapper.writeValueAsString(detalhesEnriquecidos);
            } catch (Exception e) {
                detalhesJson = "{\"erro\": \"Falha ao serializar detalhes.\"}";
                 e.printStackTrace(); // Loga o erro de enriquecimento
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
            ps.setString(5, detalhesJson); // Salva o JSON enriquecido
            
            ps.executeUpdate();
            
        } catch (Exception e) {
            System.err.println("--- FALHA NA AUDITORIA (RF08.4) ---");
            e.printStackTrace();
            // A falha na auditoria não deve interromper a operação principal.
        }
    }
}