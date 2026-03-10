<template>
  <div id="cesium-container" class="cesium-container"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import * as Cesium from 'cesium';

// 设置 Cesium 的默认 Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMmM3NWQyMS01YjM3LTQzY2YtYjYwMy0yZmEyYjA5MDBhZDYiLCJpZCI6ODk0MzcsImlhdCI6MTY0OTg1MTE4OX0.2_9jB1Kac2E28I9srH2u2f2s0dZqgG0pD3fXf2i_b2I';

onMounted(() => {
  const viewer = new Cesium.Viewer('cesium-container', {
    // 在这里可以添加更多的 Viewer 配置项
    // 例如，关闭不必要的 UI 元素
    animation: false, // 动画小部件
    baseLayerPicker: false, // 图层选择器
    fullscreenButton: false, // 全屏按钮
    geocoder: false, // 地理编码器
    homeButton: false, // Home 按钮
    infoBox: false, // 信息框
    sceneModePicker: false, // 场景模式选择器
    selectionIndicator: false, // 选择指示器
    timeline: false, // 时间线
    navigationHelpButton: false, // 导航帮助按钮
    // 使用 OpenStreetMap 作为底图
    terrainProvider: Cesium.createWorldTerrain(),
  });

  // 隐藏 Cesium logo
  (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';
});
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
