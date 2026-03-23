package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.example.todo.entity.Project;
import com.example.todo.entity.Todo;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;

public class TodoRepositoryImpl implements TodoRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Todo> findByFilters(
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long assigneeId,
            Long createdById,
            Long projectId,
            Todo.Status status
    ) {
        StringBuilder jpql = new StringBuilder("SELECT DISTINCT t FROM Todo t");
        List<String> conditions = new ArrayList<>();

        if (assigneeId != null) {
            jpql.append(" JOIN t.assignees a");
            conditions.add("a.id = :assigneeId");
        }

        conditions.add("t.parent IS NULL");

        if (startDate != null) {
            conditions.add("t.createdAt >= :startDate");
        }
        if (endDate != null) {
            conditions.add("t.createdAt <= :endDate");
        }
        if (createdById != null) {
            conditions.add("t.createdBy.id = :createdById");
        }
        if (projectId != null) {
            List<Long> projectIds = collectProjectIds(projectId);
            conditions.add("t.project.id IN :projectIds");
        }
        if (status != null) {
            conditions.add("t.status = :status");
        }

        if (!conditions.isEmpty()) {
            jpql.append(" WHERE ").append(String.join(" AND ", conditions));
        }

        jpql.append(" ORDER BY t.createdAt DESC");

        TypedQuery<Todo> query = em.createQuery(jpql.toString(), Todo.class);

        if (assigneeId != null) query.setParameter("assigneeId", assigneeId);
        if (startDate != null) query.setParameter("startDate", startDate);
        if (endDate != null) query.setParameter("endDate", endDate);
        if (createdById != null) query.setParameter("createdById", createdById);
        if (projectId != null) query.setParameter("projectIds", collectProjectIds(projectId));
        if (status != null) query.setParameter("status", status);

        return query.getResultList();
    }

    @Override
    public Map<String, Object> findByFiltersWithPage(
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long assigneeId,
            Long createdById,
            Long projectId,
            Todo.Status status,
            String dateField,
            int page,
            int size
    ) {
        String dateCol = "updatedAt".equals(dateField) ? "t.updatedAt" : "t.createdAt";
        StringBuilder baseJpql = new StringBuilder();
        StringBuilder countJpql = new StringBuilder();
        List<String> conditions = new ArrayList<>();

        baseJpql.append("SELECT DISTINCT t FROM Todo t");
        countJpql.append("SELECT COUNT(DISTINCT t) FROM Todo t");

        if (assigneeId != null) {
            baseJpql.append(" JOIN t.assignees a");
            countJpql.append(" JOIN t.assignees a");
            conditions.add("a.id = :assigneeId");
        }

        conditions.add("t.parent IS NULL");

        if (startDate != null) conditions.add(dateCol + " >= :startDate");
        if (endDate != null) conditions.add(dateCol + " <= :endDate");
        if (createdById != null) conditions.add("t.createdBy.id = :createdById");
        if (projectId != null) {
            List<Long> projectIds = collectProjectIds(projectId);
            conditions.add("t.project.id IN :projectIds");
        }
        if (status != null) conditions.add("t.status = :status");

        if (!conditions.isEmpty()) {
            String where = " WHERE " + String.join(" AND ", conditions);
            baseJpql.append(where);
            countJpql.append(where);
        }

        baseJpql.append(" ORDER BY t.createdAt DESC");

        // Count query
        TypedQuery<Long> cq = em.createQuery(countJpql.toString(), Long.class);
        setFilterParams(cq, startDate, endDate, assigneeId, createdById, projectId, status);
        long totalElements = cq.getSingleResult();

        // Data query with pagination
        TypedQuery<Todo> dq = em.createQuery(baseJpql.toString(), Todo.class);
        setFilterParams(dq, startDate, endDate, assigneeId, createdById, projectId, status);
        dq.setFirstResult(page * size);
        dq.setMaxResults(size);
        List<Todo> content = dq.getResultList();

        int totalPages = (int) Math.ceil((double) totalElements / size);

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    private void setFilterParams(TypedQuery<?> query,
                                  LocalDateTime startDate, LocalDateTime endDate,
                                  Long assigneeId, Long createdById,
                                  Long projectId, Todo.Status status) {
        if (assigneeId != null) query.setParameter("assigneeId", assigneeId);
        if (startDate != null) query.setParameter("startDate", startDate);
        if (endDate != null) query.setParameter("endDate", endDate);
        if (createdById != null) query.setParameter("createdById", createdById);
        if (projectId != null) query.setParameter("projectIds", collectProjectIds(projectId));
        if (status != null) query.setParameter("status", status);
    }

    private List<Long> collectProjectIds(Long projectId) {
        List<Long> ids = new ArrayList<>();
        ids.add(projectId);
        collectChildIds(projectId, ids);
        return ids;
    }

    private void collectChildIds(Long parentId, List<Long> ids) {
        List<Project> children = em.createQuery(
                "SELECT p FROM Project p WHERE p.parent.id = :parentId", Project.class)
                .setParameter("parentId", parentId)
                .getResultList();
        for (Project child : children) {
            ids.add(child.getId());
            collectChildIds(child.getId(), ids);
        }
    }
}
