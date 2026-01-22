# 推送代码到 GitHub - 详细步骤

## 方法一：使用 Personal Access Token（推荐）

### 步骤1：生成 Personal Access Token

1. **打开浏览器**，访问：https://github.com/settings/tokens
2. **登录你的 GitHub 账号**
3. **点击 "Generate new token"** → **"Generate new token (classic)"**
4. **填写信息：**
   - Note（备注）：可以填写 "微信小程序项目"
   - Expiration（过期时间）：选择 "90 days" 或 "No expiration"
   - **勾选权限：** 找到 `repo` 并勾选（这会自动勾选所有 repo 相关权限）
5. **点击 "Generate token"**
6. **复制生成的 token**（只显示一次，一定要保存好！）
   - 格式类似：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 步骤2：使用 Token 推送代码

在终端运行以下命令（把 `YOUR_TOKEN` 替换成你刚才复制的 token）：

```bash
cd /Users/bufoli/WeChatProjects/miniprogram-1
git push https://YOUR_TOKEN@github.com/bufoli/wechat-gif-maker.git main
```

**注意：** 把 `YOUR_TOKEN` 替换成你实际的 token，不要保留 `YOUR_TOKEN` 这几个字。

---

## 方法二：使用 GitHub Desktop（最简单）

### 步骤1：下载 GitHub Desktop

1. 访问：https://desktop.github.com/
2. 下载并安装 GitHub Desktop
3. 打开 GitHub Desktop

### 步骤2：登录并打开项目

1. **登录你的 GitHub 账号**
2. **点击 "File" → "Add Local Repository"**
3. **选择项目文件夹：** `/Users/bufoli/WeChatProjects/miniprogram-1`
4. **点击 "Push origin" 按钮**

---

## 方法三：在微信开发者工具中操作

如果微信开发者工具有 Git 功能：

1. 在微信开发者工具中，找到 Git 相关功能
2. 点击推送按钮

---

## 当前状态

✅ **代码已提交到本地 Git 仓库**  
⏳ **等待推送到 GitHub**

包含的更改：
- 修复了导出 GIF 的逻辑
- 添加了云函数完善文档
- 优化了编辑页布局

---

## 如果推送失败

如果遇到认证错误，请：
1. 检查 token 是否正确
2. 检查 token 是否过期
3. 尝试重新生成 token

---

## 推送成功后

推送成功后，你的朋友就可以在以下地址看到代码：
**https://github.com/bufoli/wechat-gif-maker**
