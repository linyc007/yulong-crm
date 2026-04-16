import { showToast, showConfirm } from '../utils/helpers.js';

let apiKey = localStorage.getItem('gemini_api_key') || '';
let modelImageBase64 = null;
let clothingImageBase64 = null;

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Only keep the base64 part
    reader.onerror = error => reject(error);
  });
}

// Attach drag & drop / click upload handlers
function setupUploader(boxId, hiddenInputId, stateVarSetter, previewId) {
  const box = document.getElementById(boxId);
  const input = document.getElementById(hiddenInputId);
  const preview = document.getElementById(previewId);

  box.addEventListener('click', () => input.click());

  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.classList.add('drag-over');
  });

  box.addEventListener('dragleave', () => {
    box.classList.remove('drag-over');
  });

  box.addEventListener('drop', async (e) => {
    e.preventDefault();
    box.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }
    const base64 = await fileToBase64(file);
    stateVarSetter(base64, file.type);

    // Show preview
    preview.style.backgroundImage = `url(data:${file.type};base64,${base64})`;
    preview.style.display = 'block';
    box.querySelector('.upload-placeholder').style.display = 'none';
  }
}

let modelMimeType = '';
let clothingMimeType = '';

export async function renderAIStudio(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background: linear-gradient(135deg, #FF6B6B, #9B59B6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        ✨ AI 商拍中心
      </h1>
      <button class="btn btn-secondary btn-sm" id="btn-api-key">
        🔑 ${apiKey ? '已配置 API' : '配置 Gemini API'}
      </button>
    </div>

    <div class="page-content aistudio-content">
      <div class="studio-upload-grid">
        <div class="upload-card">
          <div class="card-header"><div class="card-title">👤 1. 上传模特照片</div></div>
          <div class="card-body">
            <div class="upload-box" id="upload-model">
              <input type="file" id="input-model" accept="image/*" hidden>
              <div class="upload-preview" id="preview-model"></div>
              <div class="upload-placeholder">
                <span style="font-size:32px;display:block;margin-bottom:8px">👱‍♀️</span>
                <span>点击或拖拽模特照片至此</span><br>
                <small style="color:var(--text-secondary)">建议全图清晰可见人物体态</small>
              </div>
            </div>
          </div>
        </div>

        <div class="upload-card">
          <div class="card-header"><div class="card-title">👗 2. 上传服装照片</div></div>
          <div class="card-body">
            <div class="upload-box" id="upload-clothing">
              <input type="file" id="input-clothing" accept="image/*" hidden>
              <div class="upload-preview" id="preview-clothing"></div>
              <div class="upload-placeholder">
                <span style="font-size:32px;display:block;margin-bottom:8px">👕</span>
                <span>点击或拖拽服装照片至此</span><br>
                <small style="color:var(--text-secondary)">建议衣服平铺或白底挂拍</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-16" style="border: 1px solid rgba(155,89,182,0.2); box-shadow: 0 8px 30px rgba(155,89,182,0.05);">
        <div class="card-header"><div class="card-title">⚙️ 3. 拍摄设定</div></div>
        <div class="card-body">
          <div class="form-group row">
            <label class="form-label" style="min-width:70px">拍摄风格</label>
            <div class="pill-group" id="style-group">
              <button class="pill active" data-style="professional e-commerce studio photoshoot, solid color background, dramatic studio lighting">影棚白底</button>
              <button class="pill" data-style="outdoor street photography, modern city streets background, natural sunlight, depth of field">都市街拍</button>
              <button class="pill" data-style="luxurious living room background, natural soft window light, elegant and premium vibe">室内轻奢</button>
              <button class="pill" data-style="beach vacation background, sunny sunny, bright and vibrant color grading">海滨度假</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
              附加定制要求（选填）
              <span style="font-size:12px; color:var(--text-secondary); font-weight:normal;">会在生成时被应用</span>
            </label>
            <textarea class="form-input" id="input-initial-adjustment" placeholder="例如：裙子改到脚踝长度、将这件T恤变成分体式、换成蓝色调..." style="min-height: 80px; resize: vertical; font-size: 14px; padding: 12px;"></textarea>
          </div>
          
          <button class="btn aistudio-btn-generate" id="btn-generate" style="margin-top: 16px;">
            <span class="btn-icon">✨</span> 立即生成大片
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📸 成片画廊</div>
        </div>
        <div class="card-body">
          <div class="gallery-grid" id="gallery-container">
            <!-- Images will be inserted here -->
            <div class="gallery-empty">上传照片并生成后，成品大片将展现在这里</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Restore previous states if navigating back
  if (modelImageBase64) {
    const preview = document.getElementById('preview-model');
    preview.style.backgroundImage = `url(data:${modelMimeType};base64,${modelImageBase64})`;
    preview.style.display = 'block';
    document.querySelector('#upload-model .upload-placeholder').style.display = 'none';
  }
  if (clothingImageBase64) {
    const preview = document.getElementById('preview-clothing');
    preview.style.backgroundImage = `url(data:${clothingMimeType};base64,${clothingImageBase64})`;
    preview.style.display = 'block';
    document.querySelector('#upload-clothing .upload-placeholder').style.display = 'none';
  }

  // Setup uploaders
  setupUploader('upload-model', 'input-model', (b64, type) => { modelImageBase64 = b64; modelMimeType = type; }, 'preview-model');
  setupUploader('upload-clothing', 'input-clothing', (b64, type) => { clothingImageBase64 = b64; clothingMimeType = type; }, 'preview-clothing');

  // Pill group selection
  let selectedStyle = document.querySelector('#style-group .pill.active').dataset.style;
  document.querySelectorAll('#style-group .pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('#style-group .pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      selectedStyle = e.target.dataset.style;
    });
  });

  // API Key handler
  document.getElementById('btn-api-key').addEventListener('click', () => {
    const key = prompt('请输入您的 Google Gemini API Key:', apiKey);
    if (key !== null) {
      if (key.trim() === '') {
        localStorage.removeItem('gemini_api_key');
        apiKey = '';
        document.getElementById('btn-api-key').innerHTML = '🔑 配置 Gemini API';
        showToast('API Key 已清除', 'info');
      } else {
        localStorage.setItem('gemini_api_key', key.trim());
        apiKey = key.trim();
        document.getElementById('btn-api-key').innerHTML = '🔑 已配置 API';
        showToast('API Key 已保存', 'success');
      }
    }
  });

  // Generate Handler
  document.getElementById('btn-generate').addEventListener('click', async () => {
    if (!apiKey) {
      showToast('生成需要消耗算力，请先配置 Gemini API Key', 'error');
      return;
    }
    if (!clothingImageBase64) {
      showToast('至少需要上传一张服装照片', 'error');
      return;
    }

    const gallery = document.getElementById('gallery-container');
    const emptyText = gallery.querySelector('.gallery-empty');
    if (emptyText) emptyText.remove();

    // 提取统一的生成流程，支持传入微调指令
    async function processGeneration(adjustmentInst = '') {
      // Create skeleton loader
      const skeletonId = 'skel-' + Date.now();
      gallery.insertAdjacentHTML('afterbegin', `
        <div class="gallery-item skeleton-item" id="${skeletonId}" style="height: auto; aspect-ratio: auto; padding-bottom: 200px;">
          <div class="skeleton-shimmer"></div>
          <div class="skeleton-text">正在唤醒专用图像通道 (Nanobanana VTON)...</div>
        </div>
      `);

      try {
        if (adjustmentInst) showToast('应用微调指令重新渲染中...', 'info');
        else showToast('原生试衣渲染中...', 'info');
        
        const imageBase64 = await runVirtualTryOn(selectedStyle, adjustmentInst);
        
        // Remove skeleton and add actual image
        document.getElementById(skeletonId)?.remove();
        const itemId = 'res-' + Date.now();
        gallery.insertAdjacentHTML('afterbegin', `
          <div class="gallery-item result-item" id="${itemId}" style="animation: slideDownUpdate 0.5s cubic-bezier(0.16, 1, 0.3, 1); height: auto; aspect-ratio: auto; display: flex; flex-direction: column;">
            <div style="position: relative; flex: 1;">
              <img src="data:image/jpeg;base64,${imageBase64}" alt="Generated Photo" style="width:100%; height:100%; object-fit:cover; border-radius:12px 12px 0 0;">
              <div class="item-overlay" style="border-radius: 12px 12px 0 0;">
                <button class="btn btn-sm btn-primary" onclick="const a=document.createElement('a');a.href='data:image/jpeg;base64,${imageBase64}';a.download='AI_Model_Photo.jpg';a.click()"><span style="margin-right:4px">💾</span> 保存</button>
              </div>
            </div>
            <div style="padding: 12px; background: var(--bg-card); border-top: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 8px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">✨ 使用此图为基准继续微调</div>
              <textarea class="form-input adjustment-input" placeholder="例如：以上面生成的这张为准，将裙子改短、加长袖子..." style="font-size: 13px; padding: 8px 12px; min-height: 60px; resize: none;"></textarea>
              <button class="btn btn-secondary btn-sm adjustment-btn" style="width: 100%;">
                <span style="margin-right:4px">🔄</span> 基于此图再次微调 (衍生)
              </button>
            </div>
          </div>
        `);
        showToast(adjustmentInst ? '微调大片生成完毕！' : '大片生成成功！', 'success');

        // Bind adjustment button
        const newEl = document.getElementById(itemId);
        newEl.querySelector('.adjustment-btn').addEventListener('click', () => {
          const adj = newEl.querySelector('.adjustment-input').value.trim();
          if (!adj) {
            showToast('请先输入微调要求', 'warning');
            return;
          }
          processGeneration(adj);
        });

      } catch (err) {
        document.getElementById(skeletonId)?.remove();
        console.error(err);
        showToast('生成失败: ' + err.message, 'error');
      }
    }

    const initialText = document.getElementById('input-initial-adjustment')?.value.trim() || '';
    processGeneration(initialText);
  });

  // Dedicated Native Nanobanana Image Generation
  async function runVirtualTryOn(style, adjustmentText = '') {
    // 使用专门的多模态/原生图像生成专属别名
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
    
    let baseText = `Act as a Native Virtual Try-On (VTON) Engine.
${modelImageBase64 ? 'Image 1 is the subject model. Image 2 is the exact subject reference clothing.' : 'Generate a model wearing the clothing in Image 1.'}
CRITICAL INSTRUCTION: Perform a pure image replacement. Output ONLY a rendered image combining the model and the EXACT clothing. Do not modify the clothing design.
Environmental setting: "${style}".`;

    if (adjustmentText) {
      baseText += `\n\nUSER MODIFICATION REQUEST:
The user has requested the following adjustment for the clothing/model: "${adjustmentText}".
Please strictly apply this adjustment (e.g., changing clothing length, modifying sleeves, adjusting color) to the output image while preserving everything else perfectly.`;
    }

    const parts = [
      { "text": baseText }
    ];

    if (modelImageBase64) {
      parts.push({ "inlineData": { "mimeType": modelMimeType, "data": modelImageBase64 } });
    }
    parts.push({ "inlineData": { "mimeType": clothingMimeType, "data": clothingImageBase64 } });

    const payload = {
      "contents": [{ "parts": parts }]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || data.candidates.length === 0) throw new Error("无返回资源。");
    
    const candParts = data.candidates[0].content.parts;
    
    // Check for inlineData
    for (const p of candParts) {
       if (p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith("image/")) {
           return p.inlineData.data;
       }
    }
    
    // Fallback detection
    const textPart = candParts.find(p => p.text);
    console.error("Return text from dedicated endpoint:", textPart?.text);

    if (textPart && textPart.text.length > 500 && textPart.text.indexOf("iVBORw0KGgo") !== -1) {
       throw new Error("模型吐出了图片原始文本代码而不是包裹参数，需检查数据流封装格式！");
    }

    throw new Error("端点调用成功但生成的依然是纯文本。说明专属图像通道 (Nanobanana VTON) 在您当前区域/API中尚未全量铺设！");
  }
}
