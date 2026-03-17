package com.example.todo.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Priority;
import com.example.todo.entity.Project;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.repository.ProjectRepository;
import com.example.todo.repository.TodoRepository;
import com.example.todo.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TodoService {

    private final TodoRepository todoRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Todo> getAllTodos() {
        List<Todo> todos = todoRepository.findByParentIsNullOrderBySortOrderAscCreatedAtDesc();
        fillSubtaskCounts(todos);
        return todos;
    }

    @Transactional(readOnly = true)
    public List<Todo> getTodosByProject(Long projectId) {
        List<Todo> todos = todoRepository.findByProjectIdAndParentIsNullOrderBySortOrderAscCreatedAtDesc(projectId);
        fillSubtaskCounts(todos);
        return todos;
    }

    @Transactional(readOnly = true)
    public List<Todo> getTodosByProjectWithPermission(Long projectId, Long userId) {
        List<Long> projectIds = collectProjectIds(projectId);
        List<Long> accessibleIds = projectIds.stream()
                .filter(pid -> projectMemberRepository.existsByProjectIdAndUserId(pid, userId))
                .toList();
        if (accessibleIds.isEmpty()) {
            return List.of();
        }
        List<Todo> todos = todoRepository.findByProjectIdInAndParentIsNullOrderBySortOrderAscCreatedAtDesc(accessibleIds);
        fillSubtaskCounts(todos);
        return todos;
    }

    private List<Long> collectProjectIds(Long projectId) {
        List<Long> ids = new java.util.ArrayList<>();
        ids.add(projectId);
        collectChildIds(projectId, ids);
        return ids;
    }

    private void collectChildIds(Long parentId, List<Long> ids) {
        List<Long> childIds = projectRepository.findChildProjectIds(parentId);
        for (Long childId : childIds) {
            ids.add(childId);
            collectChildIds(childId, ids);
        }
    }

    @Transactional(readOnly = true)
    public List<Todo> findByFilters(LocalDateTime startDate, LocalDateTime endDate,
                                     Long assigneeId, Long createdById, Long projectId, Todo.Status status) {
        return todoRepository.findByFilters(startDate, endDate, assigneeId, createdById, projectId, status);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> findByFiltersWithPage(LocalDateTime startDate, LocalDateTime endDate,
                                                      Long assigneeId, Long createdById, Long projectId,
                                                      Todo.Status status, int page, int size) {
        return todoRepository.findByFiltersWithPage(startDate, endDate, assigneeId, createdById, projectId, status, page, size);
    }

    @Transactional(readOnly = true)
    public Todo getTodo(Long id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + id));
    }

    public Todo createTodo(String summary, String description, Priority priority, Long projectId, User createdBy, LocalDate dueDate, List<Long> assigneeIds) {
        Todo.TodoBuilder builder = Todo.builder()
                .summary(summary)
                .description(description)
                .createdBy(createdBy)
                .dueDate(dueDate);

        if (priority != null) {
            builder.priority(priority);
        }

        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
            builder.project(project);
        }

        if (assigneeIds != null && !assigneeIds.isEmpty()) {
            builder.assignees(userRepository.findAllById(assigneeIds));
        }

        Todo todo = builder.build();

        if (projectId != null) {
            Integer maxSortOrder = todoRepository.findMaxSortOrderByProjectIdAndStatus(projectId, todo.getStatus());
            todo.setSortOrder(maxSortOrder + 1);
        }

        log.info("Creating todo: {}", summary);
        return todoRepository.save(todo);
    }

    public Todo updateTodo(Long id, String summary, String description, Priority priority, Long projectId, LocalDate dueDate, List<Long> assigneeIds) {
        Todo todo = todoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + id));
        todo.setSummary(summary);
        todo.setDescription(description);

        if (priority != null) {
            todo.setPriority(priority);
        }

        todo.setDueDate(dueDate);

        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
            todo.setProject(project);
        }

        if (assigneeIds != null) {
            todo.setAssignees(userRepository.findAllById(assigneeIds));
        }

        log.info("Updating todo #{}: {}", id, summary);
        return todoRepository.save(todo);
    }

    public Todo changeStatus(Long id, Todo.Status status) {
        Todo todo = todoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + id));
        log.info("Changing todo #{} status: {} -> {}", id, todo.getStatus(), status);
        todo.setStatus(status);
        if (status == Todo.Status.DONE) {
            todo.setCompletedAt(java.time.LocalDateTime.now());
        } else {
            todo.setCompletedAt(null);
        }
        Todo saved = todoRepository.save(todo);

        // 하위 일감이 DONE이 되면 형제 전부 DONE인지 확인 → 상위도 자동 DONE
        if (status == Todo.Status.DONE && saved.getParent() != null) {
            autoCompleteParent(saved.getParent().getId());
        }

        return saved;
    }

    private void autoCompleteParent(Long parentId) {
        List<Todo> siblings = todoRepository.findByParentIdOrderBySortOrderAscCreatedAtDesc(parentId);
        boolean allDone = siblings.stream().allMatch(t -> t.getStatus() == Todo.Status.DONE);
        if (allDone) {
            Todo parent = todoRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent not found: " + parentId));
            if (parent.getStatus() != Todo.Status.DONE) {
                log.info("Auto-completing parent todo #{} (all subtasks done)", parentId);
                parent.setStatus(Todo.Status.DONE);
                parent.setCompletedAt(java.time.LocalDateTime.now());
                todoRepository.save(parent);
            }
        }
    }

    public Todo createSubtask(Long parentId, String summary, String description, Priority priority, User createdBy, LocalDate dueDate, List<Long> assigneeIds) {
        Todo parent = todoRepository.findById(parentId)
                .orElseThrow(() -> new IllegalArgumentException("Parent todo not found: " + parentId));
        if (parent.getParent() != null) {
            throw new IllegalStateException("하위 일감은 1단계까지만 허용됩니다.");
        }

        Todo.TodoBuilder builder = Todo.builder()
                .summary(summary)
                .description(description)
                .createdBy(createdBy)
                .dueDate(dueDate)
                .parent(parent)
                .project(parent.getProject());

        if (priority != null) {
            builder.priority(priority);
        }

        if (assigneeIds != null && !assigneeIds.isEmpty()) {
            builder.assignees(userRepository.findAllById(assigneeIds));
        }

        Todo subtask = builder.build();

        Long projectId = parent.getProject() != null ? parent.getProject().getId() : null;
        if (projectId != null) {
            Integer maxSortOrder = todoRepository.findMaxSortOrderByProjectIdAndStatus(projectId, subtask.getStatus());
            subtask.setSortOrder(maxSortOrder + 1);
        }

        log.info("Creating subtask under #{}: {}", parentId, summary);
        return todoRepository.save(subtask);
    }

    @Transactional(readOnly = true)
    public List<Todo> getSubtasks(Long parentId) {
        return todoRepository.findByParentIdOrderBySortOrderAscCreatedAtDesc(parentId);
    }

    private void fillSubtaskCounts(List<Todo> todos) {
        List<Long> parentIds = todos.stream().map(Todo::getId).toList();
        if (parentIds.isEmpty()) return;

        List<Object[]> counts = todoRepository.countSubtasksByParentIds(parentIds);
        // Map<parentId, int[]{total, done}>
        java.util.Map<Long, int[]> countMap = new java.util.HashMap<>();
        for (Object[] row : counts) {
            Long pid = (Long) row[0];
            Todo.Status st = (Todo.Status) row[1];
            long cnt = (Long) row[2];
            int[] arr = countMap.computeIfAbsent(pid, k -> new int[]{0, 0});
            arr[0] += (int) cnt;
            if (st == Todo.Status.DONE) {
                arr[1] += (int) cnt;
            }
        }

        for (Todo todo : todos) {
            int[] arr = countMap.get(todo.getId());
            if (arr != null) {
                todo.setSubtaskTotal(arr[0]);
                todo.setSubtaskDone(arr[1]);
            }
        }
    }

    public void reorderTodos(List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            Todo todo = todoRepository.findById(orderedIds.get(i))
                    .orElseThrow(() -> new IllegalArgumentException("Todo not found"));
            todo.setSortOrder(i);
            todoRepository.save(todo);
        }
        log.info("Reordered {} todos", orderedIds.size());
    }

    public void deleteTodo(Long id) {
        log.info("Deleting todo #{}", id);
        todoRepository.deleteById(id);
    }
}
