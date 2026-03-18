package com.example.todo.service;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.User;
import com.example.todo.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(String username, String password, String displayName) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .displayName(displayName)
                .build();

        log.info("Registering new user: {}", username);
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
    }

    public User updateDisplayName(String username, String newDisplayName) {
        User user = findByUsername(username);
        user.setDisplayName(newDisplayName);
        log.info("Updated display name for user: {}", username);
        return userRepository.save(user);
    }

    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = findByUsername(username);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed for user: {}", username);
    }

    public User findOrCreateBot(String displayName) {
        String username = "bot_" + displayName.toLowerCase().replaceAll("[^a-z0-9_-]", "_");
        return userRepository.findByUsername(username)
                .orElseGet(() -> {
                    User bot = User.builder()
                            .username(username)
                            .displayName(displayName)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .bot(true)
                            .build();
                    log.info("Creating bot user: {} ({})", displayName, username);
                    return userRepository.save(bot);
                });
    }

    @Transactional(readOnly = true)
    public List<User> findAll() {
        return userRepository.findAll();
    }
}
