package com.campus.module.lostfound.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 发布失物招领请求
 */
@Data
public class PublishRequest {

    @NotBlank(message = "类型不能为空")
    private String type; // LOST/FOUND

    @NotBlank(message = "标题不能为空")
    private String title;

    private String description;

    @NotBlank(message = "分类不能为空")
    private String category;

    private String location;

    private Double locX;

    private Double locY;

    private List<String> imageUrls;

    @NotBlank(message = "联系方式不能为空")
    private String contact;

    private LocalDateTime occurredAt;
}
