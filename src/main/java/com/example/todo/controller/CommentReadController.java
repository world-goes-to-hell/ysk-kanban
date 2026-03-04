package com.example.todo.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.User;
import com.example.todo.service.CommentReadService;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentReadController {

    private final CommentReadService commentReadService;
    private final UserService userService;

    @PostMapping("/todos/{todoId}/comments/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long todoId) {
        User currentUser = getCurrentUser();
        commentReadService.markAllAsRead(todoId, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/todos/unread-comments")
    public ResponseEntity<Map<Long, Long>> getUnreadCounts(@RequestParam String todoIds) {
        User currentUser = getCurrentUser();
        List<Long> ids = Arrays.stream(todoIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
        Map<Long, Long> counts = commentReadService.getUnreadCounts(ids, currentUser);
        return ResponseEntity.ok(counts);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }
}
