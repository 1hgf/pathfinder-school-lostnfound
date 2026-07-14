from flask import Flask, request, jsonify
import uuid, os
from datetime import datetime, timedelta
import json as js

app = Flask(__name__)

# 模拟数据库和存储
lostList = js.load(open("lostList.json", "r", encoding='utf-8'))
users = js.load(open("userlist.json", "r", encoding='utf-8'))
lost_items = {x["id"]: x for x in lostList}
tokens = {}  # 修改为字典存储 token: user_id
admin_tokens = set()

# 认证中间件
def require_auth(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"code": 401, "message": "Token缺失", "data": None}), 401
        
        token = auth_header.split(' ')[1]
        if token not in tokens:
            return jsonify({"code": 401, "message": "Token无效或已过期", "data": None}), 401
        
        # 将用户ID添加到请求参数
        user_id = tokens[token]
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def require_admin(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"code": 401, "message": "Token缺失", "data": None}), 401
        
        token = auth_header.split(' ')[1]
        if token not in admin_tokens:
            return jsonify({"code": 403, "message": "无管理员权限", "data": None}), 403
        
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# 1. 认证模块
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    print("注册请求参数:", data)
    
    # 验证必要参数
    required_fields = ["studentId", "username", "password"]
    for field in required_fields:
        if field not in data:
            return jsonify({"code": 400, "message": f"缺少必要参数: {field}", "data": None}), 400
    
    # 检查用户是否已存在
    if any(user["studentId"] == data["studentId"] for user in users):
        return jsonify({"code": 400, "message": "学号已被注册", "data": None}), 400
    
    if any(user["username"] == data["username"] for user in users):
        return jsonify({"code": 400, "message": "用户名已被使用", "data": None}), 400
    
    # 生成新用户ID
    user_id = max(user["id"] for user in users) + 1 if users else 1
    
    # 创建新用户
    new_user = {
        "id": user_id,
        "studentId": data["studentId"],
        "username": data["username"],
        "password": data["password"],  # 实际应用中应哈希处理
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "role": "USER",
        "avatarUrl": "",
        "createdAt": datetime.now().isoformat(),
        "isBanned": False
    }
    
    users.append(new_user)
    return jsonify({"code": 200, "message": "注册成功", "data": None})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    print("登录请求参数:", data)
    
    # 验证必要参数
    if not data.get("studentId") or not data.get("password"):
        return jsonify({"code": 400, "message": "学号和密码不能为空", "data": None}), 400
    
    # 查找用户
    user = next((u for u in users if u["studentId"] == data["studentId"] and not u["isBanned"]), None)
    
    if not user or user["password"] != data["password"]:  # 实际应用中应使用哈希验证
        return jsonify({"code": 401, "message": "学号或密码错误", "data": None}), 401
    
    # 生成token
    token = str(uuid.uuid4())
    tokens[token] = user["id"]
    
    # 管理员token单独存储
    if user["role"] == "ADMIN":
        admin_tokens.add(token)
    
    return jsonify({
        "code": 200,
        "message": "登录成功",
        "data": {
            "token": token,
            "userInfo": {
                "id": user["id"],
                "studentId": user["studentId"],
                "username": user["username"],
                "role": user["role"],
                "avatarUrl": user["avatarUrl"]
            }
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout(user_id):  # 添加 user_id 参数
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    
    # 从tokens中移除
    if token in tokens:
        del tokens[token]  # 已通过中间件获取user_id，无需再次从token获取
        
        # 如果是管理员token，也从admin_tokens中移除
        if token in admin_tokens:
            admin_tokens.remove(token)
    
    print(f"用户 {user_id} 退出登录请求")  # 添加用户ID日志
    return jsonify({"code": 200, "message": "退出成功", "data": None})

# 2. 用户模块
@app.route('/api/user/me', methods=['GET'])
@require_auth
def get_user_info(user_id):  # 添加 user_id 参数
    print(f"用户 {user_id} 获取个人信息请求")
    
    # 根据user_id查询真实用户信息
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"code": 404, "message": "用户不存在", "data": None}), 404
    
    # 手机号脱敏处理
    phone = user.get("phone", "")
    
    return jsonify({
        "code": 200,
        "data": {
            "id": user["id"],
            "studentId": user["studentId"],
            "username": user["username"],
            "email": user.get("email", ""),
            "phone": phone,
            "role": user["role"],
            "avatarUrl": user["avatarUrl"],
            "createdAt": user["createdAt"]
        }
    })

@app.route('/api/user/me', methods=['PUT'])
@require_auth
def update_user_info(user_id):  # 添加 user_id 参数
    data = request.json
    print(f"用户 {user_id} 修改个人信息请求参数:", data)
    
    # 根据user_id查询用户
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"code": 404, "message": "用户不存在", "data": None}), 404
    
    # 更新允许修改的字段
    allowed_fields = ["username", "email", "phone"]
    for field in allowed_fields:
        if field in data:
            user[field] = data[field]
    
    return jsonify({"code": 200, "message": "修改成功", "data": None})

