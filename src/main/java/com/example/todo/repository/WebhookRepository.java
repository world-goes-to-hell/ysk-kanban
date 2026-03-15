package com.example.todo.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.todo.entity.Webhook;

public interface WebhookRepository extends JpaRepository<Webhook, Long> {
    List<Webhook> findByProjectIdAndActiveTrue(Long projectId);
    List<Webhook> findByProjectId(Long projectId);
}
