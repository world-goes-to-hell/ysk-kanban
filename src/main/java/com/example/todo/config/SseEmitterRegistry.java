package com.example.todo.config;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SseEmitterRegistry {

    private static final long SSE_TIMEOUT = 300_000L; // 5분
    private static final long HEARTBEAT_INTERVAL = 30L; // 30초

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final Map<Long, List<String>> userEmitters = new ConcurrentHashMap<>();
    private final Map<String, Long> emitterUsers = new ConcurrentHashMap<>();
    private ScheduledExecutorService heartbeatExecutor;

    @PostConstruct
    public void init() {
        heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "sse-heartbeat");
            t.setDaemon(true);
            return t;
        });
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, HEARTBEAT_INTERVAL, HEARTBEAT_INTERVAL, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void destroy() {
        if (heartbeatExecutor != null) heartbeatExecutor.shutdown();
    }

    private void sendHeartbeat() {
        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event().comment("heartbeat"));
            } catch (Exception e) {
                removeEmitter(id, "heartbeat 실패", e);
            }
        });
    }

    public SseEmitter register(Long userId) {
        String id = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        emitters.put(id, emitter);
        if (userId != null) {
            emitterUsers.put(id, userId);
            userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(id);
        }

        Runnable cleanup = () -> removeEmitter(id, "연결 종료", null);

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            removeEmitter(id, "초기 연결 이벤트 전송 실패", e);
        }

        log.debug("SSE 연결 등록: {} userId={} (활성: {})", id, userId, emitters.size());
        return emitter;
    }

    public void broadcast(String eventName, Object data) {
        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                removeEmitter(id, "이벤트 전송 실패", e);
            }
        });
    }

    public void sendToUser(Long userId, String eventName, Object data) {
        List<String> ids = userEmitters.get(userId);
        if (ids == null) return;
        for (String id : ids) {
            SseEmitter emitter = emitters.get(id);
            if (emitter == null) {
                removeEmitter(id, "누락된 사용자 연결 정리", null);
                continue;
            }
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                removeEmitter(id, "사용자 이벤트 전송 실패", e);
            }
        }
    }

    private void removeEmitter(String id, String reason, Exception cause) {
        SseEmitter emitter = emitters.remove(id);
        Long userId = emitterUsers.remove(id);
        if (userId != null) {
            List<String> ids = userEmitters.get(userId);
            if (ids != null) {
                ids.remove(id);
                if (ids.isEmpty()) userEmitters.remove(userId);
            }
        }

        if (emitter != null) {
            try {
                emitter.complete();
            } catch (Exception ignored) {
                // The response may already be closed by the client.
            }
        }

        if (cause != null && !isClientDisconnect(cause)) {
            log.warn("{}로 SSE 연결 제거: {} ({})", reason, id, cause.toString());
            return;
        }
        log.debug("{}로 SSE 연결 제거: {} (활성: {})", reason, id, emitters.size());
    }

    private boolean isClientDisconnect(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String className = current.getClass().getName();
            String message = current.getMessage();
            if (className.contains("ClientAbortException")
                    || className.contains("AsyncRequestNotUsableException")) {
                return true;
            }
            if (message != null) {
                String lower = message.toLowerCase();
                if (lower.contains("broken pipe")
                        || lower.contains("connection reset")
                        || lower.contains("connection aborted")
                        || lower.contains("clientabort")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }
}