@app.route('/api/user/avatar', methods=['POST'])
@require_auth
def upload_avatar(user_id):  # 添加 user_id 参数
    if 'file' not in request.files:
        return jsonify({"code": 400, "message": "未上传文件", "data": None}), 400
    
    file = request.files['file']
    print(f"用户 {user_id} 上传头像: {file.filename}")
    
    # 生成头像URL
    avatar_url = f"http://xxx/uploads/avatar/{uuid.uuid4()}.jpg"
    
    # 更新用户头像
    user = next((u for u in users if u["id"] == user_id), None)
    if user:
        user["avatarUrl"] = avatar_url
    
    return jsonify({
        "code": 200,
        "data": {
            "url": avatar_url
        }
    })

@app.route('/api/user/password', methods=['PUT'])
@require_auth
def update_password(user_id):  # 添加 user_id 参数
    data = request.json
    print(f"用户 {user_id} 修改密码请求参数:", data)
    
    # 验证必要参数
    if not data.get("oldPassword") or not data.get("newPassword"):
        return jsonify({"code": 400, "message": "旧密码和新密码不能为空", "data": None}), 400
    
    # 查找用户
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"code": 404, "message": "用户不存在", "data": None}), 404
    
    # 验证旧密码
    if user["password"] != data["oldPassword"]:  # 实际应用中应使用哈希验证
        return jsonify({"code": 400, "message": "旧密码错误", "data": None}), 400
    
    # 更新新密码
    user["password"] = data["newPassword"]  # 实际应用中应哈希处理
    
    return jsonify({"code": 200, "message": "密码修改成功", "data": None})

def filter_by_time(date_str, time_filter, today):
    """根据时间筛选条件过滤数据"""
    from datetime import datetime
    try:
        item_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        delta = (today - item_date).days
        
        if time_filter == '今天':
            return delta == 0
        elif time_filter == '本周':
            return delta < 7
        else:
            return True
    except:
        return True
# 3. 失物招领模块
@app.route('/api/lost-found', methods=['GET'])
def get_lost_found_list():
    params = request.args.to_dict()
    print("失物招领列表查询参数:", params)
    
    # 提取查询参数
    type_filter = params.get('type', '').strip()
    category_filter = params.get('category', '').strip()
    keyword = params.get('keyword', '').strip()
    status_filter = params.get('status', '').strip()
    time_filter = params.get('time', '').strip()
    page = int(params.get('page', 1))
    page_size = int(params.get('pageSize', 50))
    
    # 筛选数据
    global lostList
    filtered_data = lostList.copy()
    
    # 类型筛选
    if type_filter:
        filtered_data = [item for item in filtered_data if item['type'] == type_filter]
    
    # 分类筛选
    if category_filter:
        filtered_data = [item for item in filtered_data if item['category'] == category_filter]
    
    # 关键词筛选（搜索标题和描述）
    if keyword:
        keyword_lower = keyword.lower()
        filtered_data = [
            item for item in filtered_data 
            if keyword_lower in item['title'].lower() or 
               (item['description'] and keyword_lower in item['description'].lower())
        ]
    
    # 状态筛选
    if status_filter:
        filtered_data = [item for item in filtered_data if item['status'] == status_filter]
    
    # 时间筛选
    if time_filter:
        from datetime import datetime
        today = datetime.now().date()
        filtered_data = [
            item for item in filtered_data 
            if filter_by_time(item['occurred_at'], time_filter, today)
        ]
    
    # 分页处理
    total = len(filtered_data)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_data = filtered_data[start_idx:end_idx]
    
    # 转换数据格式
    result_list = []
    for item in paginated_data:
        result_list.append({
            "id": item["id"],
            "type": item["type"],
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "location": item["location"],
            "imageUrls": [],
            "status": item["status"],
            "occurredAt": item["occurred_at"],
            "createdAt": item["occurred_at"],
            "user": item["user"],
            "author": item['author'],
            "contact": item['contact']
        })
    
    return jsonify({
        "code": 200,
        "data": {
            "list": result_list,
            "total": total,
            "page": page,
            "pageSize": page_size
        }
    })

