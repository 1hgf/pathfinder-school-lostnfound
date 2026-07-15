package com.campus.module.lostfound.dto;

import com.campus.common.FlexibleLocalDateTimeDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 更新失物招领请求
 */
@Data
public class UpdateRequest {

    private String title;

    private String description;

    private String category;

    private String location;

    private Double locX;

    private Double locY;

    private List<String> imageUrls;

    private String contact;

    private String status; // OPEN/CLAIMED/CLOSED

    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime occurredAt;
}
