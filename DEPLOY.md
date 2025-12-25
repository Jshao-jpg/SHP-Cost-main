# Render 部署指南

## 📦 部署架构

**单一Render部署包含两个系统：**
- Shipping Route Cost & LT System
- Warehouse Cost System

**URL结构：**
```
https://your-app.onrender.com/                    → 主界面（三个工具入口）
https://your-app.onrender.com/route-calculator    → Shipping Route Cost & LT
https://your-app.onrender.com/warehouse-calculator → Warehouse Cost
```

**外部工具：**
```
https://costcalculate.netlify.app/                → DHL Cost Calculator（已部署）
```

---

## 🚀 部署步骤

### 方法1：使用 render.yaml（推荐）

1. **准备Git仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Render deployment"
   ```

2. **推送到GitHub/GitLab**
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **在Render创建Web Service**
   - 登录 https://render.com
   - 点击 "New +" → "Web Service"
   - 连接你的Git仓库
   - Render会自动检测 `render.yaml` 并使用其配置

4. **等待构建完成**
   - 构建时间约5-10分钟
   - Render将自动执行：
     - 安装Python依赖
     - 安装Node.js依赖
     - 构建前端
     - 启动Flask应用

### 方法2：手动配置

1. **在Render创建Web Service**
   - 登录 https://render.com
   - 点击 "New +" → "Web Service"
   - 连接你的Git仓库

2. **配置构建设置**
   - **Name**: `scm-tools`（或任意名称）
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```
     pip install -r requirements.txt && cd frontend && npm install && npm run build
     ```
   - **Start Command**: 
     ```
     gunicorn app:app
     ```

3. **环境变量（可选）**
   - `PYTHON_VERSION`: `3.11.0`
   - `PORT`: Render自动设置

4. **点击 "Create Web Service"**

---

## 📝 部署后配置

### 更新主界面链接

部署成功后，你会得到一个URL，例如：
```
https://scm-tools-abc123.onrender.com
```

**不需要修改任何代码！** 主界面已经配置为：
- **DHL Calculator**: 外部链接到Netlify
- **Shipping Route**: 相对路径 `/route-calculator`
- **Warehouse Cost**: 相对路径 `/warehouse-calculator`

### 访问方式

1. **主入口**: `https://scm-tools-abc123.onrender.com/`
2. **直接访问工具**:
   - `https://scm-tools-abc123.onrender.com/route-calculator`
   - `https://scm-tools-abc123.onrender.com/warehouse-calculator`

---

## ⚙️ 技术细节

### 构建过程

```bash
# 1. 安装Python依赖
pip install -r requirements.txt

# 2. 构建前端
cd frontend
npm install
npm run build

# 3. 启动应用
gunicorn app:app
```

### 文件结构

```
项目根目录/
├── app.py                    # Flask主应用
├── render.yaml              # Render配置（新增）
├── requirements.txt         # Python依赖
├── .gitignore              # Git忽略文件（新增）
├── index.html              # 主界面（新增）
├── excel_handler.py        # Shipping Route处理器
├── WH Cost/
│   ├── wh_excel_handler.py # Warehouse处理器
│   └── WH cost.xlsx        # Warehouse数据
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx         # Shipping Route UI
│   │   └── WarehouseCalculator.jsx  # Warehouse UI
│   └── dist/               # 构建输出（自动生成）
└── 5.shipping cost based on summary.xlsx
```

---

## ⚠️ 注意事项

### 1. 免费计划限制
- Render免费计划在15分钟无活动后会休眠
- 首次访问需要30-60秒唤醒
- 建议升级到付费计划以保持持续运行

### 2. Excel文件
确保以下文件已提交到Git：
- `5.shipping cost based on summary.xlsx`
- `WH Cost/WH cost.xlsx`

### 3. 日志文件
日志文件已添加到 `.gitignore`，不会提交到Git：
- `shipping_route_logs.txt`
- `wh_cost_logs.txt`

### 4. 前端构建
确保 `frontend/dist/` 目录在 `.gitignore` 中，Render会自动构建。

---

## 🔧 故障排除

### 构建失败

**问题**: "npm: command not found"
**解决**: Render自动安装Node.js，检查build命令是否正确

**问题**: "Module not found: pandas"
**解决**: 检查 `requirements.txt` 中是否包含所有依赖

### 应用无法启动

**问题**: "Address already in use"
**解决**: 移除 `app.py` 中的硬编码端口，使用 `os.environ.get('PORT', 5000)`

**问题**: "File not found: index.html"
**解决**: 检查主界面文件是否在项目根目录

### 路由404错误

**问题**: 访问 `/route-calculator` 返回404
**解决**: 确保前端已成功构建到 `frontend/dist/`

---

## 📊 监控和维护

### 查看日志
1. 登录Render Dashboard
2. 选择你的服务
3. 点击 "Logs" 标签

### 重新部署
1. 推送新代码到Git
2. Render自动检测并重新部署
3. 或手动触发：Dashboard → Deploy → "Clear build cache & deploy"

### 环境变量管理
Dashboard → Environment → 添加/修改环境变量

---

## ✅ 验证清单

部署前检查：
- [ ] `render.yaml` 已创建
- [ ] `requirements.txt` 包含所有依赖（含gunicorn）
- [ ] `index.html` 主界面已创建
- [ ] `.gitignore` 已配置
- [ ] Excel文件已提交到Git
- [ ] `app.py` 使用环境变量PORT
- [ ] 前端已本地测试构建成功

部署后验证：
- [ ] 主界面可访问
- [ ] 三个按钮链接正确
- [ ] Shipping Route工具正常运行
- [ ] Warehouse Cost工具正常运行
- [ ] Excel上传功能正常
- [ ] 模板下载功能正常

---

## 🎯 总结

**是的，可以将Shipping Route和Warehouse Cost部署在同一个Render地址！**

优势：
✅ 统一管理和部署
✅ 共享后端资源
✅ 单一域名，更易记忆
✅ 降低成本（一个Render实例）

部署完成后，你将拥有：
- 一个主界面入口
- 两个集成工具（在同一域名下）
- 一个外部DHL工具链接
