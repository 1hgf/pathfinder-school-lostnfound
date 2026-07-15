package com.campus.module.lostfound.dto;

import com.campus.common.FlexibleLocalDateTimeDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;
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

    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime occurredAt;
}
