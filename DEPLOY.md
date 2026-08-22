# 部署到 GitHub Pages

应用地址（启用 Pages 后）：**https://mislamaara.github.io/for_cursor/**

## 第一次启用（约 30 秒）

GitHub Actions 已经能成功构建，但仓库还没打开 Pages，所以 deploy 会报 404。

1. 打开：https://github.com/mislamaara/for_cursor/settings/pages  
2. **Build and deployment → Source** 选 **GitHub Actions**  
3. 打开：https://github.com/mislamaara/for_cursor/actions/workflows/pages.yml  
4. 点 **Run workflow** → **Run workflow**，等 1–2 分钟  
5. 访问：https://mislamaara.github.io/for_cursor/

## iPhone 使用

Safari 打开上面的地址 → **分享 → 添加到主屏幕**。

数据只存在本机浏览器，不会上传。

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173
