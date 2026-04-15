package com.example.todo.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import com.example.todo.entity.AgentMessage;
import com.example.todo.entity.AgentMessageRole;
import com.example.todo.entity.AgentSession;
import com.example.todo.entity.AgentSessionStatus;
import com.example.todo.entity.Comment;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.AgentMessageRepository;
import com.example.todo.repository.AgentSessionRepository;
import com.example.todo.repository.TodoRepository;
import com.example.todo.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentChatService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String API_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 4096;
    private static final int MAX_TOOL_LOOPS = 5;
    private static final String BOT_PASSWORD_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final AgentSessionRepository sessionRepo;
    private final AgentMessageRepository messageRepo;
    private final TodoRepository todoRepo;
    private final UserRepository userRepo;
    private final CommentService commentService;
    private final ObjectMapper objectMapper;

    private final RestClient http = RestClient.create();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-sonnet-4-5}")
    private String model;

    @Transactional(readOnly = true)
    public List<AgentMessage> getMessages(Long todoId) {
        return sessionRepo
                .findFirstByTodoIdAndStatusOrderByCreatedAtDesc(todoId, AgentSessionStatus.ACTIVE)
                .map(s -> messageRepo.findBySessionIdOrderByCreatedAtAsc(s.getId()))
                .orElseGet(List::of);
    }

    @Transactional
    public AgentMessage sendMessage(Long todoId, String userText, String agentName) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY가 설정되지 않았습니다");
        }
        if (userText == null || userText.isBlank()) {
            throw new IllegalArgumentException("메시지가 비어있습니다");
        }
        Todo todo = todoRepo.findById(todoId)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + todoId));
        AgentSession session = getOrCreateSession(todo, agentName);

        appendMessage(session, AgentMessageRole.USER, userText, null, null, null);

        for (int loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
            JsonNode resp = callAnthropic(session, agentName, todo);
            JsonNode contentArray = resp.path("content");
            String stopReason = resp.path("stop_reason").asText("");

            for (JsonNode block : contentArray) {
                String type = block.path("type").asText();
                if ("text".equals(type)) {
                    appendMessage(session, AgentMessageRole.ASSISTANT,
                            block.path("text").asText(""), null, null, null);
                } else if ("tool_use".equals(type)) {
                    String toolUseId = block.path("id").asText();
                    String toolName = block.path("name").asText();
                    JsonNode input = block.path("input");
                    String inputJson = input.toString();
                    appendMessage(session, AgentMessageRole.TOOL_USE,
                            null, toolUseId, toolName, inputJson);

                    String result = executeTool(todo, agentName, toolName, input);
                    appendMessage(session, AgentMessageRole.TOOL_RESULT,
                            null, toolUseId, toolName, result);
                }
            }
            if (!"tool_use".equals(stopReason)) {
                break;
            }
        }

        return getLastAssistantMessage(session);
    }

    private AgentSession getOrCreateSession(Todo todo, String agentName) {
        return sessionRepo
                .findFirstByTodoIdAndStatusOrderByCreatedAtDesc(todo.getId(), AgentSessionStatus.ACTIVE)
                .orElseGet(() -> sessionRepo.save(AgentSession.builder()
                        .todo(todo)
                        .agentName(agentName == null || agentName.isBlank() ? "agent" : agentName)
                        .status(AgentSessionStatus.ACTIVE)
                        .build()));
    }

    private AgentMessage appendMessage(AgentSession session, AgentMessageRole role,
                                       String content, String toolUseId,
                                       String toolName, String toolJson) {
        return messageRepo.save(AgentMessage.builder()
                .session(session)
                .role(role)
                .content(content)
                .toolUseId(toolUseId)
                .toolName(toolName)
                .toolJson(toolJson)
                .build());
    }

    private AgentMessage getLastAssistantMessage(AgentSession session) {
        List<AgentMessage> all = messageRepo.findBySessionIdOrderByCreatedAtAsc(session.getId());
        for (int i = all.size() - 1; i >= 0; i--) {
            if (all.get(i).getRole() == AgentMessageRole.ASSISTANT) {
                return all.get(i);
            }
        }
        return all.isEmpty() ? null : all.get(all.size() - 1);
    }

    private JsonNode callAnthropic(AgentSession session, String agentName, Todo todo) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", MAX_TOKENS);
        body.put("system", buildSystemPrompt(agentName, todo));
        body.put("messages", buildMessageHistory(session));
        body.put("tools", buildToolDefinitions());

        try {
            String requestBody = objectMapper.writeValueAsString(body);
            String responseBody = http.post()
                    .uri(API_URL)
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", API_VERSION)
                    .header("content-type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(responseBody);
        } catch (Exception e) {
            log.error("Anthropic API call failed", e);
            throw new RuntimeException("Anthropic API 호출 실패: " + e.getMessage(), e);
        }
    }

    private String buildSystemPrompt(String agentName, Todo todo) {
        return String.format(
                "You are %s, an AI assistant working on todo #%d (%s).%n" +
                "Use tools to read the current state and post comments when meaningful.%n" +
                "Reply concisely in Korean. Do not invent facts beyond what tools return.%n" +
                "When the user asks 'what's the progress', call get_todo_info and list_recent_comments first.",
                agentName == null ? "agent" : agentName,
                todo.getId(),
                todo.getSummary() == null ? "" : todo.getSummary()
        );
    }

    private List<Map<String, Object>> buildMessageHistory(AgentSession session) {
        List<AgentMessage> all = messageRepo.findBySessionIdOrderByCreatedAtAsc(session.getId());
        List<Map<String, Object>> result = new ArrayList<>();

        Map<String, Object> currentTurn = null;
        String currentApiRole = null;
        List<Map<String, Object>> currentContent = null;

        for (AgentMessage m : all) {
            String apiRole;
            Map<String, Object> block = new LinkedHashMap<>();

            switch (m.getRole()) {
                case USER -> {
                    apiRole = "user";
                    block.put("type", "text");
                    block.put("text", m.getContent() == null ? "" : m.getContent());
                }
                case ASSISTANT -> {
                    apiRole = "assistant";
                    block.put("type", "text");
                    block.put("text", m.getContent() == null ? "" : m.getContent());
                }
                case TOOL_USE -> {
                    apiRole = "assistant";
                    block.put("type", "tool_use");
                    block.put("id", m.getToolUseId());
                    block.put("name", m.getToolName());
                    try {
                        block.put("input", m.getToolJson() == null
                                ? Map.of()
                                : objectMapper.readTree(m.getToolJson()));
                    } catch (Exception e) {
                        block.put("input", Map.of());
                    }
                }
                case TOOL_RESULT -> {
                    apiRole = "user";
                    block.put("type", "tool_result");
                    block.put("tool_use_id", m.getToolUseId());
                    block.put("content", m.getToolJson() == null ? "" : m.getToolJson());
                }
                default -> {
                    continue;
                }
            }

            if (currentApiRole == null || !currentApiRole.equals(apiRole)) {
                if (currentTurn != null) {
                    result.add(currentTurn);
                }
                currentTurn = new LinkedHashMap<>();
                currentApiRole = apiRole;
                currentContent = new ArrayList<>();
                currentTurn.put("role", apiRole);
                currentTurn.put("content", currentContent);
            }
            currentContent.add(block);
        }
        if (currentTurn != null) {
            result.add(currentTurn);
        }
        return result;
    }

    private List<Map<String, Object>> buildToolDefinitions() {
        return List.of(
                Map.of(
                        "name", "get_todo_info",
                        "description",
                        "Get the current todo's summary, description, status, priority. No input needed.",
                        "input_schema", Map.of(
                                "type", "object",
                                "properties", Map.of()
                        )
                ),
                Map.of(
                        "name", "list_recent_comments",
                        "description",
                        "List up to 10 most recent comments on this todo. No input needed.",
                        "input_schema", Map.of(
                                "type", "object",
                                "properties", Map.of()
                        )
                ),
                Map.of(
                        "name", "post_comment",
                        "description",
                        "Post a comment to this todo. Use to record findings or progress.",
                        "input_schema", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "content", Map.of(
                                                "type", "string",
                                                "description", "Comment text in Korean"
                                        )
                                ),
                                "required", List.of("content")
                        )
                )
        );
    }

    private String executeTool(Todo todo, String agentName, String toolName, JsonNode input) {
        try {
            return switch (toolName) {
                case "get_todo_info" -> {
                    Map<String, Object> info = new LinkedHashMap<>();
                    info.put("id", todo.getId());
                    info.put("summary", todo.getSummary());
                    info.put("description", todo.getDescription());
                    info.put("status", String.valueOf(todo.getStatus()));
                    info.put("priority", String.valueOf(todo.getPriority()));
                    yield objectMapper.writeValueAsString(info);
                }
                case "list_recent_comments" -> {
                    List<Comment> comments = commentService.getCommentsByTodo(todo.getId());
                    List<Map<String, Object>> simplified = comments.stream().limit(10).map(c -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", c.getId());
                        m.put("author", c.getAuthor() != null ? c.getAuthor().getDisplayName() : null);
                        m.put("content", c.getContent());
                        m.put("createdAt", String.valueOf(c.getCreatedAt()));
                        return m;
                    }).toList();
                    yield objectMapper.writeValueAsString(simplified);
                }
                case "post_comment" -> {
                    String content = input.path("content").asText("");
                    if (content.isBlank()) {
                        yield "{\"error\":\"content is required\"}";
                    }
                    User author = getOrCreateBotUser(agentName);
                    Comment c = commentService.createComment(todo.getId(), content, author);
                    yield "{\"ok\":true,\"commentId\":" + c.getId() + "}";
                }
                default -> "{\"error\":\"unknown tool: " + toolName + "\"}";
            };
        } catch (Exception e) {
            log.error("Tool execution failed: {}", toolName, e);
            return "{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}";
        }
    }

    private User getOrCreateBotUser(String agentName) {
        String safe = (agentName == null || agentName.isBlank() ? "agent" : agentName)
                .toLowerCase().replaceAll("[^a-z0-9_-]", "_");
        String username = "bot_" + safe;
        return userRepo.findByUsername(username).orElseGet(() ->
                userRepo.save(User.builder()
                        .username(username)
                        .displayName(agentName == null ? "agent" : agentName)
                        .password(BOT_PASSWORD_HASH)
                        .bot(true)
                        .build())
        );
    }
}
