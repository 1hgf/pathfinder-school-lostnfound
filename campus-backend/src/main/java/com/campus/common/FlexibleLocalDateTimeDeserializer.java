package com.campus.common;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 兼容日期(yyyy-MM-dd)与日期时间(yyyy-MM-ddTHH:mm:ss)的反序列化器。
 * 前端 &lt;input type="date"&gt; 只传纯日期，此处补足为当天 00:00:00。
 */
public class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.isBlank()) {
            return null;
        }
        text = text.trim();
        // 纯日期 yyyy-MM-dd → 当天零点
        if (text.length() == 10) {
            return LocalDate.parse(text).atStartOfDay();
        }
        // ISO 日期时间
        return LocalDateTime.parse(text);
    }
}
