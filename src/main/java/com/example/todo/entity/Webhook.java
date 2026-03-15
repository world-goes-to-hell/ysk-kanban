package com.example.todo.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "webhooks")
public class Webhook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false)
    private Long createdBy;

    @Column(nullable = false, length = 500)
    private String events;  // Comma-separated WebhookEvent values

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    private String secret;

    private LocalDateTime lastTriggeredAt;

    private String lastResponseStatus;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public List<WebhookEvent> getEventList() {
        if (events == null || events.isEmpty()) return List.of();
        List<WebhookEvent> list = new ArrayList<>();
        for (String e : events.split(",")) {
            list.add(WebhookEvent.valueOf(e.trim()));
        }
        return list;
    }
}
