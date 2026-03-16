package com.example.todo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.CommentRead;

public interface CommentReadRepository extends JpaRepository<CommentRead, Long> {

    @Query("SELECT c.todo.id, COUNT(c) FROM Comment c WHERE c.todo.id IN :todoIds " +
           "AND c.id NOT IN (SELECT cr.comment.id FROM CommentRead cr WHERE cr.user.id = :userId) " +
           "GROUP BY c.todo.id")
    List<Object[]> countUnreadByTodoIds(@Param("todoIds") List<Long> todoIds, @Param("userId") Long userId);

    @Query("SELECT c.id FROM Comment c WHERE c.todo.id = :todoId " +
           "AND c.id NOT IN (SELECT cr.comment.id FROM CommentRead cr WHERE cr.user.id = :userId)")
    List<Long> findUnreadCommentIdsByTodoId(@Param("todoId") Long todoId, @Param("userId") Long userId);

    @Modifying
    @Query(value = "INSERT INTO comment_reads (user_id, comment_id, read_at) " +
           "SELECT :userId, c.id, NOW() FROM comments c " +
           "WHERE c.todo_id = :todoId " +
           "ON CONFLICT (user_id, comment_id) DO UPDATE SET read_at = NOW()",
           nativeQuery = true)
    int bulkMarkAsRead(@Param("todoId") Long todoId, @Param("userId") Long userId);

    void deleteByCommentId(Long commentId);
}
