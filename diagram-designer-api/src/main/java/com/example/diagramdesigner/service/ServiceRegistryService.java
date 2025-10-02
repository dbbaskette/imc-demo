package com.example.diagramdesigner.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class ServiceRegistryService {

    @Autowired
    private DiscoveryClient discoveryClient;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private final Map<String, ServiceStatus> serviceStatuses = new ConcurrentHashMap<>();

    // Service names as they appear in the service registry
    private static final List<String> RAG_SERVICES = Arrays.asList(
        "hdfswatcher", "textproc", "embedproc"
    );

    public ServiceRegistryService() {
        // Start health monitoring
        startHealthMonitoring();
    }

    public List<ServiceInfo> getAvailableServices() {
        List<ServiceInfo> services = new ArrayList<>();

        for (String serviceName : RAG_SERVICES) {
            List<ServiceInstance> instances = discoveryClient.getInstances(serviceName);
            if (!instances.isEmpty()) {
                ServiceInstance instance = instances.get(0);
                ServiceStatus status = serviceStatuses.get(serviceName);

                services.add(ServiceInfo.builder()
                    .name(serviceName)
                    .displayName(getDisplayName(serviceName))
                    .description(getDescription(serviceName))
                    .url(instance.getUri().toString())
                    .status(status != null ? status.getStatus() : "UNKNOWN")
                    .lastCheck(status != null ? status.getLastCheck() : null)
                    .build());
            }
        }

        return services;
    }

    public ServiceStatus getServiceStatus(String serviceName) {
        return serviceStatuses.get(serviceName);
    }

    public Map<String, Object> getServiceState(String serviceName) {
        try {
            String url = getServiceUrl(serviceName);
            if (url == null) return Map.of("error", "Service not found");

            ResponseEntity<Map> response = restTemplate.getForEntity(
                url + "/api/processing/state",
                Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody() != null ? response.getBody() : Map.of();
            }
        } catch (Exception e) {
            return Map.of("error", "Failed to get service state: " + e.getMessage());
        }
        return Map.of("error", "Failed to get service state");
    }

    public boolean startService(String serviceName) {
        try {
            String url = getServiceUrl(serviceName);
            if (url == null) return false;

            ResponseEntity<Map> response = restTemplate.postForEntity(
                url + "/api/processing/start",
                null,
                Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                updateServiceStatus(serviceName, "STARTED");
                return true;
            }
        } catch (Exception e) {
            // Log error
        }
        return false;
    }

    public boolean stopService(String serviceName) {
        try {
            String url = getServiceUrl(serviceName);
            if (url == null) return false;

            ResponseEntity<Map> response = restTemplate.postForEntity(
                url + "/api/processing/stop",
                null,
                Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                updateServiceStatus(serviceName, "STOPPED");
                return true;
            }
        } catch (Exception e) {
            // Log error
        }
        return false;
    }

    public boolean toggleService(String serviceName) {
        ServiceStatus currentStatus = serviceStatuses.get(serviceName);
        if (currentStatus != null && "STARTED".equals(currentStatus.getStatus())) {
            return stopService(serviceName);
        } else {
            return startService(serviceName);
        }
    }

    private void startHealthMonitoring() {
        scheduler.scheduleAtFixedRate(() -> {
            for (String serviceName : RAG_SERVICES) {
                checkServiceHealth(serviceName);
            }
        }, 0, 10, TimeUnit.SECONDS);
    }

    private void checkServiceHealth(String serviceName) {
        try {
            String url = getServiceUrl(serviceName);
            if (url == null) {
                updateServiceStatus(serviceName, "UNKNOWN");
                return;
            }

            ResponseEntity<Map> response = restTemplate.getForEntity(
                url + "/api/processing/state",
                Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> state = response.getBody();
                boolean enabled = Boolean.TRUE.equals(state.get("enabled")) ||
                               Boolean.TRUE.equals(state.get("processing"));
                updateServiceStatus(serviceName, enabled ? "STARTED" : "STOPPED");
            } else {
                updateServiceStatus(serviceName, "ERROR");
            }
        } catch (Exception e) {
            updateServiceStatus(serviceName, "ERROR");
        }
    }

    private void updateServiceStatus(String serviceName, String status) {
        serviceStatuses.put(serviceName, new ServiceStatus(status, new Date()));
    }

    private String getServiceUrl(String serviceName) {
        List<ServiceInstance> instances = discoveryClient.getInstances(serviceName);
        if (!instances.isEmpty()) {
            return instances.get(0).getUri().toString();
        }
        return null;
    }

    private String getDisplayName(String serviceName) {
        switch (serviceName) {
            case "hdfswatcher":
                return "HDFS Watcher";
            case "textproc":
                return "Text Processor";
            case "embedproc":
                return "Embed Processor";
            default:
                return serviceName;
        }
    }

    private String getDescription(String serviceName) {
        switch (serviceName) {
            case "hdfswatcher":
                return "Monitors HDFS for new files";
            case "textproc":
                return "Extracts text from documents";
            case "embedproc":
                return "Generates embeddings for text";
            default:
                return "Service " + serviceName;
        }
    }

    // Inner class for service status
    public static class ServiceStatus {
        private final String status;
        private final Date lastCheck;

        public ServiceStatus(String status, Date lastCheck) {
            this.status = status;
            this.lastCheck = lastCheck;
        }

        public String getStatus() {
            return status;
        }

        public Date getLastCheck() {
            return lastCheck;
        }
    }

    // Inner class for service info
    public static class ServiceInfo {
        private final String name;
        private final String displayName;
        private final String description;
        private final String url;
        private final String status;
        private final Date lastCheck;

        private ServiceInfo(String name, String displayName, String description,
                          String url, String status, Date lastCheck) {
            this.name = name;
            this.displayName = displayName;
            this.description = description;
            this.url = url;
            this.status = status;
            this.lastCheck = lastCheck;
        }

        public String getName() {
            return name;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getDescription() {
            return description;
        }

        public String getUrl() {
            return url;
        }

        public String getStatus() {
            return status;
        }

        public Date getLastCheck() {
            return lastCheck;
        }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private String name;
            private String displayName;
            private String description;
            private String url;
            private String status;
            private Date lastCheck;

            public Builder name(String name) {
                this.name = name;
                return this;
            }

            public Builder displayName(String displayName) {
                this.displayName = displayName;
                return this;
            }

            public Builder description(String description) {
                this.description = description;
                return this;
            }

            public Builder url(String url) {
                this.url = url;
                return this;
            }

            public Builder status(String status) {
                this.status = status;
                return this;
            }

            public Builder lastCheck(Date lastCheck) {
                this.lastCheck = lastCheck;
                return this;
            }

            public ServiceInfo build() {
                return new ServiceInfo(name, displayName, description, url, status, lastCheck);
            }
        }
    }
}