<template>
  <el-card>
    <h2>文本隐私脱敏（Edge AI）</h2>

    <el-input
      v-model="text"
      type="textarea"
      :rows="6"
      placeholder="输入包含手机号、身份证、邮箱的文本"
    />

    <el-button
      type="primary"
      class="mt"
      :loading="loading"
      @click="handleMask"
    >
      开始脱敏
    </el-button>

    <ResultBox v-if="result" :content="result" />
  </el-card>
  </template>

<script setup lang="ts">
import { ref } from 'vue'
import { maskText } from '@/api/mask'
import ResultBox from '@/components/ResultBox.vue'

const text = ref('')
const result = ref('')
const loading = ref(false)

const handleMask = async () => {
  if (!text.value) return
  loading.value = true
  const res = await maskText(text.value)
  result.value = res.result
  loading.value = false
}
</script>

<style scoped>
.mt {
  margin-top: 12px;
}
</style>
