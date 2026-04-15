package com.example.todo.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.AgentMessage;
import com.example.todo.service.AgentChatService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/todos/{todoId}/agent")
@RequiredArgsConstructor
public class AgentChatController {

    private final AgentChatService agentChatService;

    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable Long todoId) {
        List<AgentMessage> messages = agentChatService.getMessages(todoId);
        return ResponseEntity.ok(messages.stream().map(this::toView).toList());
    }

    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> send(@PathVariable Long todoId,
                                                    @RequestBody SendRequest req) {
        AgentMessage reply = agentChatService.sendMessage(
                todoId,
                req.message(),
                req.agentName() == null || req.agentName().isBlank() ? "agent" : req.agentName()
        );
        return ResponseEntity.ok(toView(reply));
    }

    private Map<String, Object> toView(AgentMessage m) {
        if (m == null) {
            return Map.of();
        }
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", m.getId());
        view.put("role", m.getRole().name());
        view.put("content", m.getContent());
        view.put("toolName", m.getToolName());
        view.put("toolUseId", m.getToolUseId());
        view.put("toolJson", m.getToolJson());
        view.put("createdAt", m.getCreatedAt());
        return view;
    }

    public record SendRequest(String message, String agentName) {}
}
