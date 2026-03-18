package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.Todo;

public interface TodoRepository extends JpaRepository<Todo, Long>, TodoRepositoryCustom {

    List<Todo> findAllByOrderBySortOrderAscCreatedAtDesc();

    List<Todo> findByParentIsNullOrderBySortOrderAscCreatedAtDesc();

    List<Todo> findByProjectIdOrderBySortOrderAscCreatedAtDesc(Long projectId);

    List<Todo> findByProjectIdAndParentIsNullOrderBySortOrderAscCreatedAtDesc(Long projectId);

    @Query("SELECT t FROM Todo t WHERE t.project.id IN :projectIds ORDER BY t.sortOrder ASC, t.createdAt DESC")
    List<Todo> findByProjectIdInOrderBySortOrderAscCreatedAtDesc(@Param("projectIds") List<Long> projectIds);

    @Query("SELECT t FROM Todo t WHERE t.project.id IN :projectIds AND t.parent IS NULL ORDER BY t.sortOrder ASC, t.createdAt DESC")
    List<Todo> findByProjectIdInAndParentIsNullOrderBySortOrderAscCreatedAtDesc(@Param("projectIds") List<Long> projectIds);

    List<Todo> findByParent_IdOrderBySortOrderAscCreatedAtDesc(Long parentId);

    long countByParent_Id(Long parentId);

    @Query("SELECT t.parent.id, t.status, COUNT(t) FROM Todo t WHERE t.parent.id IN :parentIds GROUP BY t.parent.id, t.status")
    List<Object[]> countSubtasksByParentIds(@Param("parentIds") List<Long> parentIds);

    List<Todo> findByProjectId(Long projectId);

    @Query("SELECT COALESCE(MAX(t.sortOrder), 0) FROM Todo t WHERE t.project.id = :projectId AND t.status = :status")
    Integer findMaxSortOrderByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") Todo.Status status);

    long countByStatus(Todo.Status status);

    List<Todo> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Todo> findByStatusAndUpdatedAtBetween(Todo.Status status, LocalDateTime start, LocalDateTime end);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByStatusAndCreatedAtBetween(Todo.Status status, LocalDateTime start, LocalDateTime end);

    long countByStatusAndUpdatedAtBetween(Todo.Status status, LocalDateTime start, LocalDateTime end);

    @Query("SELECT t.priority, COUNT(t) FROM Todo t GROUP BY t.priority")
    List<Object[]> countByPriorityGroup();

    @Query("SELECT t.project.id, t.project.name, COUNT(t) FROM Todo t WHERE t.project IS NOT NULL GROUP BY t.project.id, t.project.name")
    List<Object[]> countByProjectGroup();
}
