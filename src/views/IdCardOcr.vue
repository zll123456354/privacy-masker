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

      <div class="mask-section">
        <h3>隐私脱敏</h3>
        <p class="hint">系统已自动识别并遮挡身份证号和地址区域。您可以点击下载脱敏图片。</p>
        <div class="canvas-wrapper">
          <canvas ref="maskCanvas"></canvas>
        </div>
        <button @click="downloadMaskedImage" class="btn download-btn">
          下载脱敏图片
        </button>
      </div>

      <details>
        <summary>查看原始 JSON</summary>
        <pre>{{ result }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';

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

      // 压缩图片
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scaleSize = MAX_WIDTH / img.width;
        
        // 只有当图片宽度大于 MAX_WIDTH 时才压缩
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          base64Image.value = loaded; // 回退到原始图片
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 使用 JPEG 格式压缩，质量 0.8
        base64Image.value = canvas.toDataURL('image/jpeg', 0.8);
      };
      img.src = loaded;
    };
    reader.readAsDataURL(file.value);
  }
};

// 自动生成脱敏图片
const generateMaskedImage = async () => {
  if (!result.value || !base64Image.value || !maskCanvas.value) return;

  const img = new Image();
  img.onload = () => {
    const canvas = maskCanvas.value!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 Canvas 尺寸为图片原始尺寸
    canvas.width = img.width;
    canvas.height = img.height;

    // 绘制原图
    ctx.drawImage(img, 0, 0);

    // 获取卡片区域
    const cardRegion = result.value.card_region;
    if (!cardRegion || !Array.isArray(cardRegion) || cardRegion.length < 4) {
      console.warn('未找到卡片区域信息，无法自动脱敏');
      return;
    }

    // 提取 4 个角点 (假设顺序: 左上, 右上, 右下, 左下)
    // 阿里云 OCR 通常返回的顺序就是这个，但为了保险，可以根据坐标排序
    // 这里先直接使用返回顺序，通常是顺时针
    const p0 = cardRegion[0]; // TL
    const p1 = cardRegion[1]; // TR
    const p2 = cardRegion[2]; // BR
    const p3 = cardRegion[3]; // BL

    // 双线性插值辅助函数：根据相对坐标 (u, v) 计算实际像素坐标 (x, y)
    // u: 横向比例 (0-1), v: 纵向比例 (0-1)
    const getPoint = (u: number, v: number) => {
      // 顶部插值点
      const xt = p0.x + (p1.x - p0.x) * u;
      const yt = p0.y + (p1.y - p0.y) * u;
      
      // 底部插值点
      const xb = p3.x + (p2.x - p3.x) * u;
      const yb = p3.y + (p2.y - p3.y) * u;

      // 纵向插值
      const x = xt + (xb - xt) * v;
      const y = yt + (yb - yt) * v;
      
      return { x, y };
    };

    // 马赛克绘制函数
    const drawMosaic = (topLeft: {x: number, y: number}, topRight: {x: number, y: number}, bottomRight: {x: number, y: number}, bottomLeft: {x: number, y: number}) => {
      ctx.save();
      
      // 1. 创建裁剪路径
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      ctx.clip();

      // 2. 计算包围盒
      const xs = [topLeft.x, topRight.x, bottomRight.x, bottomLeft.x];
      const ys = [topLeft.y, topRight.y, bottomRight.y, bottomLeft.y];
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // 3. 绘制马赛克
      const size = 8; // 马赛克块大小
      // 获取区域图像数据
      // 注意：getImageData 开销较大，但对于小区域是可以接受的
      // 为了性能，我们可以只采样中心点颜色，或者直接绘制模糊效果
      // 这里使用更高效的"模糊绘制法"：先缩小绘制再放大绘制
      
      // 简单且高性能的马赛克模拟：
      for (let y = minY; y < maxY; y += size) {
        for (let x = minX; x < maxX; x += size) {
          // 简单的采样：取块中心的颜色
          // 这里为了不频繁调用 getImageData (太慢)，我们可以先画一个全屏的离屏 canvas 做采样，或者...
          // 其实最简单的“高逼格”打码是：高斯模糊
        }
      }
      
      // 方案B：使用 Canvas Filter 实现模糊 (浏览器支持度很好)
      // 这比马赛克更平滑，且代码极少
      ctx.filter = 'blur(8px)';
      // 重新绘制原图的该区域（被 clip 限制住）
      // 为了防止模糊边缘透明，可以先填一个底色，或者扩大一点绘制区域
      ctx.drawImage(img, 0, 0);
      
      // 如果非要马赛克风格，可以使用 pattern
      // 这里我们采用"模糊"效果，通常看起来更现代
      
      ctx.restore();
      
      // 描边框，增加科技感 (可选)
      /*
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      ctx.stroke();
      */
    };

    // 绘制遮挡区域 (支持旋转)
    const maskArea = (u: number, v: number, w: number, h: number) => {
      const pTL = getPoint(u, v);
      const pTR = getPoint(u + w, v);
      const pBR = getPoint(u + w, v + h);
      const pBL = getPoint(u, v + h);
      
      drawMosaic(pTL, pTR, pBR, pBL);
    };

    if (side.value === 'face') {
      // 1. 身份证号 (底部，宽约60%，高约12%)
      // 调整坐标以更精确覆盖
      maskArea(0.34, 0.82, 0.63, 0.12);

      // 2. 地址 (中间偏下)
      maskArea(0.17, 0.48, 0.60, 0.32);
    } else {
      // 背面 (有效期限)
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

// 监听结果变化，自动生成脱敏图片
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
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.result-box {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.result-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-weight: bold;
  color: #666;
  font-size: 0.9em;
}

.value {
  margin-top: 4px;
  font-size: 1.1em;
  color: #333;
}

/* 脱敏相关样式 */
.mask-section {
  margin: 30px 0 20px;
  padding: 20px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.hint {
  color: #666;
  font-size: 0.9em;
  margin-bottom: 15px;
}

.canvas-wrapper {
  margin: 15px auto;
  border: 1px solid #eee;
  overflow: hidden;
  max-width: 100%;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  background: #f0f0f0;
}

.canvas-wrapper canvas {
  max-width: 100%;
  height: auto;
  display: block;
}

.download-btn {
  background-color: #28a745;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
  margin-top: 10px;
}

.download-btn:hover {
  background-color: #218838;
}

details {
  margin-top: 20px;
  color: #666;
  cursor: pointer;
}

pre {
  background: #eee;
  padding: 10px;
  overflow-x: auto;
  border-radius: 4px;
  text-align: left;
}
</style>

