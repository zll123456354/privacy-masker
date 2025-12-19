# Edge Privacy Masker 🛡️

**基于阿里云 ESA 边缘计算与 AI 的下一代隐私脱敏平台**

Edge Privacy Masker 是一个集成了文本规则脱敏与 AI 图像识别脱敏的综合隐私保护工具。项目利用阿里云 ESA (Edge Serverless Architecture) 边缘函数提供安全、低延迟的计算服务，结合阿里云 OCR 能力，实现了智能化的证件隐私保护。

## ✨ 核心功能

### 1. 🆔 智能身份证 OCR 与脱敏
- **AI 自动识别**：集成阿里云身份证识别接口，精准提取文字信息。
- **智能坐标定位**：利用 OCR 返回的精确坐标（如人脸关键点）和相对坐标算法。
- **隐私打码**：
  - **人像面**：支持姓名、性别、民族、出生日期、住址、身份证号、**人脸头像**（精确边缘模糊）的自动打码。
  - **国徽面**：支持有效期限、签发机关的自动打码。
- **纯前端渲染**：打码合成过程在浏览器端（Canvas）完成，脱敏后的图片无需二次上传，最大程度保护隐私。
- **自定义选择**：用户可实时勾选/取消需要打码的字段，实时预览效果。

### 2. 📝 文本隐私脱敏
- 基于正则规则的实时脱敏。
- 支持类型：
  - 手机号
  - 身份证号
  - 邮箱
  - 银行卡号
- 一键复制脱敏结果。

## 🏗️ 技术架构

### 为什么选择边缘计算 (ESA)?
- **安全性 (Security)**：敏感配置（如 OCR AppCode）存储在边缘节点，通过 Edge Function 代理请求，密钥永不暴露给客户端。
- **低延迟 (Low Latency)**：ESA 全球边缘节点加速 API 响应。
- **合规性 (Compliance)**：数据处理更靠近用户，减少链路传输风险。

### 技术栈
- **前端框架**：Vue 3 + TypeScript + Vite
- **UI 组件库**：Element Plus
- **边缘计算**：阿里云 ESA Pages + Edge Functions
- **AI 能力**：阿里云文字识别 (OCR)
- **构建工具**：Node.js Scripts (自动注入环境变量)

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
项目依赖阿里云 OCR 服务，请确保在开发环境中配置 `ALIYUN_OCR_APPCODE`。
在 `vite.config.ts` 或本地 `.env` 文件中配置（开发模式），或在 ESA 控制台配置（生产模式）。

### 3. 启动开发服务器
开发服务器内置了 Edge Middleware 模拟，可直接在本地调试 API。
```bash
npm run dev
```

### 4. 项目构建
构建脚本会自动运行 `scripts/inject-env.js`，处理环境变量注入，适配 ESA Pages 的构建环境。
```bash
npm run build
```

## 📂 目录结构
```
├── edge/
│   ├── api/
│   │   └── mask.ts      # 边缘函数：处理 OCR 请求转发与鉴权
│   └── env.ts           # 构建时自动生成的环境变量文件
├── scripts/
│   └── inject-env.js    # 构建脚本：注入 process.env 到前端
├── src/
│   ├── views/
│   │   ├── Home.vue     # 首页
│   │   ├── IdCardOcr.vue # OCR 与图片脱敏核心业务
│   │   └── TextMask.vue # 文本脱敏业务
└── vite.config.ts       # 集成 Edge Middleware 模拟
```

## 🤝 贡献
本项目由阿里云 ESA 提供加速、计算和保护支持。
![alt text](image-3.png)