@app.route('/api/lost-found/<int:id>', methods=['GET'])
def get_lost_found_detail(id):
    print(f"获取失物招领详情: {id}")
    
    # 从实际数据中查找失物招领信息
    item = lost_items.get(id)
    if not item:
        return jsonify({"code": 404, "message": "失物招领信息不存在", "data": None}), 404
    
    # 转换数据格式并返回
    return jsonify({
        "code": 200,
        "data": {
            "id": item["id"],
            "type": item["type"],
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "location": item["location"],
            "imageUrls": [],  # 实际应用中应从item获取图片URL
            "status": item["status"],
            "occurredAt": item["occurred_at"],
            "createdAt": item.get("createdAt", item["occurred_at"]),
            "user": item["user"],
            "author": item['author'],
            "contact": item['contact']
        }
    })

@app.route('/api/lost-found', methods=['POST'])
@require_auth
def create_lost_found(user_id):  # 添加 user_id 参数
    data = request.json
    print(f"用户 {user_id} 发布失物招领请求参数:", data)
    
    # 验证必要参数
    required_fields = ["title", "type", "category", "location", "occurredAt", "author", "contact", "description"]
    for field in required_fields:
        if field not in data:
            return jsonify({"code": 400, "message": f"缺少必要参数: {field}", "data": None}), 400
    
    # 查找用户
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return jsonify({"code": 404, "message": "用户不存在", "data": None}), 404
    
    # 生成新的ID
    global lostList
    max_id = max(item["id"] for item in lostList) if lostList else 0
    item_id = max_id + 1
    
    # 构建新数据项（使用真实用户信息）
    new_item = {
        "id": item_id,
        "title": data['title'],
        "type": data['type'],
        "category": data['category'],
        "location": data['location'],
        "occurred_at": data['occurredAt'],
        "author": data['author'],
        "contact": data['contact'],
        "description": data['description'],
        "status": "OPEN",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "avatarUrl": user["avatarUrl"]
        },
        "createdAt": datetime.now().isoformat()  # 添加创建时间
    }
    
    # 添加到模拟数据列表
    lostList.insert(0, new_item)
    lost_items[item_id] = new_item
    
    return jsonify({"code": 200, "message": "发布成功", "data": {"id": item_id}})

@app.route('/api/lost-found/<int:id>', methods=['PUT'])
@require_auth
def update_lost_found(id, user_id):  # 添加 user_id 参数
    data = request.json
    print(f"用户 {user_id} 修改失物招领 {id} 请求参数:", data)
    
    if id not in lost_items:
        return jsonify({"code": 404, "message": "资源不存在", "data": None}), 404
    
    # 获取失物招领信息
    item = lost_items[id]
    
    # 验证权限：只有创建者或管理员可以修改
    if item["user"]["id"] != user_id:
        # 检查是否为管理员
        is_admin = any(token in admin_tokens for token, uid in tokens.items() if uid == user_id)
        if not is_admin:
            return jsonify({"code": 403, "message": "没有权限修改此失物招领", "data": None}), 403
    
    # 不允许修改创建者信息
    data.pop("user", None)
    data.pop("id", None)
    data.pop("createdAt", None)
    
    lost_items[id].update(data)
    global lostList
    lostList = [item for item in lostList if item["id"] != id] + [lost_items[id]]

    return jsonify({"code": 200, "message": "修改成功", "data": None})

