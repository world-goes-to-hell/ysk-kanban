package com.example.todo.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Webhook;
import com.example.todo.entity.WebhookEvent;
import com.example.todo.repository.WebhookRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WebhookService {

    private final WebhookRepository webhookRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final ExecutorService webhookExecutor = Executors.newFixedThreadPool(3);

    @PreDestroy
    public void destroy() {
        webhookExecutor.shutdown();
    }

    public Webhook create(String name, String url, Long projectId, Long createdBy, String events, String secret) {
        Webhook webhook = Webhook.builder()
                .name(name)
                .url(url)
                .projectId(projectId)
                .createdBy(createdBy)
                .events(events)
                .secret(secret)
                .build();
        return webhookRepository.save(webhook);
    }

    @Transactional(readOnly = true)
    public List<Webhook> getByProjectId(Long projectId) {
        return webhookRepository.findByProjectId(projectId);
    }

    public Webhook update(Long id, String name, String url, String events, Boolean active, String secret) {
        Webhook webhook = webhookRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Webhook not found: " + id));
        if (name != null) webhook.setName(name);
        if (url != null) webhook.setUrl(url);
        if (events != null) webhook.setEvents(events);
        if (active != null) webhook.setActive(active);
        if (secret != null) webhook.setSecret(secret);
        return webhookRepository.save(webhook);
    }

    public void delete(Long id) {
        webhookRepository.deleteById(id);
    }

    public void fireEvent(WebhookEvent event, Long projectId, Map<String, Object> payload) {
        List<Webhook> webhooks = webhookRepository.findByProjectIdAndActiveTrue(projectId);
        for (Webhook webhook : webhooks) {
            if (webhook.getEventList().contains(event)) {
                webhookExecutor.submit(() -> sendWebhook(webhook, event, payload));
            }
        }
    }

    private void sendWebhook(Webhook webhook, WebhookEvent event, Map<String, Object> payload) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("event", event.name());
            body.put("timestamp", LocalDateTime.now().toString());
            body.put("payload", payload);

            String json = objectMapper.writeValueAsString(body);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(webhook.getUrl()))
                    .header("Content-Type", "application/json")
                    .header("X-Webhook-Event", event.name())
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(10));

            if (webhook.getSecret() != null && !webhook.getSecret().isEmpty()) {
                requestBuilder.header("X-Webhook-Secret", webhook.getSecret());
            }

            HttpResponse<String> response = httpClient.send(requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofString());

            webhook.setLastTriggeredAt(LocalDateTime.now());
            webhook.setLastResponseStatus(String.valueOf(response.statusCode()));
            webhookRepository.save(webhook);

            log.info("Webhook {} triggered for event {}: status {}", webhook.getName(), event, response.statusCode());
        } catch (Exception e) {
            webhook.setLastTriggeredAt(LocalDateTime.now());
            webhook.setLastResponseStatus("ERROR: " + e.getMessage());
            webhookRepository.save(webhook);
            log.error("Webhook {} failed for event {}: {}", webhook.getName(), event, e.getMessage());
        }
    }
}
