package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todo.entity.AgentSession;
import com.example.todo.entity.AgentSessionStatus;

public interface AgentSessionRepository extends JpaRepository<AgentSession, Long> {

    List<AgentSession> findByTodoIdOrderByCreatedAtDesc(Long todoId);

    Optional<AgentSession> findFirstByTodoIdAndStatusOrderByCreatedAtDesc(Long todoId, AgentSessionStatus status);
}
