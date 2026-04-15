package com.example.todo.entity;

import java.time.LocalDateTime;

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
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "agent_messages")
public class AgentMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AgentSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AgentMessageRole role;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    /** tool_use/tool_result 매칭용 ID (Anthropic API tool_use_id) */
    @Column(length = 64)
    private String toolUseId;

    /** tool_use 시 호출 도구 이름 */
    @Column(length = 64)
    private String toolName;

    /** tool_use input(JSON) 또는 tool_result content(JSON) */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String toolJson;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
