package com.example.todo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todo.entity.Attachment;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByTodoId(Long todoId);

    List<Attachment> findByTodoIdAndCommentIsNull(Long todoId);

    List<Attachment> findByCommentId(Long commentId);
}
