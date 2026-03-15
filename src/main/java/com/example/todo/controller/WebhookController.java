package com.example.todo.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.todo.entity.Webhook;
import com.example.todo.service.UserService;
import com.example.todo.service.WebhookService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects/{projectId}/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookService webhookService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Webhook>> list(@PathVariable Long projectId) {
        return ResponseEntity.ok(webhookService.getByProjectId(projectId));
    }

    @PostMapping
    public ResponseEntity<Webhook> create(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String url = (String) body.get("url");
        String events = (String) body.get("events");
        String secret = (String) body.getOrDefault("secret", null);
        Long userId = getCurrentUserId();
        Webhook created = webhookService.create(name, url, projectId, userId, events, secret);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{webhookId}")
    public ResponseEntity<Webhook> update(
            @PathVariable Long projectId,
            @PathVariable Long webhookId,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String url = (String) body.get("url");
        String events = (String) body.get("events");
        Boolean active = body.containsKey("active") ? (Boolean) body.get("active") : null;
        String secret = (String) body.get("secret");
        Webhook updated = webhookService.update(webhookId, name, url, events, active, secret);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{webhookId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long projectId,
            @PathVariable Long webhookId) {
        webhookService.delete(webhookId);
        return ResponseEntity.noContent().build();
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(auth.getName()).getId();
    }
}
