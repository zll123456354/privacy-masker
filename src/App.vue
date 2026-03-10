<template>
  <div class="app-container">
    <el-menu
      :default-active="activeIndex"
      class="app-menu"
      mode="horizontal"
      @select="handleSelect"
      :router="true"
    >
      <el-menu-item index="/">首页</el-menu-item>
      <el-menu-item index="/text-mask">文本脱敏</el-menu-item>
      <el-menu-item index="/id-card-ocr">身份证 OCR</el-menu-item>
      <el-menu-item index="/cesium">Cesium 示例</el-menu-item>
    </el-menu>
    <div class="view-container">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activeIndex = ref(route.path);

const handleSelect = (key: string) => {
  activeIndex.value = key;
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-menu {
  flex-shrink: 0;
}

.view-container {
  flex-grow: 1;
  overflow: auto; /* 确保内容超出时可以滚动 */
  position: relative; /* 为 Cesium 容器提供定位上下文 */
}

/* 确保 router-view 和其子元素撑满容器 */
:deep(.view-container > *) {
  height: 100%;
  width: 100%;
}
</style>
