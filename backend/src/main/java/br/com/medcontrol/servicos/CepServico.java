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
     * @return Um Map com os dados do endereço, ou um mapa indicando erro.
     */
    public Map<String, Object> buscarCep(String cep) {
        // MODIFICAÇÃO 2.1: URL trocada para ViaCEP
        String url = String.format("https://viacep.com.br/ws/%s/json/", cep);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(new URI(url))
                    .header("Accept", "application/json")
                    .header("User-Agent", "Java-HttpClient/21")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // Mapeia a resposta principal
                Map<String, Object> responseMap = mapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
                
                // MODIFICAÇÃO 2.1: Verifica se a ViaCEP retornou erro
                if (responseMap.containsKey("erro")) {
                    Map<String, Object> errorMap = new HashMap<>();
                    errorMap.put("erro", true);
                    errorMap.put("message", "CEP não encontrado.");
                    return errorMap;
                }
                
                // MODIFICAÇÃO 2.1: Remove lógica de location/coordinates e popula com ViaCEP
                Map<String, Object> resultMap = new HashMap<>();
                resultMap.put("cep", responseMap.get("cep"));
                resultMap.put("logradouro", responseMap.get("logradouro"));
                resultMap.put("bairro", responseMap.get("bairro"));
                resultMap.put("cidade", responseMap.get("localidade")); // ViaCEP usa "localidade"
                resultMap.put("uf", responseMap.get("uf"));
                
                return resultMap; // Retorna o mapa formatado

            } else {
                 // Trata erros de status HTTP (diferente de 200)
                 Map<String, Object> errorMap = new HashMap<>();
                 errorMap.put("erro", true);
                 errorMap.put("message", "Erro na consulta do CEP. Status: " + response.statusCode());
                 return errorMap;
            }

        } catch (IOException | InterruptedException e) {
            System.err.println("Falha ao consultar ViaCEP API: " + e.getMessage()); // Modificado
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