package com.example.todo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Comment;
import com.example.todo.entity.CommentRead;
import com.example.todo.entity.User;
import com.example.todo.repository.CommentReadRepository;
import com.example.todo.repository.CommentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CommentReadService {

    private final CommentReadRepository commentReadRepository;
    private final CommentRepository commentRepository;

    public void markAllAsRead(Long todoId, User user) {
        List<Long> unreadIds = commentReadRepository.findUnreadCommentIdsByTodoId(todoId, user.getId());
        int marked = 0;
        for (Long commentId : unreadIds) {
            if (!commentReadRepository.existsByUserIdAndCommentId(user.getId(), commentId)) {
                Comment comment = commentRepository.findById(commentId).orElse(null);
                if (comment != null) {
                    try {
                        CommentRead cr = CommentRead.builder()
                                .user(user)
                                .comment(comment)
                                .build();
                        commentReadRepository.save(cr);
                        commentReadRepository.flush();
                        marked++;
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        log.debug("Comment #{} already marked as read for user {}", commentId, user.getUsername());
                    }
                }
            }
        }
        log.info("Marked {} comments as read for todo #{} by user {}", marked, todoId, user.getUsername());
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getUnreadCounts(List<Long> todoIds, User user) {
        Map<Long, Long> result = new HashMap<>();
        if (todoIds == null || todoIds.isEmpty()) return result;

        List<Object[]> counts = commentReadRepository.countUnreadByTodoIds(todoIds, user.getId());
        for (Object[] row : counts) {
            Long todoId = (Long) row[0];
            Long count = (Long) row[1];
            result.put(todoId, count);
        }
        return result;
    }
}
