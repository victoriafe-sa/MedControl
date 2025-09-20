package br.com.medcontrol;

import br.com.medcontrol.controlador.AutenticacaoController;
import br.com.medcontrol.controlador.UsuarioController;
import br.com.medcontrol.servicos.CepServico; // <-- IMPORTADO
import br.com.medcontrol.servicos.EmailServico;
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
        
        // --- INSTÂNCIA DE SERVIÇOS ---
        EmailServico emailServico = new EmailServico();
        CepServico cepServico = new CepServico(); // <-- INSTANCIADO
        
        // --- INSTÂNCIA DE CONTROLADORES ---
        AutenticacaoController autenticacaoController = new AutenticacaoController(emailServico);
        UsuarioController usuarioController = new UsuarioController();


        // --- ROTAS DE AUTENTICAÇÃO E REGISTRO ---
        app.post("/api/login", autenticacaoController::login);
        app.post("/api/register", autenticacaoController::registrar);
        app.post("/api/usuarios/enviar-codigo-verificacao", autenticacaoController::enviarCodigoVerificacao);
        app.post("/api/usuarios/verificar-codigo", autenticacaoController::verificarCodigo);
        app.post("/api/usuarios/verificar-existencia", autenticacaoController::verificarExistencia);


        // --- ROTAS PARA RECUPERAÇÃO DE SENHA ---
        app.post("/api/password-reset/check-email", autenticacaoController::verificarEmail);
        app.post("/api/password-reset/update", autenticacaoController::atualizarSenha);
        
        // --- ROTA PARA REDEFINIÇÃO DE SENHA (LOGADO) ---
        app.post("/api/users/{id}/redefine-password", usuarioController::redefinirSenha);

        // --- ROTAS PARA GERENCIAMENTO DE USUÁRIOS (ADMIN) ---
        app.get("/api/users", usuarioController::listarTodos);
        app.post("/api/users", autenticacaoController::registrarAdmin);
        app.put("/api/users/{id}", usuarioController::atualizar); // Atualização sem verificação
        app.put("/api/users/{id}/update-verified", autenticacaoController::atualizarComVerificacao); // Atualização COM verificação
        app.put("/api/users/{id}/status", usuarioController::alterarStatus);
        app.delete("/api/users/{id}", usuarioController::excluir);
        app.post("/api/admin/verify-password", usuarioController::verificarSenhaAdmin);

        // --- ROTA DA API VIACEP ---
        app.get("/api/cep/{cep}", ctx -> {
            String cep = ctx.pathParam("cep");
            Map<String, Object> resultado = cepServico.buscarCep(cep);
            if (resultado.containsKey("erro") && (Boolean) resultado.get("erro")) {
                ctx.status(404).json(resultado);
            } else {
                ctx.status(200).json(resultado);
            }
        });

        // --- ROTAS PÚBLICAS (MOCK) ---
        app.get("/api/medicamentos/search", ctx -> {
            String nome = ctx.queryParam("nome");
            if (nome == null || nome.trim().isEmpty()) {
                ctx.status(400).json(new ArrayList<>());
                return;
            }
            
            List<Map<String, Object>> ubsDisponiveis = new ArrayList<>();
            if (nome.equalsIgnoreCase("paracetamol")) {
                 ubsDisponiveis.add(Map.of("nome", "UBS 01 - Asa Sul", "endereco", "Quadra 614 Sul, Brasília - DF", "estoque", 50));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF", "estoque", 120));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF", "estoque", 120));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF", "estoque", 120));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF", "estoque", 120));
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF", "estoque", 120));
            } else if (nome.equalsIgnoreCase("ibuprofeno")) {
                 ubsDisponiveis.add(Map.of("nome", "UBS 02 - Taguatinga Centro", "endereco", "QNC AE 1, Taguatinga - DF", "estoque", 85));
            } else if (nome.equalsIgnoreCase("losartana")) {
                 ubsDisponiveis.add(Map.of("nome", "UBS 03 - Guará II", "endereco", "QE 23, Guará II - DF", "estoque", 0));
            }
            
            ctx.json(ubsDisponiveis);
        });
    }
}