@app.route('/api/lost-found/<int:id>', methods=['DELETE'])
@require_auth
def delete_lost_found(id, user_id):  # 添加 user_id 参数
    print(f"用户 {user_id} 删除失物招领 {id}")
    
    if id not in lost_items:
        return jsonify({"code": 404, "message": "资源不存在", "data": None}), 404
    
    # 获取失物招领信息
    item = lost_items[id]
    
    # 验证权限：只有创建者或管理员可以删除
    if item["user"]["id"] != user_id:
        # 检查是否为管理员
        is_admin = any(token in admin_tokens for token, uid in tokens.items() if uid == user_id)
        if not is_admin:
            return jsonify({"code": 403, "message": "没有权限删除此失物招领", "data": None}), 403
    
    del lost_items[id]
    global lostList
    lostList = [item for item in lostList if item["id"] != id]

    return jsonify({"code": 200, "message": "删除成功", "data": None})

@app.route('/api/lost-found/<int:id>/status', methods=['PUT'])
@require_auth
def update_lost_found_status(id, user_id):  # 添加 user_id 参数
    data = request.json
    print(f"用户 {user_id} 更新失物招领 {id} 状态请求参数:", data)
    
    if id not in lost_items:
        return jsonify({"code": 404, "message": "资源不存在", "data": None}), 404
    
    # 验证状态参数
    if "status" not in data:
        return jsonify({"code": 400, "message": "缺少状态参数", "data": None}), 400
    
    valid_statuses = ["OPEN", "CLAIMED", "CLOSED"]
    if data["status"] not in valid_statuses:
        return jsonify({"code": 400, "message": f"状态必须是 {valid_statuses}", "data": None}), 400
    
    # 获取失物招领信息
    item = lost_items[id]
    
    # 验证权限：只有创建者或管理员可以更新状态
    if item["user"]["id"] != user_id:
        is_admin = any(token in admin_tokens for token, uid in tokens.items() if uid == user_id)
        if not is_admin:
            return jsonify({"code": 403, "message": "没有权限更新此失物招领状态", "data": None}), 403
    
    item["status"] = data["status"]
    global lostList
    lostList = [item for item in lostList if item["id"] != id] + [lost_items[id]]
    return jsonify({"code": 200, "message": "状态更新成功", "data": None})

@app.route('/api/lost-found/my', methods=['GET'])
@require_auth
def get_my_lost_found(user_id):  # 添加 user_id 参数
    print(f"用户 {user_id} 获取我的发布")
    
    # 筛选当前用户发布的失物招领
    my_items = [item for item in lost_items.values() if item["user"]["id"] == user_id]
    
    # 分页处理
    params = request.args.to_dict()
    page = int(params.get('page', 1))
    page_size = int(params.get('pageSize', 10))
    total = len(my_items)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_items = my_items[start_idx:end_idx]
    
    return jsonify({
        "code": 200,
        "data": {
            "list": paginated_items,
            "total": total,
            "page": page,
            "pageSize": page_size
        }
    })

# 4. 文件上传模块
@app.route('/api/upload/image', methods=['POST'])
@require_auth
def upload_image(user_id):  # 添加 user_id 参数
    if 'file' not in request.files:
        return jsonify({"code": 400, "message": "未上传文件", "data": None}), 400
    
    file = request.files['file']
    print(f"用户 {user_id} 上传图片: {file.filename}")
    
    # 生成图片URL
    image_url = f"http://xxx/uploads/{uuid.uuid4()}.jpg"
    
    return jsonify({
        "code": 200,
        "data": {
            "url": image_url
        }
    })

buildinglist = js.load(open("buildinglist.json", "r", encoding='utf-8'))
# 5. 导航模块
@app.route('/api/navigation/points', methods=['GET'])
def get_points():
    params = request.args.to_dict()
    print("地点列表查询参数:", params)
    
    return jsonify({
        "code": 200,
        "data": buildinglist
    })

connectionlist = js.load(open("connectionlist.json", "r", encoding='utf-8'))
# ADDED
@app.route('/api/navigation/connections', methods=['GET'])
def get_connections():
    return jsonify({
        "code": 200,
        "data": connectionlist
    })

@app.route('/api/navigation/search', methods=['GET'])
def search_locations():
    keyword = request.args.get('keyword', '')
    print(f"搜索地点: {keyword}")
    
    return jsonify({
        "code": 200,
        "data": [
            { "id": 2, "name": "第一食堂", "type": "CANTEEN", "x": 1350.5, "y": 859.1 },
            { "id": 3, "name": "第二食堂", "type": "CANTEEN", "x": 940.4, "y": 487.8 }
        ]
    })

