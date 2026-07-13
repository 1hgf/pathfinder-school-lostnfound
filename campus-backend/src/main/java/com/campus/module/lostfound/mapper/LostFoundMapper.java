package com.campus.module.lostfound.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.campus.module.lostfound.entity.LostFound;
import org.apache.ibatis.annotations.Mapper;

/**
 * 失物招领 Mapper
 */
@Mapper
public interface LostFoundMapper extends BaseMapper<LostFound> {
}
