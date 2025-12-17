<template>
  <el-card class="result">
    <h3>脱敏结果</h3>
    <el-input type="textarea" :rows="6" :model-value="content" readonly />
    <el-button size="small" @click="copy">复制结果</el-button>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'

const props = defineProps<{ content: string }>()

const copy = () => {
  navigator.clipboard.writeText(props.content)
  ElMessage.success('已复制')
}
</script>

<style scoped>
.result {
  margin-top: 16px;
}
</style>
