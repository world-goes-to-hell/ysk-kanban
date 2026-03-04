package com.example.todo.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.todo.entity.Attachment;
import com.example.todo.entity.Comment;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.AttachmentRepository;
import com.example.todo.repository.CommentRepository;
import com.example.todo.repository.TodoRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final TodoRepository todoRepository;
    private final CommentRepository commentRepository;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Attachment> getAttachmentsByTodo(Long todoId) {
        return attachmentRepository.findByTodoIdAndCommentIsNull(todoId);
    }

    public Attachment uploadFile(Long todoId, MultipartFile file, User uploadedBy) {
        Todo todo = todoRepository.findById(todoId)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + todoId));

        String projectDir = (todo.getProject() != null && todo.getProject().getProjectKey() != null)
                ? todo.getProject().getProjectKey()
                : "_default";
        String originalFilename = file.getOriginalFilename();
        String storedFilename = projectDir + "/" + UUID.randomUUID().toString() + getExtension(originalFilename);

        try {
            Path projectPath = uploadPath.resolve(projectDir);
            Files.createDirectories(projectPath);
            Path targetLocation = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store file: " + originalFilename, e);
        }

        Attachment attachment = Attachment.builder()
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .todo(todo)
                .uploadedBy(uploadedBy)
                .build();

        log.info("Uploading file '{}' to todo #{}", originalFilename, todoId);
        return attachmentRepository.save(attachment);
    }

    public Attachment uploadFileToComment(Long commentId, MultipartFile file, User uploadedBy) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found: " + commentId));

        Todo todo = comment.getTodo();
        String projectDir = (todo != null && todo.getProject() != null && todo.getProject().getProjectKey() != null)
                ? todo.getProject().getProjectKey()
                : "_default";
        String originalFilename = file.getOriginalFilename();
        String storedFilename = projectDir + "/" + UUID.randomUUID().toString() + getExtension(originalFilename);

        try {
            Path projectPath = uploadPath.resolve(projectDir);
            Files.createDirectories(projectPath);
            Path targetLocation = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store file: " + originalFilename, e);
        }

        Attachment attachment = Attachment.builder()
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .todo(todo)
                .comment(comment)
                .uploadedBy(uploadedBy)
                .build();

        log.info("Uploading file '{}' to comment #{}", originalFilename, commentId);
        return attachmentRepository.save(attachment);
    }

    @Transactional(readOnly = true)
    public List<Attachment> getAttachmentsByComment(Long commentId) {
        return attachmentRepository.findByCommentId(commentId);
    }

    @Transactional(readOnly = true)
    public Resource downloadFile(Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));

        try {
            Path filePath = uploadPath.resolve(attachment.getStoredFilename()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found: " + attachment.getOriginalFilename());
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not read file: " + attachment.getOriginalFilename(), e);
        }
    }

    @Transactional(readOnly = true)
    public Attachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));
    }

    public void deleteAttachment(Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));

        try {
            Path filePath = uploadPath.resolve(attachment.getStoredFilename()).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", attachment.getStoredFilename(), e);
        }

        log.info("Deleting attachment #{}: {}", attachmentId, attachment.getOriginalFilename());
        attachmentRepository.deleteById(attachmentId);
    }

    private String getExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }
}
