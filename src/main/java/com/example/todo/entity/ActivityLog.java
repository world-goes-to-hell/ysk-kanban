package com.example.todo.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long todoId;

    @Column(nullable = false)
    private String todoSummary;

    private Long projectId;

    private String projectName;

    @Column(nullable = false)
    private Long actorId;

    @Column(nullable = false)
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    @Column(length = 1000)
    private String detail;

    private String oldValue;

    private String newValue;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
