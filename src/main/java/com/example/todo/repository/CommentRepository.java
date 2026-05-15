package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c WHERE c.todo.id = :todoId AND c.type = com.example.todo.entity.CommentType.COMMENT ORDER BY c.createdAt DESC")
    List<Comment> findByTodoIdOrderByCreatedAtDesc(@Param("todoId") Long todoId);

    @Query("SELECT c FROM Comment c WHERE c.todo.id = :todoId AND c.type = com.example.todo.entity.CommentType.COMMENT")
    List<Comment> findByTodoId(@Param("todoId") Long todoId);

    List<Comment> findByDiscussionIdOrderByCreatedAtAsc(Long discussionId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.author JOIN FETCH c.todo " +
           "WHERE c.createdAt BETWEEN :start AND :end AND c.type = com.example.todo.entity.CommentType.COMMENT " +
           "ORDER BY c.todo.id, c.createdAt ASC")
    List<Comment> findByCreatedAtBetweenWithTodo(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
