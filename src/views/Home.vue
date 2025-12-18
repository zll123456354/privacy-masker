<template>
  <div class="home-container">
    <div class="hero-section">
      <h1 class="project-title">Edge Privacy Masker</h1>
      <p class="project-subtitle">基于边缘计算的隐私信息脱敏系统</p>

      <div class="privacy-notice">
        <el-alert
          title="🛡️ 安全承诺：所有数据仅在边缘节点内存中即时处理，即用即焚，本站绝不持久化存储任何用户隐私数据。"
          type="success"
          :closable="false"
          center
          show-icon
        />
      </div>
      
      <div class="feature-cards">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="feature-card" shadow="hover" @click="$router.push('/text-mask')">
              <template #header>
                <div class="card-header">
                  <el-icon class="icon"><Document /></el-icon>
                  <span>文本信息脱敏</span>
                </div>
              </template>
              <p class="feature-desc">自动识别并隐藏文本中的敏感信息，如手机号、身份证号、邮箱等。</p>
              <el-button type="primary" round class="action-btn">立即体验</el-button>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="feature-card" shadow="hover" @click="$router.push('/id-card-ocr')">
              <template #header>
                <div class="card-header">
                  <el-icon class="icon"><Postcard /></el-icon>
                  <span>身份证信息脱敏</span>
                </div>
              </template>
              <p class="feature-desc">智能识别身份证图片信息，自动对敏感区域进行打码处理并支持下载。</p>
              <el-button type="success" round class="action-btn">立即体验</el-button>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>

    <el-divider content-position="center">项目介绍</el-divider>

    <div class="intro-section">
      <el-descriptions title="项目概览" direction="vertical" :column="2" border>
        <el-descriptions-item label="项目名称">Edge Privacy Masker</el-descriptions-item>
        <el-descriptions-item label="技术栈">Vue 3 + TypeScript + Element Plus + Aliyun ESA</el-descriptions-item>
        <el-descriptions-item label="核心功能" :span="2">
          <el-tag size="small" style="margin-right: 8px;">边缘计算</el-tag>
          <el-tag size="small" type="success" style="margin-right: 8px;">OCR 识别</el-tag>
          <el-tag size="small" type="warning" style="margin-right: 8px;">智能脱敏</el-tag>
          <el-tag size="small" type="info">隐私保护</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目简介" :span="2">
          本项目旨在利用边缘计算（Edge Computing）技术，在尽可能靠近用户端的位置进行敏感数据处理。
          通过集成阿里云 OCR 能力与边缘函数（Edge Routine），实现了对文本和身份证图片的高效、安全脱敏。
          用户上传的图片在边缘节点进行预处理和转发，识别结果返回后在前端自动完成敏感区域覆盖，
          确保隐私信息在传输和展示环节的安全性。
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document, Postcard } from '@element-plus/icons-vue';
</script>

<style scoped>
.home-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.hero-section {
  text-align: center;
  margin-bottom: 60px;
}

.project-title {
  font-size: 3em;
  font-weight: 700;
  color: #303133;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.project-subtitle {
  font-size: 1.5em;
  color: #606266;
  margin-bottom: 30px;
  font-weight: 300;
}

.privacy-notice {
  max-width: 800px;
  margin: 0 auto 50px;
}

.feature-cards {
  margin-top: 30px;
}

.feature-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 1.2em;
  font-weight: 600;
  color: #303133;
}

.icon {
  margin-right: 10px;
  font-size: 1.4em;
}

.feature-desc {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
  min-height: 48px;
}

.action-btn {
  width: 100%;
}

.intro-section {
  margin-top: 40px;
}

:deep(.el-descriptions__label) {
  font-weight: bold;
  background-color: #f5f7fa;
}
</style>
