import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 目标文件：edge/env.ts
const targetPath = path.join(__dirname, '../edge/env.ts');

// 从构建环境读取 AppCode
const appCode = process.env.ALIYUN_OCR_APPCODE || '';

const content = `/**
 * 自动生成的文件 - 构建时注入环境变量
 */
export const APP_CODE = "${appCode}";
`;

try {
  fs.writeFileSync(targetPath, content);
  console.log(`[Build] Generated ${targetPath} with AppCode length: ${appCode.length}`);
} catch (error) {
  console.error('[Build] Error generating env file:', error);
  process.exit(1);
}
