package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.todo.entity.ApiKey;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    List<ApiKey> findByProjectIdAndRevokedFalse(Long projectId);

    @Query("SELECT ak FROM ApiKey ak JOIN FETCH ak.user JOIN FETCH ak.project " +
           "WHERE ak.revoked = false " +
           "AND (ak.expiresAt IS NULL OR ak.expiresAt > CURRENT_TIMESTAMP)")
    List<ApiKey> findAllActive();

    Optional<ApiKey> findByIdAndUserId(Long id, Long userId);
}
