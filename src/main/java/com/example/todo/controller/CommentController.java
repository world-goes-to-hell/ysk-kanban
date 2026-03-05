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
import com.example.todo.entity.Comment;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.service.CommentService;
import com.example.todo.service.NotificationService;
import com.example.todo.service.TodoService;
import com.example.todo.service.UserService;

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

    @GetMapping
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long todoId) {
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
        sseEmitterRegistry.broadcast("comment_changed", commentEvent("created", todoId));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<Comment> updateComment(
            @PathVariable Long todoId,
            @PathVariable Long commentId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        User currentUser = getCurrentUser();
        Comment updated = commentService.updateComment(commentId, content, currentUser);
        sseEmitterRegistry.broadcast("comment_changed", commentEvent("updated", todoId));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long todoId,
            @PathVariable Long commentId) {
        User currentUser = getCurrentUser();
        commentService.deleteComment(commentId, currentUser);
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
}
