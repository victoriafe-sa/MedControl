package br.com.medcontrol;

import br.com.medcontrol.controlador.AutenticacaoController;
import br.com.medcontrol.controlador.UsuarioController;
import br.com.medcontrol.controlador.UBSController; 
import br.com.medcontrol.controlador.MedicamentoController; 
import br.com.medcontrol.controlador.EstoqueController;
import br.com.medcontrol.controlador.AuditoriaController; 
import br.com.medcontrol.controlador.RelatorioController; // <-- ADICIONADO RF09
import br.com.medcontrol.controlador.RetiradaController; // <-- ADICIONADO RF6.3
import br.com.medcontrol.servicos.CepServico;
import br.com.medcontrol.servicos.EmailServico;
import io.javalin.Javalin;
// Removido (será movido para MedicamentoController): import java.util.ArrayList;
// Removido (será movido para MedicamentoController): import java.util.List;
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
        CepServico cepServico = new CepServico();
        
        // --- INSTÂNCIA DE CONTROLADORES ---
        // CORREÇÃO: Removida injeção de CepServico
        AutenticacaoController autenticacaoController = new AutenticacaoController(emailServico);
        UsuarioController usuarioController = new UsuarioController(); // CORREÇÃO
        UBSController ubsController = new UBSController(); 
        MedicamentoController medicamentoController = new MedicamentoController(); 
        EstoqueController estoqueController = new EstoqueController(); 
        AuditoriaController auditoriaController = new AuditoriaController(); // <-- ADICIONADO rf08
        RetiradaController retiradaController = new RetiradaController(); // <-- ADICIONADO RF6.3
        RelatorioController relatorioController = new RelatorioController(); // <-- ADICIONADO RF09

        // --- ROTAS DE AUTENTICAÇÃO E REGISTRO ---
        app.post("/api/login", autenticacaoController::login);
        app.post("/api/register", autenticacaoController::registrar);
        app.post("/api/usuarios/enviar-codigo-verificacao", autenticacaoController::enviarCodigoVerificacao);
        app.post("/api/usuarios/verificar-codigo", autenticacaoController::verificarCodigo);
        app.post("/api/usuarios/verificar-existencia", autenticacaoController::verificarExistencia);
        app.delete("/api/estoque/{id}", estoqueController::excluirEstoque); //RF08
        

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
            // Remove hífens e formatação
            String cep = ctx.pathParam("cep").replaceAll("\\D", "");
            Map<String, Object> resultado = cepServico.buscarCep(cep);
            if (resultado.containsKey("erro") && (Boolean) resultado.get("erro")) {
                ctx.status(404).json(resultado);
            } else {
                ctx.status(200).json(resultado);
            }
        });

        // --- RF03: ROTAS DE GERENCIAMENTO DE UBS ---
        app.get("/api/ubs", ubsController::listarTodas);
        app.get("/api/ubs/{id}", ubsController::buscarPorId);
        app.post("/api/ubs", ubsController::cadastrar);
        app.put("/api/ubs/{id}", ubsController::atualizar);
        app.delete("/api/ubs/{id}", ubsController::excluir);

        // --- RF04: ROTAS DE GERENCIAMENTO DE MEDICAMENTOS (BASE) ---
        app.get("/api/medicamentos", medicamentoController::listarTodos);
        app.post("/api/medicamentos", medicamentoController::cadastrar);
        app.put("/api/medicamentos/{id}", medicamentoController::atualizar);
        app.delete("/api/medicamentos/{id}", medicamentoController::excluir);
        app.put("/api/medicamentos/{id}/status", medicamentoController::alterarStatus);

        // --- RF04: ROTAS DE GERENCIAMENTO DE ESTOQUE ---
        app.get("/api/estoque", estoqueController::listarEstoque);
        app.post("/api/estoque", estoqueController::cadastrarEstoque);
        app.put("/api/estoque/{id}", estoqueController::atualizarEstoque);
        app.post("/api/estoque/verificar-lote", estoqueController::verificarLote);

        // --- RF6.3: ROTA DE REGISTRO DE RETIRADA ---
        app.post("/api/retiradas", retiradaController::registrarRetirada);
        
        // --- RF08.4: ROTA DE AUDITORIA ---
        app.get("/api/auditoria", auditoriaController::listarLogs);
        
        // --- RF09: ROTAS DE RELATÓRIOS E DASHBOARD ---
        app.get("/api/relatorios/estoque", relatorioController::getRelatorioEstoque);
        app.get("/api/relatorios/demanda", relatorioController::getRelatorioDemanda);
        app.get("/api/dashboard/indicadores", relatorioController::getIndicadoresDashboard);
        
        // --- ROTAS PÚBLICAS (MOCK) ---
        // MODIFICADO RF5.6: Rota movida de MOCK para o controlador
        app.get("/api/medicamentos/search", medicamentoController::buscarMedicamento);
    }
}