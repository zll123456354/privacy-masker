<template>
  <div class="ocr-container">
    <h2>身份证 OCR 识别</h2>
    <div class="upload-section">
      <div class="file-input-wrapper">
        <input type="file" @change="handleFileChange" accept="image/*" />
        <p v-if="fileName">已选文件: {{ fileName }}</p>
      </div>

      <div class="options">
        <label>
          <input type="radio" value="face" v-model="side" /> 人像面 (Face)
        </label>
        <label>
          <input type="radio" value="back" v-model="side" /> 国徽面 (Back)
        </label>
      </div>

      <button @click="uploadAndRecognize" :disabled="!base64Image || loading" class="btn">
        {{ loading ? '识别中...' : '开始识别' }}
      </button>
    </div>

    <div v-if="error" class="error-box">
      <h3>错误</h3>
      <p>{{ error }}</p>
    </div>

    <div v-if="result" class="result-box">
      <h3>识别结果</h3>
      <div class="result-grid">
        <div v-for="(value, key) in formattedResult" :key="key" class="result-item">
          <span class="label">{{ key }}:</span>
          <span class="value">{{ value }}</span>
        </div>
      </div>
      <details>
        <summary>查看原始 JSON</summary>
        <pre>{{ result }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const file = ref<File | null>(null);
const fileName = ref('');
const base64Image = ref('');
const side = ref('face');
const loading = ref(false);
const result = ref<any>(null);
const error = ref('');

const readJsonOrText = async (response: Response) => {
  const text = await response.text();
  if (!text) return { json: null as any, text: '' };
  try {
    return { json: JSON.parse(text) as any, text };
  } catch {
    return { json: null as any, text };
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    file.value = target.files[0];
    fileName.value = file.value.name;
    result.value = null;
    error.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      const loaded = e.target?.result;
      if (typeof loaded !== 'string' || !loaded) {
        error.value = '读取图片失败';
        base64Image.value = '';
        return;
      }
      base64Image.value = loaded;
    };
    reader.readAsDataURL(file.value);
  }
};

const uploadAndRecognize = async () => {
  if (!base64Image.value) return;

  loading.value = true;
  error.value = '';
  result.value = null;

  try {
    const imagePayload =
      typeof base64Image.value === 'string' && base64Image.value.startsWith('data:image/')
        ? base64Image.value.replace(/^data:image\/\w+;base64,/, '')
        : base64Image.value;

    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imagePayload,
        side: side.value,
      }),
    });

    const parsed = await readJsonOrText(response);
    const data = parsed.json;

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        parsed.text ||
        `识别请求失败 (${response.status})`;
      throw new Error(message);
    }

    if (data == null) {
      const preview = parsed.text ? parsed.text.slice(0, 200) : '';
      throw new Error(preview ? `服务返回非 JSON: ${preview}` : '服务返回非 JSON');
    }

    result.value = data;
  } catch (err: any) {
    error.value = err.message || '发生未知错误';
  } finally {
    loading.value = false;
  }
};

const formattedResult = computed(() => {
  if (!result.value) return {};
  // 适配阿里云身份证识别返回结构
  // 通常结构: { success: true, name: "张三", num: "...", ... } 
  // 或者: { outputs: [ { outputValue: { dataValue: { ... } } } ] } 取决于具体 API 版本
  // 假设是直接字段或 face 字段
  
  if (result.value.name) {
      // 扁平结构
      return {
          "姓名": result.value.name,
          "身份证号": result.value.num || result.value.id_num,
          "性别": result.value.sex,
          "民族": result.value.nationality,
          "出生日期": result.value.birth,
          "地址": result.value.address,
      };
  }
  
  if (result.value.face) {
      // 嵌套在 face 字段
      const f = result.value.face;
      return {
          "姓名": f.name,
          "身份证号": f.cert_num || f.id_num,
          "性别": f.sex,
          "民族": f.nationality,
          "出生日期": f.birth,
          "地址": f.address,
      };
  }

  // 如果是反面
  if (result.value.back) {
      const b = result.value.back;
      return {
          "签发机关": b.issue,
          "有效期": `${b.start_date} - ${b.end_date}`,
      };
  }
  
  // 兜底：直接显示部分 key
  return result.value;
});
</script>

<style scoped>
.ocr-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: sans-serif;
}

.upload-section {
  border: 2px dashed #ccc;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
}

.options {
  margin: 15px 0;
}

.options label {
  margin: 0 10px;
  cursor: pointer;
}

.btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-box {
  background-color: #fee;
  border: 1px solid #fcc;
  padding: 10px;
  border-radius: 4px;
  color: #c00;
}

.result-box {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 4px;
}

.result-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.label {
  font-weight: bold;
  text-align: right;
  color: #555;
}

.value {
  text-align: left;
}
</style>
