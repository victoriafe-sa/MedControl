package br.com.medcontrol;

import br.com.medcontrol.controlador.UsuarioController;
import io.javalin.Javalin;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ApiServer {

    public static void main(String[] args) {
        Javalin app = Javalin.create(config -> {
            config.plugins.enableCors(cors -> {
                cors.add(it -> it.anyHost());
            });
        }).start(7071);

        System.out.println("Servidor MedControl iniciado na porta 7071.");

        UsuarioController usuarioController = new UsuarioController();

        // --- ROTAS DE AUTENTICAÇÃO E REGISTRO ---
        app.post("/api/login", usuarioController::login);
        app.post("/api/register", usuarioController::registrar);

        // --- ROTAS PARA RECUPERAÇÃO DE SENHA ---
        app.post("/api/password-reset/check-email", usuarioController::verificarEmail);
        app.post("/api/password-reset/update", usuarioController::atualizarSenha);

        // --- ROTAS PARA GERENCIAMENTO DE USUÁRIOS (ADMIN) ---
        app.get("/api/users", usuarioController::listarTodos);
        app.post("/api/users", usuarioController::criar);
        app.put("/api/users/{id}", usuarioController::atualizar);
        app.put("/api/users/{id}/status", usuarioController::alterarStatus);
        app.delete("/api/users/{id}", usuarioController::excluir);
        app.post("/api/admin/verify-password", usuarioController::verificarSenhaAdmin);

        // --- ROTAS PÚBLICAS (MOCK) ---
        // TODO: Mover para seus próprios controladores (MedicamentoController, UBSController)
        app.get("/api/medicamentos/search", ctx -> {
            String nome = ctx.queryParam("nome");
            if (nome == null || nome.trim().isEmpty()) {
                ctx.status(400).json(new ArrayList<>());
                return;
            }
            
            List<Map<String, String>> ubsDisponiveis = new ArrayList<>();
            if (nome.equalsIgnoreCase("paracetamol") || nome.equalsIgnoreCase("ibuprofeno")) {
                 ubsDisponiveis.add(Map.of("nome", "UBS 01 - Asa Sul", "endereco", "Quadra 614 Sul, Brasília - DF"));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF"));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF"));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF"));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF"));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF"));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF"));
            } else if (nome.equalsIgnoreCase("losartana")) {
                 ubsDisponiveis.add(Map.of("nome", "UBS 03 - Guará II", "endereco", "QE 23, Guará II - DF"));
            }
            
            ctx.json(ubsDisponiveis);
        });
    }
}

