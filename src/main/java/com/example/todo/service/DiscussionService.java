package com.example.todo.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.config.SseEmitterRegistry;
import com.example.todo.entity.Comment;
import com.example.todo.entity.CommentType;
import com.example.todo.entity.Discussion;
import com.example.todo.entity.ProjectMember;
import com.example.todo.entity.ProjectRole;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.CommentRepository;
import com.example.todo.repository.DiscussionRepository;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.repository.TodoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DiscussionService {

    private static final String JITSI_BASE = "https://meet.jit.si/Kanban-Todo-";

    private final DiscussionRepository discussionRepository;
    private final CommentRepository commentRepository;
    private final TodoRepository todoRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final NotificationService notificationService;
    private final SseEmitterRegistry sseEmitterRegistry;

    public Discussion startDiscussion(Long todoId, User actor) {
        Todo todo = todoRepository.findById(todoId)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + todoId));
        assertProjectMember(todo, actor);

        discussionRepository.findFirstByTodo_IdAndEndedAtIsNull(todoId).ifPresent(existing -> {
            throw new IllegalStateException("이미 진행 중인 토론이 있습니다: discussion=" + existing.getId());
        });

        String shortUuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String roomUrl = JITSI_BASE + todoId + "-" + shortUuid;

        Discussion discussion = Discussion.builder()
                .todo(todo)
                .startedBy(actor)
                .startedAt(LocalDateTime.now())
                .roomUrl(roomUrl)
                .build();
        Discussion saved = discussionRepository.save(discussion);

        Comment system = Comment.builder()
                .todo(todo)
                .author(actor)
                .type(CommentType.SYSTEM)
                .discussionId(saved.getId())
                .content("토론이 시작되었습니다. 통화 룸: " + roomUrl)
                .build();
        commentRepository.save(system);

        Map<String, Object> evt = new HashMap<>();
        evt.put("todoId", todoId);
        evt.put("discussionId", saved.getId());
        evt.put("startedBy", actor.getId());
        evt.put("startedByName", actor.getDisplayName());
        evt.put("roomUrl", roomUrl);

        broadcastToProject(todo, "discussion_started", evt);
        notificationService.notifyDiscussionStarted(todo, actor);

        log.info("Discussion #{} started on todo #{} by {}", saved.getId(), todoId, actor.getUsername());
        return saved;
    }

    public Comment postChatMessage(Long discussionId, String content, User author) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new IllegalArgumentException("Discussion not found: " + discussionId));
        if (!discussion.isActive()) {
            throw new IllegalStateException("종료된 토론에는 메시지를 작성할 수 없습니다");
        }
        Todo todo = discussion.getTodo();
        assertProjectMember(todo, author);

        Comment message = Comment.builder()
                .todo(todo)
                .author(author)
                .type(CommentType.CHAT)
                .discussionId(discussionId)
                .content(content)
                .build();
        Comment saved = commentRepository.save(message);

        Map<String, Object> evt = new HashMap<>();
        evt.put("discussionId", discussionId);
        evt.put("todoId", todo.getId());
        evt.put("messageId", saved.getId());
        evt.put("authorId", author.getId());
        evt.put("authorName", author.getDisplayName());
        evt.put("content", content);
        evt.put("createdAt", saved.getCreatedAt());

        broadcastToProject(todo, "chat_message", evt);
        return saved;
    }

    public Discussion endDiscussion(Long discussionId, User actor) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new IllegalArgumentException("Discussion not found: " + discussionId));
        if (!discussion.isActive()) {
            return discussion;
        }
        Todo todo = discussion.getTodo();
        assertCanEnd(discussion, todo, actor);

        discussion.setEndedAt(LocalDateTime.now());
        Discussion saved = discussionRepository.save(discussion);

        Comment system = Comment.builder()
                .todo(todo)
                .author(actor)
                .type(CommentType.SYSTEM)
                .discussionId(saved.getId())
                .content(actor.getDisplayName() + "님이 토론을 종료했습니다.")
                .build();
        commentRepository.save(system);

        Map<String, Object> evt = new HashMap<>();
        evt.put("todoId", todo.getId());
        evt.put("discussionId", saved.getId());
        evt.put("endedAt", saved.getEndedAt());

        broadcastToProject(todo, "discussion_ended", evt);

        log.info("Discussion #{} ended by {}", discussionId, actor.getUsername());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Discussion> listByTodo(Long todoId, User viewer) {
        Todo todo = todoRepository.findById(todoId)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + todoId));
        assertProjectMember(todo, viewer);
        return discussionRepository.findByTodo_IdOrderByStartedAtDesc(todoId);
    }

    @Transactional(readOnly = true)
    public List<Comment> listMessages(Long discussionId, User viewer) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new IllegalArgumentException("Discussion not found: " + discussionId));
        assertProjectMember(discussion.getTodo(), viewer);
        return commentRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId);
    }

    private void assertProjectMember(Todo todo, User user) {
        if (todo.getProject() == null) return;
        if ("admin".equals(user.getUsername())) return;
        if (!projectMemberRepository.existsByProjectIdAndUserId(todo.getProject().getId(), user.getId())) {
            throw new SecurityException("프로젝트 멤버만 접근 가능합니다");
        }
    }

    private void assertCanEnd(Discussion discussion, Todo todo, User actor) {
        if (discussion.getStartedBy().getId().equals(actor.getId())) return;
        if ("admin".equals(actor.getUsername())) return;
        if (todo.getProject() == null) {
            throw new SecurityException("토론을 종료할 권한이 없습니다");
        }
        boolean isMaster = projectMemberRepository
                .findByProjectIdAndUserId(todo.getProject().getId(), actor.getId())
                .map(pm -> pm.getRole() == ProjectRole.MASTER)
                .orElse(false);
        if (!isMaster) {
            throw new SecurityException("토론 시작자 또는 프로젝트 마스터만 종료할 수 있습니다");
        }
    }

    private void broadcastToProject(Todo todo, String event, Object payload) {
        if (todo.getProject() == null) {
            sseEmitterRegistry.broadcast(event, payload);
            return;
        }
        List<ProjectMember> members = projectMemberRepository.findByProjectId(todo.getProject().getId());
        for (ProjectMember pm : members) {
            sseEmitterRegistry.sendToUser(pm.getUser().getId(), event, payload);
        }
    }
}
