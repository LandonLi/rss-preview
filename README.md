# RSS Zen Preview

一个基于 **Cloudflare Pages** 构建的极简 RSS 预览工具。设计灵感源自 [Hermes Agent](https://hermes-agent.nousresearch.com/)，采用高密度、无间隙的工业网格风格。

## ✨ 特性

- **极简设计**：纯白底色、细线网格，针对中文排版进行了深度优化。
- **播客友好**：
    - 自动识别播客 RSS 并展示频道封面。
    - 自定义黑色工业风音频播放器。
    - 智能正文折叠，突出音频内容。
- **响应式布局**：完美适配移动端与桌面端。
- **Serverless 架构**：利用 Cloudflare Functions 进行后端解析，无需维护服务器。

## 🛠️ 技术栈

- **前端**: 原生 HTML5, CSS3 (Modern Grid Layout), Vanilla JS
- **后端**: Cloudflare Pages Functions (Node.js 运行时)
- **解析引擎**: `rss-parser`

## 🚀 部署

该项目部署在 Cloudflare Pages 上。

### 本地开发

1. 克隆仓库:
   ```bash
   git clone https://github.com/LandonLi/rss-preview.git
   ```
2. 安装依赖:
   ```bash
   npm install
   ```
3. 本地运行:
   ```bash
   npx wrangler pages dev public
   ```

### 部署到生产环境

使用 Wrangler 直接部署到 Cloudflare Pages：

```bash
npx wrangler pages deploy public --project-name rss-preview --branch master
```

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。
