package com.campus.module.lostfound.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 失物招领实体
 */
@Data
@TableName(value = "lost_found", autoResultMap = true)
public class LostFound {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String type; // LOST/FOUND

    private String title;

    private String description;

    private String category;

    private String location;

    private Double locX;

    private Double locY;

    private Long nearestNodeId;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> imageUrls;

    private String contact;

    private String status; // OPEN/CLAIMED/CLOSED

    private LocalDateTime occurredAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer isDeleted;
}
