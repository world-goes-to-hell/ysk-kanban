package com.example.todo.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Priority;
import com.example.todo.entity.Project;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
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
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Todo> getAllTodos() {
        return todoRepository.findAllByOrderBySortOrderAscCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Todo> getTodosByProject(Long projectId) {
        return todoRepository.findByProjectIdOrderBySortOrderAscCreatedAtDesc(projectId);
    }

    @Transactional(readOnly = true)
    public List<Todo> findByFilters(LocalDateTime startDate, LocalDateTime endDate,
                                     Long assigneeId, Long createdById, Long projectId, Todo.Status status) {
        return todoRepository.findByFilters(startDate, endDate, assigneeId, createdById, projectId, status);
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
        return todoRepository.save(todo);
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
