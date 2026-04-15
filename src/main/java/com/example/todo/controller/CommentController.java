package com.example.todo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.config.SseEmitterRegistry;
import com.example.todo.entity.ActivityType;
import com.example.todo.entity.Comment;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.entity.WebhookEvent;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.repository.UserRepository;
import com.example.todo.service.ActivityLogService;
import com.example.todo.service.CommentService;
import com.example.todo.service.NotificationService;
import com.example.todo.service.TodoService;
import com.example.todo.service.UserService;
import com.example.todo.service.WebhookService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/todos/{todoId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final UserService userService;
    private final TodoService todoService;
    private final NotificationService notificationService;
    private final SseEmitterRegistry sseEmitterRegistry;
    private final ActivityLogService activityLogService;
    private final WebhookService webhookService;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @GetMapping
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long todoId) {
        Todo todo = todoService.getTodo(todoId);
        User currentUser = getCurrentUser();
        if (todo.getProject() != null
                && !currentUser.getUsername().equals("admin")
                && !projectMemberRepository.existsByProjectIdAndUserId(todo.getProject().getId(), currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(commentService.getCommentsByTodo(todoId));
    }

    @PostMapping
    public ResponseEntity<Comment> createComment(
            @PathVariable Long todoId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        User currentUser = getCurrentUser();
        Comment created = commentService.createComment(todoId, content, currentUser);
        Todo todo = todoService.getTodo(todoId);
        notificationService.notifyCommentAdded(todo, currentUser);
        // 멘션 처리
        java.util.List<String> mentionedUsernames = parseMentions(content);
        if (!mentionedUsernames.isEmpty()) {
            java.util.List<User> mentionedUsers = mentionedUsernames.stream()
                    .map(username -> {
                        try { return userService.findByUsername(username); }
                        catch (Exception e) { return null; }
                    })
                    .filter(java.util.Objects::nonNull)
                    .toList();
            if (!mentionedUsers.isEmpty()) {
                notificationService.notifyMentioned(todo, mentionedUsers, currentUser);
            }
        }
        sseEmitterRegistry.broadcast("comment_changed", commentEvent("created", todoId));
        activityLogService.log(todo, currentUser, ActivityType.COMMENT_ADDED, "댓글 추가", null, null);
        if (todo.getProject() != null) {
            webhookService.fireEvent(WebhookEvent.COMMENT_ADDED, todo.getProject().getId(), Map.of("todoId", todoId, "commentId", created.getId(), "actor", currentUser.getUsername()));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<Comment> updateComment(
            @PathVariable Long todoId,
            @PathVariable Long commentId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        User currentUser = getCurrentUser();
        Comment updated = commentService.updateComment(todoId, commentId, content, currentUser);
        sseEmitterRegistry.broadcast("comment_changed", commentEvent("updated", todoId));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long todoId,
            @PathVariable Long commentId) {
        User currentUser = getCurrentUser();
        commentService.deleteComment(todoId, commentId, currentUser);
        Todo todo = todoService.getTodo(todoId);
        activityLogService.log(todo, currentUser, ActivityType.COMMENT_DELETED, "댓글 삭제", null, null);
        if (todo.getProject() != null) {
            webhookService.fireEvent(WebhookEvent.COMMENT_DELETED, todo.getProject().getId(), Map.of("todoId", todoId, "actor", currentUser.getUsername()));
        }
        sseEmitterRegistry.broadcast("comment_changed", commentEvent("deleted", todoId));
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> commentEvent(String action, Long todoId) {
        Map<String, Object> event = new HashMap<>();
        event.put("action", action);
        event.put("todoId", todoId);
        return event;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }

    private java.util.List<String> parseMentions(String content) {
        java.util.List<String> mentions = new java.util.ArrayList<>();
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("<<@(\\w+)>>").matcher(content);
        while (matcher.find()) {
            mentions.add(matcher.group(1));
        }
        return mentions;
    }
}
