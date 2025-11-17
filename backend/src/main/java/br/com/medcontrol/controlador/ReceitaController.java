package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Controlador para RF05.5 - Validar Receitas
 */
public class ReceitaController {

    @SuppressWarnings("unused")
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * RF05.5 - Valida uma receita pelo código.
     * GET /api/receitas/validar/{codigo}
     */
    public void validarReceita(Context ctx) {
        String codigoReceita = ctx.pathParam("codigo");
        String sql = "SELECT * FROM receitas WHERE codigo_receita = ?";

        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, codigoReceita);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    boolean utilizada = rs.getBoolean("utilizada");
                    boolean autenticada = rs.getBoolean("autenticada");
                    LocalDate dataValidade = rs.getDate("data_validade").toLocalDate();

                    Map<String, Object> resposta = new HashMap<>();
                    resposta.put("codigo", codigoReceita);
                    resposta.put("data_emissao", rs.getDate("data_emissao"));
                    resposta.put("data_validade", dataValidade);
                    resposta.put("autenticada", autenticada);
                    resposta.put("utilizada", utilizada);

                    if (utilizada) {
                        resposta.put("status", "invalida");
                        resposta.put("mensagem", "Receita já utilizada.");
                        ctx.status(409).json(resposta); // 409 Conflict
                    } else if (dataValidade.isBefore(LocalDate.now())) {
                        resposta.put("status", "invalida");
                        resposta.put("mensagem", "Receita expirada.");
                        ctx.status(410).json(resposta); // 410 Gone
                    } else if (!autenticada) {
                         resposta.put("status", "aviso");
                         resposta.put("mensagem", "Receita válida, mas aguardando autenticação.");
                         ctx.status(200).json(resposta);
                    } else {
                        resposta.put("status", "valida");
                        resposta.put("mensagem", "Receita válida e pronta para retirada.");
                        ctx.status(200).json(resposta);
                    }

                } else {
                    ctx.status(404).json(Map.of(
                        "status", "invalida",
                        "mensagem", "Código de receita não encontrado."
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("status", "erro", "mensagem", "Erro ao validar receita."));
        }
    }
}