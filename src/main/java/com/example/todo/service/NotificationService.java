package com.example.todo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.config.SseEmitterRegistry;
import com.example.todo.entity.Notification;
import com.example.todo.entity.NotificationType;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SseEmitterRegistry sseEmitterRegistry;

    private String projectPrefix(Todo todo) {
        if (todo.getProject() == null) return "";
        String name = todo.getProject().getName();
        if (name == null || name.isEmpty()) name = todo.getProject().getProjectKey();
        return "[" + name + "] ";
    }

    public void notifyAssigned(Todo todo, List<User> newAssignees, User actor) {
        String prefix = projectPrefix(todo);
        for (User assignee : newAssignees) {
            if (assignee.getId().equals(actor.getId())) continue;
            String message = prefix + actor.getDisplayName() + "님이 [" + todo.getSummary() + "]에 담당자로 지정했습니다.";
            createAndPush(assignee.getId(), NotificationType.ASSIGNED, message, todo.getId());
        }
    }

    public void notifyCommentAdded(Todo todo, User commenter) {
        String prefix = projectPrefix(todo);
        java.util.Set<Long> notified = new java.util.HashSet<>();
        if (todo.getAssignees() != null) {
            for (User assignee : todo.getAssignees()) {
                if (assignee.getId().equals(commenter.getId())) continue;
                String message = prefix + commenter.getDisplayName() + "님이 [" + todo.getSummary() + "]에 댓글을 남겼습니다.";
                createAndPush(assignee.getId(), NotificationType.COMMENT_ADDED, message, todo.getId());
                notified.add(assignee.getId());
            }
        }
        if (todo.getCreatedBy() != null
                && !todo.getCreatedBy().getId().equals(commenter.getId())
                && !notified.contains(todo.getCreatedBy().getId())) {
            String message = prefix + commenter.getDisplayName() + "님이 [" + todo.getSummary() + "]에 댓글을 남겼습니다.";
            createAndPush(todo.getCreatedBy().getId(), NotificationType.COMMENT_ADDED, message, todo.getId());
        }
    }

    public void notifyStatusChanged(Todo todo, String oldStatus, String newStatus, User actor) {
        String prefix = projectPrefix(todo);
        java.util.Set<Long> notified = new java.util.HashSet<>();
        if (todo.getAssignees() != null) {
            for (User assignee : todo.getAssignees()) {
                if (assignee.getId().equals(actor.getId())) continue;
                String message = prefix + actor.getDisplayName() + "님이 [" + todo.getSummary() + "] 상태를 " + oldStatus + " → " + newStatus + "로 변경했습니다.";
                createAndPush(assignee.getId(), NotificationType.STATUS_CHANGED, message, todo.getId());
                notified.add(assignee.getId());
            }
        }
        if (todo.getCreatedBy() != null
                && !todo.getCreatedBy().getId().equals(actor.getId())
                && !notified.contains(todo.getCreatedBy().getId())) {
            String message = prefix + actor.getDisplayName() + "님이 [" + todo.getSummary() + "] 상태를 " + oldStatus + " → " + newStatus + "로 변경했습니다.";
            createAndPush(todo.getCreatedBy().getId(), NotificationType.STATUS_CHANGED, message, todo.getId());
        }
    }

    public void notifyMentioned(Todo todo, List<User> mentionedUsers, User commenter) {
        String prefix = projectPrefix(todo);
        for (User user : mentionedUsers) {
            if (user.getId().equals(commenter.getId())) continue;
            String message = prefix + commenter.getDisplayName() + "님이 [" + todo.getSummary() + "] 댓글에서 회원님을 언급했습니다.";
            createAndPush(user.getId(), NotificationType.MENTIONED, message, todo.getId());
        }
    }

    private void createAndPush(Long userId, NotificationType type, String message, Long todoId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .todoId(todoId)
                .build();
        notificationRepository.save(notification);
        log.info("Notification created for user {}: {}", userId, message);

        Map<String, Object> event = new HashMap<>();
        event.put("id", notification.getId());
        event.put("type", type.name());
        event.put("message", message);
        event.put("todoId", todoId);
        event.put("createdAt", notification.getCreatedAt());
        sseEmitterRegistry.sendToUser(userId, "notification", event);
    }

    @Transactional(readOnly = true)
    public List<Notification> getByUserId(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }
}
