package com.example.todo.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class SchemaFixRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        dropEnumCheckConstraints("NOTIFICATIONS", "TYPE");
    }

    private void dropEnumCheckConstraints(String tableName, String columnName) {
        try {
            var constraints = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS " +
                "WHERE TABLE_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'",
                tableName
            );
            for (var row : constraints) {
                String constraintName = (String) row.get("CONSTRAINT_NAME");
                try {
                    jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP CONSTRAINT " + constraintName);
                    log.info("Dropped CHECK constraint {} on {}", constraintName, tableName);
                } catch (Exception e) {
                    log.debug("Could not drop constraint {}: {}", constraintName, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("Schema fix skipped (not H2 or table not found): {}", e.getMessage());
        }
    }
}
