package com.example.todo.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.Priority;
import com.example.todo.entity.Project;
import com.example.todo.entity.Todo;
import com.example.todo.repository.ProjectRepository;
import com.example.todo.repository.TodoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TodoRepository todoRepository;
    private final ProjectRepository projectRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> dashboard = new LinkedHashMap<>();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        LocalDateTime yesterdayStart = todayStart.minusDays(1);

        // 통계 카드
        long totalProjects = projectRepository.count();
        long totalTodos = todoRepository.count();
        long todoCount = todoRepository.countByStatus(Todo.Status.TODO);
        long inProgressCount = todoRepository.countByStatus(Todo.Status.IN_PROGRESS);
        long doneCount = todoRepository.countByStatus(Todo.Status.DONE);

        dashboard.put("totalProjects", totalProjects);
        dashboard.put("totalTodos", totalTodos);
        dashboard.put("todoCount", todoCount);
        dashboard.put("inProgressCount", inProgressCount);
        dashboard.put("doneCount", doneCount);

        // 오늘 vs 어제 등록 수
        long todayCreatedCount = todoRepository.countByCreatedAtBetween(todayStart, todayEnd);
        long yesterdayCreatedCount = todoRepository.countByCreatedAtBetween(yesterdayStart, todayStart);
        dashboard.put("todayCreatedCount", todayCreatedCount);
        dashboard.put("yesterdayCreatedCount", yesterdayCreatedCount);

        // 오늘 vs 어제 완료 수
        long todayDoneCount = todoRepository.countByStatusAndUpdatedAtBetween(Todo.Status.DONE, todayStart, todayEnd);
        long yesterdayDoneCount = todoRepository.countByStatusAndUpdatedAtBetween(Todo.Status.DONE, yesterdayStart, todayStart);
        dashboard.put("todayDoneCount", todayDoneCount);
        dashboard.put("yesterdayDoneCount", yesterdayDoneCount);

        // 오늘 등록된 일감 목록
        List<Todo> todayCreated = todoRepository.findByCreatedAtBetween(todayStart, todayEnd);
        dashboard.put("todayCreated", todayCreated);

        // 오늘 처리된 일감 목록
        List<Todo> todayCompleted = todoRepository.findByStatusAndUpdatedAtBetween(Todo.Status.DONE, todayStart, todayEnd);
        dashboard.put("todayCompleted", todayCompleted);

        // 우선순위 분포
        List<Object[]> priorityDist = todoRepository.countByPriorityGroup();
        Map<String, Long> priorityMap = new LinkedHashMap<>();
        for (Object[] row : priorityDist) {
            priorityMap.put(((Priority) row[0]).name(), (Long) row[1]);
        }
        dashboard.put("priorityDistribution", priorityMap);

        // 프로젝트별 분포 (하위 프로젝트 일감을 최상위 프로젝트로 집계)
        List<Project> allProjects = projectRepository.findAllWithParent();
        Map<Long, Project> projectMap = allProjects.stream()
                .collect(Collectors.toMap(Project::getId, p -> p));

        List<Object[]> projectDist = todoRepository.countByProjectGroup();
        Map<Long, Object[]> rootAggregated = new LinkedHashMap<>();
        for (Object[] row : projectDist) {
            Long projectId = (Long) row[0];
            Long rootId = findRootId(projectId, projectMap);
            Project rootProject = projectMap.get(rootId);
            String rootName = rootProject != null ? rootProject.getName() : (String) row[1];

            if (rootAggregated.containsKey(rootId)) {
                Object[] existing = rootAggregated.get(rootId);
                existing[2] = (Long) existing[2] + (Long) row[2];
            } else {
                rootAggregated.put(rootId, new Object[]{rootId, rootName, row[2]});
            }
        }

        List<Map<String, Object>> projectList = new ArrayList<>();
        for (Object[] row : rootAggregated.values()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("projectId", row[0]);
            item.put("projectName", row[1]);
            item.put("count", row[2]);
            projectList.add(item);
        }
        dashboard.put("projectDistribution", projectList);

        return ResponseEntity.ok(dashboard);
    }

    private Long findRootId(Long projectId, Map<Long, Project> projectMap) {
        Project current = projectMap.get(projectId);
        while (current != null && current.getParent() != null) {
            current = projectMap.get(current.getParent().getId());
        }
        return current != null ? current.getId() : projectId;
    }
}
