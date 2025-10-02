package com.example.diagramdesigner.controller;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Controller
public class SSEController {

    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public SSEController() {
        // Start heartbeat scheduler
        startHeartbeat();
    }

    @GetMapping("/stream")
    public SseEmitter stream() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((e) -> emitters.remove(emitter));

        emitters.add(emitter);

        // Send initial connection event
        try {
            Map<String, Object> initEvent = new HashMap<>();
            initEvent.put("event", "INIT");
            initEvent.put("timestamp", System.currentTimeMillis());
            initEvent.put("instanceId", UUID.randomUUID().toString());
            initEvent.put("message", "Connected to SSE stream");

            emitter.send(SseEmitter.event()
                .name("message")
                .data(initEvent, MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            emitters.remove(emitter);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    private void startHeartbeat() {
        scheduler.scheduleAtFixedRate(() -> {
            Map<String, Object> heartbeat = new HashMap<>();
            heartbeat.put("event", "HEARTBEAT");
            heartbeat.put("timestamp", System.currentTimeMillis());
            heartbeat.put("status", "ALIVE");
            heartbeat.put("message", "System heartbeat");
            heartbeat.put("uptime", getUptime());

            broadcastEvent("heartbeat", heartbeat);
        }, 0, 5, TimeUnit.SECONDS);
    }

    private void broadcastEvent(String eventName, Map<String, Object> data) {
        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                emitters.remove(emitter);
            }
        });
    }

    // Public method to send custom events
    public void sendEvent(String eventType, Map<String, Object> eventData) {
        Map<String, Object> event = new HashMap<>(eventData);
        event.put("event", eventType);
        event.put("timestamp", System.currentTimeMillis());

        broadcastEvent("message", event);
    }

    // Public method to send file processing events
    public void sendFileProcessedEvent(String app, String filename, int filesProcessed, int filesTotal) {
        Map<String, Object> event = new HashMap<>();
        event.put("event", "FILE_PROCESSED");
        event.put("app", app);
        event.put("filename", filename);
        event.put("filesProcessed", filesProcessed);
        event.put("filesTotal", filesTotal);
        event.put("timestamp", System.currentTimeMillis());

        broadcastEvent("message", event);
    }

    private String getUptime() {
        long uptimeMillis = System.currentTimeMillis() - startTime;
        long hours = TimeUnit.MILLISECONDS.toHours(uptimeMillis);
        long minutes = TimeUnit.MILLISECONDS.toMinutes(uptimeMillis) % 60;
        return String.format("%dh %dm", hours, minutes);
    }

    private static final long startTime = System.currentTimeMillis();
}