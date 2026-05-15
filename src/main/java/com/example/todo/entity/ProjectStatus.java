package com.example.todo.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "project_statuses",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "status_key"})
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProjectStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnore
    private Project project;

    @Column(name = "status_key", nullable = false, length = 80)
    private String statusKey;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 16)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "semantic_status", nullable = false)
    @Builder.Default
    private Todo.Status semanticStatus = Todo.Status.IN_PROGRESS;

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    @Column(name = "system_status", nullable = false)
    @Builder.Default
    private boolean systemStatus = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

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
}
