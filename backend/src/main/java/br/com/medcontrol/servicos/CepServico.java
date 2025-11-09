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
     * Busca informações de um CEP utilizando a API BrasilAPI v2.
     * @param cep O CEP a ser consultado (deve conter apenas números).
     * @return Um Map com os dados do endereço, incluindo latitude/longitude, ou um mapa indicando erro.
     */
    public Map<String, Object> buscarCep(String cep) {
        // MODIFICADO: URL trocada para BrasilAPI v2
        String url = String.format("https://brasilapi.com.br/api/cep/v2/%s", cep);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(new URI(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // Mapeia a resposta principal
                Map<String, Object> responseMap = mapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
                
                // Extrai as coordenadas do objeto 'location'
                if (responseMap.containsKey("location")) {
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> location = (Map<String, Object>) responseMap.get("location");
                        
                        @SuppressWarnings("unchecked")
                        Map<String, String> coordinates = (Map<String, String>) location.get("coordinates");
                        
                        if (coordinates != null) {
                            responseMap.put("latitude", coordinates.get("latitude"));
                            responseMap.put("longitude", coordinates.get("longitude"));
                        }
                    } catch (Exception e) {
                        System.err.println("Erro ao processar coordenadas do CEP: " + e.getMessage());
                        // Continua mesmo sem coordenadas, mas loga o erro
                    }
                }
                
                return responseMap;
            } else {
                 // MODIFICADO: Trata o 404 (CEP não encontrado) da BrasilAPI
                 Map<String, Object> errorMap = new HashMap<>();
                 errorMap.put("erro", true);
                 
                 if (response.statusCode() == 404) {
                    errorMap.put("message", "CEP não encontrado.");
                 } else {
                    errorMap.put("message", "Erro na consulta do CEP. Status: " + response.statusCode());
                 }
                 return errorMap;
            }

        } catch (IOException | InterruptedException e) {
            System.err.println("Falha ao consultar BrasilAPI API: " + e.getMessage());
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