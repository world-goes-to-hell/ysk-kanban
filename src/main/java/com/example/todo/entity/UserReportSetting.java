package com.example.todo.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_report_settings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "project_id"})
})
public class UserReportSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false)
    @Builder.Default
    private boolean excluded = false;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
