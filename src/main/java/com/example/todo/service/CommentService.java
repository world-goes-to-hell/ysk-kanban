package com.example.todo.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Comment;
import com.example.todo.entity.CommentRead;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.CommentReadRepository;
import com.example.todo.repository.CommentRepository;
import com.example.todo.repository.TodoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentReadRepository commentReadRepository;
    private final TodoRepository todoRepository;

    @Transactional(readOnly = true)
    public List<Comment> getCommentsByTodo(Long todoId) {
        return commentRepository.findByTodoIdOrderByCreatedAtDesc(todoId);
    }

    public Comment createComment(Long todoId, String content, User author) {
        Todo todo = todoRepository.findById(todoId)
                .orElseThrow(() -> new IllegalArgumentException("Todo not found: " + todoId));

        Comment comment = Comment.builder()
                .content(content)
                .todo(todo)
                .author(author)
                .build();

        log.info("Creating comment on todo #{} by {}", todoId, author.getUsername());
        Comment saved = commentRepository.save(comment);

        // 작성자 본인은 자동으로 읽음 처리
        CommentRead cr = CommentRead.builder()
                .user(author)
                .comment(saved)
                .build();
        commentReadRepository.save(cr);

        return saved;
    }

    public Comment updateComment(Long commentId, String content, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found: " + commentId));

        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You can only edit your own comments");
        }

        comment.setContent(content);
        log.info("Updating comment #{}", commentId);
        return commentRepository.save(comment);
    }

    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found: " + commentId));

        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You can only delete your own comments");
        }

        log.info("Deleting comment #{}", commentId);
        commentRepository.deleteById(commentId);
    }
}
