package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todo.entity.Discussion;

public interface DiscussionRepository extends JpaRepository<Discussion, Long> {

    Optional<Discussion> findFirstByTodo_IdAndEndedAtIsNull(Long todoId);

    List<Discussion> findByTodo_IdOrderByStartedAtDesc(Long todoId);
}
