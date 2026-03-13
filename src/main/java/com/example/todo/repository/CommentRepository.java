package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByTodoIdOrderByCreatedAtDesc(Long todoId);

    List<Comment> findByTodoId(Long todoId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.author JOIN FETCH c.todo " +
           "WHERE c.createdAt BETWEEN :start AND :end " +
           "ORDER BY c.todo.id, c.createdAt ASC")
    List<Comment> findByCreatedAtBetweenWithTodo(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
