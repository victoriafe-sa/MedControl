/* Codigo original para integração com Hunter API (desativado para testes):
package br.com.medcontrol.servicos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

// Esta classe é responsável por interagir com a API do Hunter.io para verificar se um e-mail é válido.
public class HunterServico {
    // ATENÇÃO: A chave da API deve ser armazenada de forma segura, como em variáveis de ambiente, e não diretamente no código.
    private static final String HUNTER_API_KEY = "Sua-Chave-Api-Aqui"; // <-- COLOQUE SUA CHAVE AQUI
    // URL base da API do Hunter para verificação de e-mail.
    private static final String HUNTER_API_URL = "https://api.hunter.io/v2/email-verifier?email=%s&api_key=%s";

    // HttpClient é a forma moderna no Java para fazer requisições HTTP.
    private final HttpClient httpClient = HttpClient.newHttpClient();
    // ObjectMapper para converter a resposta JSON da API em um objeto Java (Map).
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isEmailValido(String email) {
        try {
            // Monta a URL final com o e-mail do usuário e a chave da API.
            String url = String.format(HUNTER_API_URL, email, HUNTER_API_KEY);
            // Cria uma requisição GET para a URL da API.
            HttpRequest request = HttpRequest.newBuilder().uri(new URI(url)).GET().build();
            // Envia a requisição e aguarda a resposta como uma String.
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // Se a requisição foi bem-sucedida (status 200), processa a resposta.
            if (response.statusCode() == 200) {
                // Converte o corpo da resposta (JSON) para um Map.
                Map<String, Object> responseMap = mapper.readValue(response.body(), new TypeReference<>() {});
                // Extrai o objeto "data" do mapa principal.
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) responseMap.get("data");
                // Extrai o campo "result" de dentro de "data".
                String result = (String) data.get("result");
                
                // A validação principal: o método só retorna 'true' se a API disser que o e-mail é "deliverable" (entregável).
                // Isso garante um alto nível de confiança de que o e-mail existe e pode receber mensagens.
                return "deliverable".equalsIgnoreCase(result);
            }
        } catch (Exception e) {
            // Em caso de qualquer erro na comunicação com a API, imprime o erro no console.
            System.err.println("Falha ao verificar e-mail com Hunter API: " + e.getMessage());
            // Por segurança, retorna 'false' se a verificação falhar.
            return false;
        }
        return false;
    }
}

*/
package br.com.medcontrol.servicos;

// --- VERSÃO DE TESTE (MODO MOCK) ---
// Esta versão da classe é usada para o desenvolvimento, para que não seja
// necessário ter uma chave de API do Hunter.io configurada para rodar o projeto.
public class HunterServico {
    
    // Este método substitui a chamada real à API.
    public boolean isEmailValido(String email) {
        System.out.println("--- MODO DE TESTE: Validação de E-mail (Hunter API) desativada. Retornando 'true' para: " + email + " ---");
        // Em modo de teste, ele sempre retorna 'true' para permitir que o fluxo de envio de e-mail continue
        // sem uma verificação real, facilitando os testes de outras partes do sistema.
        return true; 
        
    }
}