@app.route('/api/navigation/route', methods=['GET'])
def get_route():
    params = request.args.to_dict()
    print("路径规划请求参数:", params)
    
    from_id = params.get('fromId')
    to_id = params.get('toId')
    
    if from_id == to_id:
        return jsonify({"code": 400, "message": "起点和终点不能相同", "data": None}), 400
    
    return jsonify({
        "code": 200,
        "data": {
            "distance": 456.7,
            "duration": 380,
            "durationText": "约6分钟",
            "mode": params.get("mode", "walk"),
            "path": [
                [1194.4, 819.9],
                [1323.0, 732.2],
                [1176.5, 647.7],
                [1056.8, 724.0],
                [940.4, 487.8]
            ],
            "nodes": [
                { "id": 1,  "name": "图书馆", "type": "BUILDING" },
                { "id": 11, "name": "路口A", "type": "CROSSROAD" },
                { "id": 12, "name": "路口B", "type": "CROSSROAD" },
                { "id": 13, "name": "路口C", "type": "CROSSROAD" },
                { "id": 3,  "name": "第二食堂", "type": "CANTEEN" }
            ]
        }
    })

@app.route('/api/navigation/nearest', methods=['GET'])
def get_nearest_node():
    x = request.args.get('x')
    y = request.args.get('y')
    print(f"坐标就近吸附请求参数: x={x}, y={y}")
    
    return jsonify({
        "code": 200,
        "data": {
            "nodeId": 1,
            "name": "图书馆",
            "type": "BUILDING",
            "x": 1070.5,
            "y": 816.5,
            "distance": 12.3
        }
    })

# 6. 管理后台模块
@app.route('/api/admin/dashboard', methods=['GET'])
@require_admin
def get_dashboard():
    print("获取数据看板")
    
    # 计算用户统计
    total_users = len(users)
    today = datetime.now().date()
    today_new_users = sum(1 for u in users if datetime.fromisoformat(u["createdAt"]).date() == today)
    
    # 计算失物招领统计
    total_lost_found = len(lostList)
    today_lost_found = sum(1 for item in lostList if datetime.fromisoformat(item["occurred_at"]).date() == today)
    
    # 状态统计
    open_count = sum(1 for item in lostList if item["status"] == "OPEN")
    claimed_count = sum(1 for item in lostList if item["status"] == "CLAIMED")
    closed_count = sum(1 for item in lostList if item["status"] == "CLOSED")
    claim_rate = f"{(claimed_count / (total_lost_found or 1)) * 100:.1f}%" if total_lost_found > 0 else "0.0%"
    
    # 分类统计
    category_stats = {}
    for item in lostList:
        category = item.get("category", "其他")
        category_stats[category] = category_stats.get(category, 0) + 1
    category_stats = [{"category": k, "count": v} for k, v in category_stats.items()]
    
    # 近7天趋势
    weekly_trend = []
    for i in range(6, -1, -1):
        date = (today - timedelta(days=i)).strftime("%m-%d")
        day_items = [item for item in lostList if datetime.fromisoformat(item["occurred_at"]).date() == (today - timedelta(days=i))]
        lost = sum(1 for item in day_items if item["type"] == "LOST")
        found = sum(1 for item in day_items if item["type"] == "FOUND")
        user = sum([1 for u in users if datetime.fromisoformat(u["createdAt"]).date() == (today - timedelta(days=i))])
        weekly_trend.append({"date": date, "lost": lost, "found": found, "user": user})
    
    return jsonify({
        "code": 200,
        "data": {
            "totalUsers": total_users,
            "todayNewUsers": today_new_users,
            "totalLostFound": total_lost_found,
            "todayLostFound": today_lost_found,
            "openCount": open_count,
            "claimedCount": claimed_count,
            "claimRate": claim_rate,
            "categoryStats": category_stats,
            "weeklyTrend": weekly_trend
        }
    })

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def get_users():
    params = request.args.to_dict()
    print("用户列表查询参数:", params)
    
    # 支持按用户名、学号搜索
    keyword = params.get('keyword', '').strip().lower()
    filtered_users = users
    
    if keyword:
        filtered_users = [
            user for user in filtered_users
            if keyword in user["username"].lower() or 
               keyword in user["studentId"].lower()
        ]
    
    # 分页处理
    page = int(params.get("page", 1))
    page_size = int(params.get("pageSize", 10))
    total = len(filtered_users)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_users = filtered_users[start_idx:end_idx]
    
    # 处理用户数据（隐藏密码）
    result_list = []
    for user in paginated_users:
        user_data = user.copy()
        del user_data["password"]  # 不返回密码
        result_list.append(user_data)
    
    return jsonify({
        "code": 200,
        "data": {
            "list": result_list,
            "total": total,
            "page": page,
            "pageSize": page_size
        }
    })

