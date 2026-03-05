package com.example.todo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.User;
import com.example.todo.repository.CommentReadRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CommentReadService {

    private final CommentReadRepository commentReadRepository;

    public void markAllAsRead(Long todoId, User user) {
        int marked = commentReadRepository.bulkMarkAsRead(todoId, user.getId());
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
