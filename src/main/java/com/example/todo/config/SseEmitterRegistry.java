package com.example.todo.config;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SseEmitterRegistry {

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final Map<Long, List<String>> userEmitters = new ConcurrentHashMap<>();

    public SseEmitter register(Long userId) {
        String id = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(0L);

        emitters.put(id, emitter);
        if (userId != null) {
            userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(id);
        }

        Runnable cleanup = () -> {
            emitters.remove(id);
            if (userId != null) {
                List<String> ids = userEmitters.get(userId);
                if (ids != null) {
                    ids.remove(id);
                    if (ids.isEmpty()) userEmitters.remove(userId);
                }
            }
            log.debug("SSE 연결 종료: {} (활성: {})", id, emitters.size());
        };

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            cleanup.run();
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
            } catch (IOException e) {
                emitters.remove(id);
                log.debug("SSE 전송 실패로 연결 제거: {}", id);
            }
        });
    }

    public void sendToUser(Long userId, String eventName, Object data) {
        List<String> ids = userEmitters.get(userId);
        if (ids == null) return;
        for (String id : ids) {
            SseEmitter emitter = emitters.get(id);
            if (emitter == null) continue;
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                emitters.remove(id);
                ids.remove(id);
                log.debug("SSE 전송 실패로 연결 제거: {}", id);
            }
        }
    }
}
