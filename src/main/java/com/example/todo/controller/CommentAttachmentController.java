package com.example.todo.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.todo.entity.Attachment;
import com.example.todo.entity.User;
import com.example.todo.service.AttachmentService;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/comments/{commentId}/attachments")
@RequiredArgsConstructor
public class CommentAttachmentController {

    private final AttachmentService attachmentService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Attachment>> getAttachments(@PathVariable Long commentId) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByComment(commentId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Attachment> uploadFile(
            @PathVariable Long commentId,
            @RequestParam("file") MultipartFile file) {
        User currentUser = getCurrentUser();
        Attachment attachment = attachmentService.uploadFileToComment(commentId, file, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(attachment);
    }

    @GetMapping("/{attachmentId}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long commentId,
            @PathVariable Long attachmentId) {
        Attachment attachment = attachmentService.getAttachment(attachmentId);
        Resource resource = attachmentService.downloadFile(attachmentId);

        String contentType = attachment.getContentType();
        String disposition = contentType != null && contentType.startsWith("image/")
                ? "inline; filename=\"" + attachment.getOriginalFilename() + "\""
                : "attachment; filename=\"" + attachment.getOriginalFilename() + "\"";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(resource);
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable Long commentId,
            @PathVariable Long attachmentId) {
        attachmentService.deleteAttachment(attachmentId);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }
}
