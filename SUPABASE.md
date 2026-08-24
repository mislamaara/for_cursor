# Supabase 多设备同步 · 配置步骤

你已经注册了 Supabase 并连上 GitHub，接下来按顺序做。**应用里的自动同步代码还没接好**，先把云端「仓库」建好。

## 第一步：在 Supabase 建表

任选一种方式：

### 方式 A（推荐）：Dashboard 手动执行

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目  
2. 左侧 **SQL Editor** → **New query**  
3. 把仓库里 [`supabase/migrations/001_initial.sql`](./supabase/migrations/001_initial.sql) 的全部内容粘贴进去  
4. 点 **Run**  
5. 左侧 **Table Editor** 里应能看到：`recipes`、`batches`、`foods`、`workouts`、`photos`

### 方式 B：GitHub 集成自动迁移

若你在 Supabase 里已连接 GitHub 仓库 `mislamaara/for_cursor`：

1. Supabase → **Database** → **Migrations**  
2. 确认能读到 `supabase/migrations/` 目录  
3. 推送本仓库到 `main` 后，在 Supabase 里 **Apply migration**

---

## 第二步：打开登录

1. Supabase → **Authentication** → **Providers**  
2. 打开 **Email**（邮箱 magic link，最简单）  
3. （可选）关掉 **Confirm email**，个人用更省事  

以后每台设备用**同一个邮箱**登录，数据就只属于你一个人。

---

## 第三步：确认照片存储

执行 SQL 后应自动创建私有桶 **`kitchen-photos`**。

检查：Supabase → **Storage** → 是否有 `kitchen-photos`（**不要**设成 Public）。

照片路径格式：`{你的用户ID}/{照片ID}.jpg`

---

## 第四步：复制 API 密钥

Supabase → **Project Settings** → **API**：

| 名称 | 用途 |
|------|------|
| **Project URL** | `VITE_SUPABASE_URL` |
| **anon public** | `VITE_SUPABASE_ANON_KEY` |

> `service_role` 密钥**不要**放进网页或 GitHub，只能放服务器。

---

## 第五步：把密钥交给 GitHub Pages 构建

线上版 https://mislamaara.github.io/for_cursor/ 是静态站，密钥要在**构建时**写进去：

1. GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**  
2. 新建 Secret：  
   - `VITE_SUPABASE_URL`  
   - `VITE_SUPABASE_ANON_KEY`  
3. 本地开发：复制 `.env.example` 为 `.env`，填同样的值  

（等代码接好 Supabase 后，CI 会自动用这些 Secret 构建。）

---

## 第六步：重新部署线上版

代码已支持云同步。Secrets 配好后：

1. https://github.com/mislamaara/for_cursor/actions/workflows/pages.yml  
2. **Run workflow**  
3. 打开 https://mislamaara.github.io/for_cursor/me  

## 第七步：使用同步

1. **我的** → 输入邮箱 → **发送登录链接** → 点邮件里的链接  
2. 回到 **我的** 页，点 **上传到云**（第一台设备）  
3. 另一台设备同样登录后，点 **从云下载**  

文字进 PostgreSQL，照片进 `kitchen-photos` 桶。

---

## 常见问题

**Q：Supabase 连 GitHub 就够了？**  
不够。GitHub 集成主要是**数据库迁移**；网页还要用 API 密钥才能读写你的数据。

**Q：数据安全吗？**  
开了 RLS（行级权限）后，只有登录的你能看到自己的饮食记录。不要把 `service_role` 密钥泄露出去。

**Q：免费够用吗？**  
个人日记 + 照片，免费额度通常够用。
