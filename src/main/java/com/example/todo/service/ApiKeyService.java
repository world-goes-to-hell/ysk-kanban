package com.example.todo.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.ApiKey;
import com.example.todo.entity.Project;
import com.example.todo.entity.User;
import com.example.todo.repository.ApiKeyRepository;
import com.example.todo.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public ApiKeyCreateResult createKey(User user, Long projectId, String name, LocalDateTime expiresAt) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));

        String rawKey = "ak_" + generateSecureRandom(40);
        String hash = passwordEncoder.encode(rawKey);
        String prefix = rawKey.substring(0, 8);

        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .project(project)
                .keyHash(hash)
                .keyPrefix(prefix)
                .name(name)
                .expiresAt(expiresAt)
                .build();

        apiKeyRepository.save(apiKey);

        return new ApiKeyCreateResult(apiKey.getId(), rawKey, prefix, project.getName());
    }

    @Transactional
    public Optional<ApiKeyValidation> validateKey(String rawKey) {
        List<ApiKey> activeKeys = apiKeyRepository.findAllActive();

        for (ApiKey ak : activeKeys) {
            if (passwordEncoder.matches(rawKey, ak.getKeyHash())) {
                ak.setLastUsedAt(LocalDateTime.now());
                apiKeyRepository.save(ak);
                return Optional.of(new ApiKeyValidation(ak.getUser(), ak.getProject().getId()));
            }
        }
        return Optional.empty();
    }

    @Transactional
    public void revokeKey(Long keyId, Long userId) {
        ApiKey apiKey = apiKeyRepository.findByIdAndUserId(keyId, userId)
                .orElseThrow(() -> new IllegalArgumentException("API Key를 찾을 수 없습니다."));
        apiKey.setRevoked(true);
        apiKeyRepository.save(apiKey);
    }

    @Transactional(readOnly = true)
    public List<ApiKeyInfo> listKeys(Long projectId) {
        return apiKeyRepository.findByProjectIdAndRevokedFalse(projectId).stream()
                .map(ak -> new ApiKeyInfo(
                        ak.getId(),
                        ak.getKeyPrefix(),
                        ak.getName(),
                        ak.getLastUsedAt(),
                        ak.getCreatedAt(),
                        ak.getExpiresAt(),
                        ak.getUser().getDisplayName()))
                .toList();
    }

    private String generateSecureRandom(int length) {
        byte[] bytes = new byte[length];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).substring(0, length);
    }

    public record ApiKeyCreateResult(Long id, String rawKey, String prefix, String projectName) {}

    public record ApiKeyValidation(User user, Long projectId) {}

    public record ApiKeyInfo(
            Long id, String prefix, String name,
            LocalDateTime lastUsedAt, LocalDateTime createdAt, LocalDateTime expiresAt,
            String createdByName) {}
}
