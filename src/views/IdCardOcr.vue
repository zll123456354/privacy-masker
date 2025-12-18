<template>
  <div class="ocr-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>身份证 OCR 识别与脱敏</span>
        </div>
      </template>
      
      <div class="upload-section">
        <el-upload
          class="upload-demo"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="false"
          accept="image/*"
        >
          <div class="upload-content">
            <div class="el-upload__text" v-if="!fileName">
              拖拽文件到此处，或 <em>点击上传</em>
            </div>
            <div v-else class="file-info">
              <p>已选文件: {{ fileName }}</p>
              <el-button size="small" type="primary" link>重新选择</el-button>
            </div>
          </div>
        </el-upload>

        <div class="options">
          <el-radio-group v-model="side">
            <el-radio label="face" value="face">人像面 (Face)</el-radio>
            <el-radio label="back" value="back">国徽面 (Back)</el-radio>
          </el-radio-group>
        </div>

        <el-button 
          type="primary" 
          @click="uploadAndRecognize" 
          :loading="loading" 
          :disabled="!base64Image"
          class="submit-btn"
          size="large"
        >
          {{ loading ? '正在识别中...' : '开始识别' }}
        </el-button>
      </div>
    </el-card>

    <div v-if="error" class="error-box">
      <el-alert
        title="错误"
        type="error"
        :description="error"
        show-icon
        :closable="false"
      />
    </div>

    <el-card v-if="result" class="result-box box-card">
      <template #header>
        <div class="card-header">
          <span>识别结果</span>
          <el-button type="primary" link @click="copyAllResults">复制全部结果</el-button>
        </div>
      </template>
      
      <el-descriptions border :column="1" size="large">
        <el-descriptions-item 
          v-for="(value, key) in formattedResult" 
          :key="key" 
          :label="key"
        >
          {{ value }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="mask-section">
        <div class="mask-header">
          <h3>隐私脱敏预览</h3>
          <el-tag type="success" effect="dark">已自动打码</el-tag>
        </div>
        <p class="hint">系统已自动识别并遮挡敏感区域（身份证号、地址），保障隐私安全。</p>
        
        <div class="canvas-wrapper">
          <canvas ref="maskCanvas"></canvas>
        </div>
        
        <div class="actions">
          <el-button type="success" @click="downloadMaskedImage" size="large">
            下载脱敏图片
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { ElMessage } from 'element-plus';

const file = ref<File | null>(null);
const fileName = ref('');
const base64Image = ref('');
const side = ref('face');
const loading = ref(false);
const result = ref<any>(null);
const error = ref('');
const maskCanvas = ref<HTMLCanvasElement | null>(null);

const readJsonOrText = async (response: Response) => {
  const text = await response.text();
  if (!text) return { json: null as any, text: '' };
  try {
    return { json: JSON.parse(text) as any, text };
  } catch {
    return { json: null as any, text };
  }
};

const handleFileChange = (uploadFile: any) => {
  const rawFile = uploadFile.raw;
  if (rawFile) {
    file.value = rawFile;
    fileName.value = rawFile.name;
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

      // 压缩图片
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          base64Image.value = loaded;
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        base64Image.value = canvas.toDataURL('image/jpeg', 0.8);
      };
      img.src = loaded;
    };
    reader.readAsDataURL(file.value as Blob);
  }
};

const generateMaskedImage = async () => {
  if (!result.value || !base64Image.value || !maskCanvas.value) return;

  const img = new Image();
  img.onload = () => {
    const canvas = maskCanvas.value!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const cardRegion = result.value.card_region;
    if (!cardRegion || !Array.isArray(cardRegion) || cardRegion.length < 4) {
      console.warn('未找到卡片区域信息，无法自动脱敏');
      return;
    }

    const p0 = cardRegion[0]; // TL
    const p1 = cardRegion[1]; // TR
    const p2 = cardRegion[2]; // BR
    const p3 = cardRegion[3]; // BL

    const getPoint = (u: number, v: number) => {
      const xt = p0.x + (p1.x - p0.x) * u;
      const yt = p0.y + (p1.y - p0.y) * u;
      const xb = p3.x + (p2.x - p3.x) * u;
      const yb = p3.y + (p2.y - p3.y) * u;
      const x = xt + (xb - xt) * v;
      const y = yt + (yb - yt) * v;
      return { x, y };
    };

    const drawMosaic = (topLeft: {x: number, y: number}, topRight: {x: number, y: number}, bottomRight: {x: number, y: number}, bottomLeft: {x: number, y: number}) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      ctx.clip();
      ctx.filter = 'blur(8px)';
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };

    const maskArea = (u: number, v: number, w: number, h: number) => {
      const pTL = getPoint(u, v);
      const pTR = getPoint(u + w, v);
      const pBR = getPoint(u + w, v + h);
      const pBL = getPoint(u, v + h);
      drawMosaic(pTL, pTR, pBR, pBL);
    };

    if (side.value === 'face') {
      maskArea(0.34, 0.82, 0.63, 0.12);
      maskArea(0.17, 0.48, 0.60, 0.32);
    } else {
      maskArea(0.40, 0.80, 0.55, 0.12);
    }
  };
  img.src = base64Image.value;
};

const downloadMaskedImage = () => {
  if (!maskCanvas.value) return;
  const link = document.createElement('a');
  link.download = `masked_${fileName.value || 'idcard.jpg'}`;
  link.href = maskCanvas.value.toDataURL('image/jpeg', 0.9);
  link.click();
};

watch(result, async (newVal) => {
  if (newVal) {
    await nextTick();
    generateMaskedImage();
  }
});

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imagePayload, side: side.value }),
    });

    const parsed = await readJsonOrText(response);
    const data = parsed.json;

    if (!response.ok) {
      throw new Error(data?.error || data?.message || parsed.text || `识别请求失败 (${response.status})`);
    }

    if (data == null) {
      throw new Error('服务返回数据为空');
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
  if (result.value.name) {
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
  if (result.value.back) {
      const b = result.value.back;
      return {
          "签发机关": b.issue,
          "有效期": `${b.start_date} - ${b.end_date}`,
      };
  }
  return result.value;
});

const copyAllResults = () => {
  const text = Object.entries(formattedResult.value)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制全部结果');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
};
</script>

<style scoped>
.ocr-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.box-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.upload-section {
  text-align: center;
}

.upload-demo {
  margin-bottom: 20px;
}

.file-info {
  padding: 20px 0;
  color: #409eff;
}

.options {
  margin: 20px 0;
}

.submit-btn {
  width: 100%;
  max-width: 300px;
}

.error-box {
  margin-bottom: 20px;
}

.result-box {
  animation: fadeIn 0.5s ease-out;
}

.mask-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #eee;
}

.mask-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mask-header h3 {
  margin: 0;
}

.hint {
  color: #909399;
  font-size: 14px;
  margin-bottom: 20px;
}

.canvas-wrapper {
  margin: 0 auto 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  max-width: 100%;
  display: inline-block;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background: #f5f7fa;
}

.canvas-wrapper canvas {
  max-width: 100%;
  height: auto;
  display: block;
}

.actions {
  text-align: center;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>