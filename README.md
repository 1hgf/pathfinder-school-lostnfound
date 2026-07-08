# 校园寻路与失物招领系统

基于 Canvas 地图的校园导航 + 失物招领平台。前后端分离，Vue 3 + Spring Boot 3 + MySQL 8。

> 详细设计见 [《校园寻路与失物招领系统 — 设计文档》](./校园寻路与失物招领系统%20—%20设计文档.md)

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + Arco Design + Canvas 地图组件 |
| 后端 | Java 17 + Spring Boot 3.2 + MyBatis-Plus + JWT |
| 数据库 | MySQL 8.0（像素坐标系统） |
| 地图 | Canvas 渲染本地校园图片（`mapFX_med.jpg`） |
| 寻路 | Dijkstra（步行 / 骑行双模式） |

---

## 环境要求

- JDK 17
- MySQL 8.0
- Node.js 18+（前端，后续接入）

---

## 快速开始

### 1. 初始化数据库

依次执行两个脚本（**顺序不能反**）：先建库建表，再灌地图数据。

```bash
# 1) 建库 + 建表 + 专用用户 + 初始数据
mysql -u root -p --default-character-set=utf8mb4 < sql/init.sql

# 2) 导入地图节点与边（183 节点 + 235 边）
mysql -u root -p --default-character-set=utf8mb4 campus < sql/map_data.sql
```

> ⚠️ `--default-character-set=utf8mb4` 不可省略，否则中文会因编码问题报 `Data too long`。

**验证导入成功：**

```bash
mysql -u campus_user -pcampus123 campus -e "SELECT COUNT(*) FROM map_node; SELECT COUNT(*) FROM map_edge;"
# 预期：map_node=183, map_edge=235
```

### 2. 数据库账号

| 账号 | 密码 | 用途 |
|------|------|------|
| `root` | （你安装时设置的） | 仅用于初始化建库 |
| `campus_user` | `campus123` | 应用连接账号（最小权限，仅 campus 库） |

> `campus123` 是本地开发约定弱口令，**生产环境必须换强密码并用环境变量注入**。

### 3. 初始账号

| 学号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin123` | 管理员 |
| `2021001234` | `admin123` | 普通用户（张三，测试用） |

---

## 数据库设计要点

- **统一逻辑关联**，不使用物理外键（完整性由 Service 层保证，便于清库/重导）
- **像素坐标**：地图节点用 `x/y` 像素坐标（非经纬度）
- **节点 ID 约定**（地图数据由 `proj-map-new.html` 转换而来）：
  - 路口节点：`id = 数组索引 + 1`（1~120）
  - 建筑节点：`id = 1000 + 数组索引 + 1`（1001~1063）
- **边类型**：`ROAD`（车行道，步行+骑行）/ `PATH`（人行道，仅步行）；`distance` 留空由后端按坐标计算

---

## 目录结构

```
CS_Prof/
├── sql/
│   ├── init.sql              # 建库建表 + 用户 + 初始数据
│   └── map_data.sql          # 地图节点与边（183 节点 / 235 边）
├── proj-map-new.html         # Canvas 地图原型（待组件化为 Vue）
├── mapFX_med.jpg             # 校园地图底图
└── 校园寻路与失物招领系统 — 设计文档.md
```

---

## 开发进度

- [x] 设计文档定稿（v1.1，Canvas 方案）
- [x] 数据库脚本（建表 + 全量地图数据）
- [ ] 后端骨架（Spring Boot + 通用类 + health）
- [ ] 认证模块（注册 / 登录 / JWT）
- [ ] 导航接口（buildings / route / nearest）
- [ ] 前端项目 + Canvas 地图组件
- [ ] 失物招领模块
- [ ] 管理后台
