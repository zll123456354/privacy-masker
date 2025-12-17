<template>
  <el-card>
    <h2>Edge Privacy Masker</h2>
    <p>示例文本与脱敏演示请进入主页面。</p>
    <div style="display: flex; gap: 10px;">
      <el-button type="primary" @click="$router.push('/text-mask')">进入脱敏页面</el-button>
      <el-button type="success" @click="$router.push('/id-card-ocr')">身份证 OCR 识别</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts"></script>

<style scoped></style>
