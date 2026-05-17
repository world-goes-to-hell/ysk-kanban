package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.Discussion;

public interface DiscussionRepository extends JpaRepository<Discussion, Long> {

    Optional<Discussion> findFirstByTodo_IdAndEndedAtIsNull(Long todoId);

    List<Discussion> findByTodo_IdOrderByStartedAtDesc(Long todoId);

    @Query("SELECT DISTINCT d.todo.id FROM Discussion d WHERE d.endedAt IS NULL AND d.todo.id IN :todoIds")
    List<Long> findActiveTodoIdsIn(@Param("todoIds") List<Long> todoIds);
}
