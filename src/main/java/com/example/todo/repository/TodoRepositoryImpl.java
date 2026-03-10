package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
            conditions.add("t.project.id = :projectId");
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
        if (projectId != null) query.setParameter("projectId", projectId);
        if (status != null) query.setParameter("status", status);

        return query.getResultList();
    }
}
