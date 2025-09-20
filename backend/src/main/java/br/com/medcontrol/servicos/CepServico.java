package br.com.medcontrol.servicos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.HashMap;

public class CepServico {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Busca informações de um CEP utilizando a API ViaCEP.
     * @param cep O CEP a ser consultado (deve conter apenas números).
     * @return Um Map com os dados do endereço ou um mapa indicando erro.
     */
    public Map<String, Object> buscarCep(String cep) {
        String url = String.format("https://viacep.com.br/ws/%s/json/", cep);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(new URI(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // Usa TypeReference para garantir que o resultado seja um Map<String, Object>
                Map<String, Object> responseMap = mapper.readValue(response.body(), new TypeReference<>() {});
                
                // A API ViaCEP retorna {"erro": "true"} (como String) para CEPs de formato válido mas inexistentes.
                // Esta verificação trata o valor como String para evitar ClassCastException.
                if (responseMap.containsKey("erro") && Boolean.parseBoolean(String.valueOf(responseMap.get("erro")))) {
                    return Map.of("erro", true, "message", "CEP não encontrado.");
                }
                
                return responseMap;
            } else {
                 Map<String, Object> errorMap = new HashMap<>();
                 errorMap.put("erro", true);
                 errorMap.put("message", "Erro na consulta do CEP. Status: " + response.statusCode());
                 return errorMap;
            }

        } catch (IOException | InterruptedException e) {
            System.err.println("Falha ao consultar ViaCEP API: " + e.getMessage());
            Thread.currentThread().interrupt(); // Restaura o status de interrupção
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("erro", true);
            errorMap.put("message", "Falha de comunicação ao consultar o CEP.");
            return errorMap;
        } catch (Exception e) {
            System.err.println("Erro inesperado ao buscar CEP: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("erro", true);
            errorMap.put("message", "Ocorreu um erro inesperado.");
            return errorMap;
        }
    }
}

