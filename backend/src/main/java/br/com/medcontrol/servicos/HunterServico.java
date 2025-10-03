/* Codigo original para integração com Hunter API (desativado para testes):
package br.com.medcontrol.servicos;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

public class HunterServico {
    // ATENÇÃO: Armazene esta chave de forma segura (variáveis de ambiente, etc.)
    private static final String HUNTER_API_KEY = "Sua-Chave-Api-Aqui"; // <-- COLOQUE SUA CHAVE AQUI
    private static final String HUNTER_API_URL = "https://api.hunter.io/v2/email-verifier?email=%s&api_key=%s";

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isEmailValido(String email) {
        try {
            String url = String.format(HUNTER_API_URL, email, HUNTER_API_KEY);
            HttpRequest request = HttpRequest.newBuilder().uri(new URI(url)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<String, Object> responseMap = mapper.readValue(response.body(), Map.class);
                Map<String, Object> data = (Map<String, Object>) responseMap.get("data");
                String result = (String) data.get("result");
                
                // Apenas e-mails "entregáveis" são considerados válidos.
                return "deliverable".equalsIgnoreCase(result);
            }
        } catch (Exception e) {
            System.err.println("Falha ao verificar e-mail com Hunter API: " + e.getMessage());
            // Em caso de erro na API, retorne false para segurança.
            return false;
        }
        return false;
    }
}
*/
package br.com.medcontrol.servicos;

public class HunterServico {
    
    public boolean isEmailValido(String email) {
        System.out.println("--- MODO DE TESTE: Validação de E-mail (Hunter API) desativada. Retornando 'true' para: " + email + " ---");
        return true; // Sempre retorna true para facilitar os testes.
        
    }
}