@app.route('/api/admin/users/<int:id>/ban', methods=['PUT'])
@require_admin
def ban_user(id):
    data = request.json
    print(f"封禁/解封用户 {id} 请求参数:", data)
    
    user = next((u for u in users if u["id"] == id), None)
    if not user:
        return jsonify({"code": 404, "message": "用户不存在", "data": None}), 404
    
    # 不能封禁管理员
    if user["role"] == "ADMIN":
        return jsonify({"code": 403, "message": "不能操作管理员账户", "data": None}), 403
    
    is_banned = data.get("isBanned", False)
    user["isBanned"] = is_banned
    
    # 如果封禁用户，同时使其token失效
    if is_banned:
        tokens_to_remove = [token for token, user_id in tokens.items() if user_id == id]
        for token in tokens_to_remove:
            del tokens[token]
            if token in admin_tokens:
                admin_tokens.remove(token)
    
    message = "用户已封禁" if is_banned else "用户已解封"
    return jsonify({"code": 200, "message": message, "data": None})

@app.route('/api/admin/lost-found', methods=['GET'])
@require_admin
def admin_get_lost_found():
    params = request.args.to_dict()
    print("管理员查询失物招领列表参数:", params)
    
    # 提取查询参数
    type_filter = params.get('type', '').strip()
    category_filter = params.get('category', '').strip()
    keyword = params.get('keyword', '').strip()
    status_filter = params.get('status', '').strip()
    time_filter = params.get('time', '').strip()
    page = int(params.get('page', 1))
    page_size = int(params.get('pageSize', 10))
    
    # 筛选数据
    global lostList
    filtered_data = lostList.copy()
    
    # 类型筛选
    if type_filter:
        filtered_data = [item for item in filtered_data if item['type'] == type_filter]
    
    # 分类筛选
    if category_filter:
        filtered_data = [item for item in filtered_data if item['category'] == category_filter]
    
    # 关键词筛选（搜索标题和描述）
    if keyword:
        keyword_lower = keyword.lower()
        filtered_data = [
            item for item in filtered_data 
            if keyword_lower in item['title'].lower() or 
               (item['description'] and keyword_lower in item['description'].lower())
        ]
    
    # 状态筛选
    if status_filter:
        filtered_data = [item for item in filtered_data if item['status'] == status_filter]
    
    # 时间筛选
    if time_filter:
        from datetime import datetime
        today = datetime.now().date()
        filtered_data = [
            item for item in filtered_data 
            if filter_by_time(item['occurred_at'], time_filter, today)
        ]
    
    # 分页处理
    total = len(filtered_data)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_items = filtered_data[start_idx:end_idx]
    
    return jsonify({
        "code": 200,
        "data": {
            "list": paginated_items,
            "total": total,
            "page": page,
            "pageSize": page_size
        }
    })

@app.route('/api/admin/lost-found/<int:id>', methods=['DELETE'])
@require_admin
def admin_delete_lost_found(id):
    print(f"管理员删除失物招领 {id}")
    
    if id not in lost_items:
        return jsonify({"code": 404, "message": "资源不存在", "data": None}), 404
    
    del lost_items[id]
    global lostList
    lostList = [item for item in lostList if item["id"] != id]
    return jsonify({"code": 200, "message": "删除成功", "data": None})

from flask_cors import CORS
CORS(app, 
     supports_credentials=True,  # 关键：允许携带凭证
     resources={r"/api/*": {"origins": ["null", "http://localhost:*", "https://localhost:*"]}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

if __name__ == '__main__':
    app.run(host='localhost', debug=True, port=8080)

