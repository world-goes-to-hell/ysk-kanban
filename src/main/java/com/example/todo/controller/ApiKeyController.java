package com.example.todo.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.User;
import com.example.todo.service.ApiKeyService;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects/{projectId}/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createKey(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        String name = (String) body.getOrDefault("name", "API Key");

        LocalDateTime expiresAt = null;
        if (body.containsKey("expiresInDays") && body.get("expiresInDays") != null) {
            int days = ((Number) body.get("expiresInDays")).intValue();
            if (days > 0) {
                expiresAt = LocalDateTime.now().plusDays(days);
            }
        }

        ApiKeyService.ApiKeyCreateResult result = apiKeyService.createKey(currentUser, projectId, name, expiresAt);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", result.id(),
                "rawKey", result.rawKey(),
                "prefix", result.prefix(),
                "projectName", result.projectName()
        ));
    }

    @GetMapping
    public ResponseEntity<List<ApiKeyService.ApiKeyInfo>> listKeys(@PathVariable Long projectId) {
        return ResponseEntity.ok(apiKeyService.listKeys(projectId));
    }

    @DeleteMapping("/{keyId}")
    public ResponseEntity<Void> revokeKey(
            @PathVariable Long projectId,
            @PathVariable Long keyId) {
        User currentUser = getCurrentUser();
        apiKeyService.revokeKey(keyId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }
}
