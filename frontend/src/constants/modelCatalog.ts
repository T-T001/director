export type Capability =
  | 'chat'
  | 'image'
  | 'image_edit'
  | 'tts'
  | 'stt'
  | 'embedding'
  | 'video'
  | 'lipsync'

export type Protocol =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openai-image'
  | 'openai-tts'
  | 'openai-embedding'
  | 'raw'

export type CatalogModel = {
  model_id: string
  display_name: string
  capability: Capability
  protocol: Protocol
  request_path: string
}

export type CatalogCategory = 'llm' | 'image' | 'video' | 'audio' | 'aggregator' | 'local'

export type CatalogProvider = {
  key: string
  name: string
  category: CatalogCategory
  default_base_url: string
  website?: string
  description?: string
  models: CatalogModel[]
}

const OPENAI_CHAT = '/v1/chat/completions'
const OPENAI_IMAGE = '/v1/images/generations'
const OPENAI_TTS = '/v1/audio/speech'
const OPENAI_STT = '/v1/audio/transcriptions'
const OPENAI_EMBED = '/v1/embeddings'
const OPENAI_VIDEO = '/v1/videos/generations'

export const CATEGORY_LABEL: Record<CatalogCategory, string> = {
  llm: '通用大模型',
  image: '图像生成',
  video: '视频生成',
  audio: '语音合成/识别',
  aggregator: '聚合/转发',
  local: '本地部署',
}

export const CAPABILITY_LABEL: Record<Capability, string> = {
  chat: '对话',
  image: '图像',
  image_edit: '图像编辑',
  tts: '语音合成',
  stt: '语音识别',
  embedding: '向量',
  video: '视频',
  lipsync: '对口型',
}

export const CAPABILITY_TONE: Record<Capability, string> = {
  chat: 'bg-[rgba(72,209,204,0.12)] text-[#8ee9e4] border-[rgba(72,209,204,0.30)]',
  image: 'bg-[rgba(168,113,255,0.14)] text-[#cbb6ff] border-[rgba(168,113,255,0.32)]',
  image_edit: 'bg-[rgba(232,121,198,0.14)] text-[#f0b6e0] border-[rgba(232,121,198,0.32)]',
  tts: 'bg-[rgba(79,209,143,0.14)] text-[#8be4b4] border-[rgba(79,209,143,0.30)]',
  stt: 'bg-[rgba(45,212,191,0.13)] text-[#7fe6d4] border-[rgba(45,212,191,0.30)]',
  embedding: 'bg-[rgba(255,229,180,0.08)] text-[var(--glass-text-secondary)] border-[var(--glass-stroke-base)]',
  video: 'bg-[rgba(255,179,71,0.14)] text-[#ffd08a] border-[rgba(255,179,71,0.32)]',
  lipsync: 'bg-[rgba(255,107,95,0.14)] text-[#ff9b92] border-[rgba(255,107,95,0.32)]',
}

export const PROTOCOL_LABEL: Record<Protocol, string> = {
  openai: 'OpenAI 兼容',
  anthropic: 'Anthropic',
  gemini: 'Gemini 原生',
  'openai-image': 'OpenAI 图像',
  'openai-tts': 'OpenAI TTS',
  'openai-embedding': 'OpenAI 向量',
  raw: '原生 (仅连通性测试)',
}

export const PROTOCOL_DESCRIPTION: Record<Protocol, string> = {
  openai:
    'POST body: {model, messages, max_tokens}; auth: Authorization: Bearer。绝大多数国产 LLM/OpenRouter/Groq 都走这个。',
  anthropic:
    'POST body: {model, max_tokens, messages}; auth: x-api-key + anthropic-version: 2023-06-01。',
  gemini:
    'POST body: {contents:[{parts}]}, auth: ?key=... 拼在 URL 上。Google 原生 v1beta API。',
  'openai-image':
    'POST body: {model, prompt, size}; auth: Bearer。OpenAI DALL-E / gpt-image-1 / 兼容 relay 的 /v1/images/generations。',
  'openai-tts':
    'POST body: {model, input, voice}; auth: Bearer。返回音频二进制。',
  'openai-embedding':
    'POST body: {model, input}; auth: Bearer。',
  raw:
    '只做连通性打点：把 {} 或 {model} POST 到目标 URL，返回真实 HTTP 状态。不保证业务调用能走通。',
}

export const MODEL_CATALOG: CatalogProvider[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    category: 'llm',
    default_base_url: 'https://api.openai.com',
    website: 'https://platform.openai.com',
    description: 'GPT / DALL-E / Sora / Whisper 官方接口',
    models: [
      { model_id: 'gpt-5', display_name: 'GPT-5', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'gpt-5-mini', display_name: 'GPT-5 mini', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'gpt-4o', display_name: 'GPT-4o', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'gpt-4o-mini', display_name: 'GPT-4o mini', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'o3', display_name: 'o3 (推理)', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'gpt-image-1', display_name: 'GPT Image 1', capability: 'image', protocol: 'openai-image', request_path: OPENAI_IMAGE },
      { model_id: 'dall-e-3', display_name: 'DALL·E 3', capability: 'image', protocol: 'openai-image', request_path: OPENAI_IMAGE },
      { model_id: 'sora-2', display_name: 'Sora 2', capability: 'video', protocol: 'raw', request_path: OPENAI_VIDEO },
      { model_id: 'tts-1-hd', display_name: 'TTS-1 HD', capability: 'tts', protocol: 'openai-tts', request_path: OPENAI_TTS },
      { model_id: 'whisper-1', display_name: 'Whisper', capability: 'stt', protocol: 'raw', request_path: OPENAI_STT },
      { model_id: 'text-embedding-3-large', display_name: 'Embedding v3 Large', capability: 'embedding', protocol: 'openai-embedding', request_path: OPENAI_EMBED },
    ],
  },
  {
    key: 'anthropic',
    name: 'Anthropic Claude',
    category: 'llm',
    default_base_url: 'https://api.anthropic.com',
    website: 'https://console.anthropic.com',
    description: 'Claude 4.x 系列 (原生协议)',
    models: [
      { model_id: 'claude-opus-4-7', display_name: 'Claude Opus 4.7', capability: 'chat', protocol: 'anthropic', request_path: '/v1/messages' },
      { model_id: 'claude-sonnet-4-6', display_name: 'Claude Sonnet 4.6', capability: 'chat', protocol: 'anthropic', request_path: '/v1/messages' },
      { model_id: 'claude-haiku-4-5', display_name: 'Claude Haiku 4.5', capability: 'chat', protocol: 'anthropic', request_path: '/v1/messages' },
    ],
  },
  {
    key: 'gemini',
    name: 'Google Gemini',
    category: 'llm',
    default_base_url: 'https://generativelanguage.googleapis.com',
    website: 'https://ai.google.dev',
    description: 'Gemini 2.5 原生 (也可接 OpenAI 兼容 relay 后切换为 openai 协议)',
    models: [
      { model_id: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', capability: 'chat', protocol: 'gemini', request_path: '/v1beta/models/gemini-2.5-pro:generateContent' },
      { model_id: 'gemini-2.5-flash', display_name: 'Gemini 2.5 Flash', capability: 'chat', protocol: 'gemini', request_path: '/v1beta/models/gemini-2.5-flash:generateContent' },
      { model_id: 'gemini-2.5-flash-lite', display_name: 'Gemini 2.5 Flash Lite', capability: 'chat', protocol: 'gemini', request_path: '/v1beta/models/gemini-2.5-flash-lite:generateContent' },
      { model_id: 'imagen-4', display_name: 'Imagen 4', capability: 'image', protocol: 'raw', request_path: '/v1beta/models/imagen-4:generateImage' },
      { model_id: 'veo-3', display_name: 'Veo 3', capability: 'video', protocol: 'raw', request_path: '/v1beta/models/veo-3:predictLongRunning' },
    ],
  },
  {
    key: 'deepseek',
    name: 'DeepSeek',
    category: 'llm',
    default_base_url: 'https://api.deepseek.com',
    website: 'https://platform.deepseek.com',
    description: '国产开源 LLM (OpenAI 兼容)',
    models: [
      { model_id: 'deepseek-chat', display_name: 'DeepSeek V3', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'deepseek-reasoner', display_name: 'DeepSeek R1 (推理)', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
    ],
  },
  {
    key: 'moonshot',
    name: 'Moonshot / Kimi',
    category: 'llm',
    default_base_url: 'https://api.moonshot.cn',
    website: 'https://platform.moonshot.cn',
    description: 'Kimi 长上下文模型 (OpenAI 兼容)',
    models: [
      { model_id: 'kimi-k2', display_name: 'Kimi K2', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'moonshot-v1-128k', display_name: 'Moonshot v1 128k', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'moonshot-v1-32k', display_name: 'Moonshot v1 32k', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
    ],
  },
  {
    key: 'qwen',
    name: '通义千问 Qwen',
    category: 'llm',
    default_base_url: 'https://dashscope.aliyuncs.com/compatible-mode',
    website: 'https://dashscope.aliyun.com',
    description: '阿里云百炼 OpenAI 兼容模式 (建议 Base URL 就用 compatible-mode)',
    models: [
      { model_id: 'qwen-max', display_name: 'Qwen Max', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'qwen-plus', display_name: 'Qwen Plus', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'qwen-turbo', display_name: 'Qwen Turbo', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'qwen-vl-max', display_name: 'Qwen VL Max (视觉)', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'wanx-v1', display_name: '通义万相 V1', capability: 'image', protocol: 'raw', request_path: '/api/v1/services/aigc/text2image/image-synthesis' },
    ],
  },
  {
    key: 'zhipu',
    name: '智谱 GLM',
    category: 'llm',
    default_base_url: 'https://open.bigmodel.cn/api/paas',
    website: 'https://open.bigmodel.cn',
    description: '智谱 GLM (OpenAI 兼容 path)',
    models: [
      { model_id: 'glm-4.6', display_name: 'GLM-4.6', capability: 'chat', protocol: 'openai', request_path: '/v4/chat/completions' },
      { model_id: 'glm-4-plus', display_name: 'GLM-4 Plus', capability: 'chat', protocol: 'openai', request_path: '/v4/chat/completions' },
      { model_id: 'glm-4-air', display_name: 'GLM-4 Air', capability: 'chat', protocol: 'openai', request_path: '/v4/chat/completions' },
      { model_id: 'cogview-3-plus', display_name: 'CogView-3 Plus', capability: 'image', protocol: 'raw', request_path: '/v4/images/generations' },
      { model_id: 'cogvideox', display_name: 'CogVideoX', capability: 'video', protocol: 'raw', request_path: '/v4/videos/generations' },
    ],
  },
  {
    key: 'doubao',
    name: '豆包 Doubao',
    category: 'llm',
    default_base_url: 'https://ark.cn-beijing.volces.com/api',
    website: 'https://www.volcengine.com/product/doubao',
    description: '字节火山方舟 (OpenAI 兼容 path，注意 model_id 要填 endpoint id)',
    models: [
      { model_id: 'doubao-pro-256k', display_name: '豆包 Pro 256k (endpoint_id)', capability: 'chat', protocol: 'openai', request_path: '/v3/chat/completions' },
      { model_id: 'doubao-pro-32k', display_name: '豆包 Pro 32k (endpoint_id)', capability: 'chat', protocol: 'openai', request_path: '/v3/chat/completions' },
      { model_id: 'doubao-lite-32k', display_name: '豆包 Lite 32k (endpoint_id)', capability: 'chat', protocol: 'openai', request_path: '/v3/chat/completions' },
      { model_id: 'doubao-seedream-3-0', display_name: 'Seedream 3.0 图像', capability: 'image', protocol: 'raw', request_path: '/v3/images/generations' },
    ],
  },
  {
    key: 'groq',
    name: 'Groq',
    category: 'llm',
    default_base_url: 'https://api.groq.com/openai',
    website: 'https://console.groq.com',
    description: '超低延迟推理 (OpenAI 兼容)',
    models: [
      { model_id: 'llama-3.3-70b-versatile', display_name: 'Llama 3.3 70B', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'llama-3.1-8b-instant', display_name: 'Llama 3.1 8B', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'mixtral-8x7b-32768', display_name: 'Mixtral 8x7B', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
    ],
  },
  {
    key: 'xai',
    name: 'xAI Grok',
    category: 'llm',
    default_base_url: 'https://api.x.ai',
    website: 'https://console.x.ai',
    description: 'xAI Grok (OpenAI 兼容)',
    models: [
      { model_id: 'grok-4', display_name: 'Grok 4', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'grok-4-mini', display_name: 'Grok 4 mini', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'grok-2-vision', display_name: 'Grok 2 Vision', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
    ],
  },
  {
    key: 'mistral',
    name: 'Mistral AI',
    category: 'llm',
    default_base_url: 'https://api.mistral.ai',
    website: 'https://console.mistral.ai',
    description: '欧洲开源 LLM (OpenAI 兼容)',
    models: [
      { model_id: 'mistral-large-latest', display_name: 'Mistral Large', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'mistral-small-latest', display_name: 'Mistral Small', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'pixtral-large-latest', display_name: 'Pixtral Large (视觉)', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
    ],
  },
  {
    key: 'siliconflow',
    name: 'SiliconFlow 硅基流动',
    category: 'aggregator',
    default_base_url: 'https://api.siliconflow.cn',
    website: 'https://siliconflow.cn',
    description: '国产开源模型聚合 (全 OpenAI 兼容)',
    models: [
      { model_id: 'deepseek-ai/DeepSeek-V3', display_name: 'DeepSeek V3', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'Qwen/Qwen2.5-72B-Instruct', display_name: 'Qwen 2.5 72B', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'black-forest-labs/FLUX.1-schnell', display_name: 'FLUX.1 schnell', capability: 'image', protocol: 'openai-image', request_path: OPENAI_IMAGE },
      { model_id: 'black-forest-labs/FLUX.1-dev', display_name: 'FLUX.1 dev', capability: 'image', protocol: 'openai-image', request_path: OPENAI_IMAGE },
    ],
  },
  {
    key: 'openrouter',
    name: 'OpenRouter',
    category: 'aggregator',
    default_base_url: 'https://openrouter.ai/api',
    website: 'https://openrouter.ai',
    description: '多家模型聚合 (统一 OpenAI 兼容)',
    models: [
      { model_id: 'anthropic/claude-opus-4.7', display_name: 'Claude Opus 4.7', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'openai/gpt-5', display_name: 'GPT-5', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'google/gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
    ],
  },
  {
    key: 'azure-openai',
    name: 'Azure OpenAI',
    category: 'aggregator',
    default_base_url: 'https://YOUR-RESOURCE.openai.azure.com',
    website: 'https://azure.microsoft.com',
    description:
      'Azure 部署 (注意：需要在额外 Headers 里加 {"api-key":"你的key"}，因 Azure 不走 Bearer)',
    models: [
      { model_id: 'gpt-4o', display_name: 'GPT-4o (deployment)', capability: 'chat', protocol: 'openai', request_path: '/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21' },
      { model_id: 'gpt-4o-mini', display_name: 'GPT-4o mini (deployment)', capability: 'chat', protocol: 'openai', request_path: '/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21' },
    ],
  },
  {
    key: 'ollama',
    name: 'Ollama',
    category: 'local',
    default_base_url: 'http://localhost:11434',
    website: 'https://ollama.com',
    description: '本地部署模型 (OpenAI 兼容)',
    models: [
      { model_id: 'llama3.3', display_name: 'Llama 3.3', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'qwen2.5', display_name: 'Qwen 2.5', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'deepseek-r1', display_name: 'DeepSeek R1', capability: 'chat', protocol: 'openai', request_path: OPENAI_CHAT },
      { model_id: 'nomic-embed-text', display_name: 'Nomic Embed', capability: 'embedding', protocol: 'openai-embedding', request_path: OPENAI_EMBED },
    ],
  },
  {
    key: 'bfl',
    name: 'Black Forest Labs (Flux)',
    category: 'image',
    default_base_url: 'https://api.bfl.ai',
    website: 'https://bfl.ai',
    description: 'Flux 系列图像模型 (原生协议，业务调用需额外实现)',
    models: [
      { model_id: 'flux-1.1-pro', display_name: 'Flux 1.1 Pro', capability: 'image', protocol: 'raw', request_path: '/v1/flux-pro-1.1' },
      { model_id: 'flux-1-pro', display_name: 'Flux 1 Pro', capability: 'image', protocol: 'raw', request_path: '/v1/flux-pro' },
      { model_id: 'flux-1-dev', display_name: 'Flux 1 Dev', capability: 'image', protocol: 'raw', request_path: '/v1/flux-dev' },
      { model_id: 'flux-kontext', display_name: 'Flux Kontext (编辑)', capability: 'image_edit', protocol: 'raw', request_path: '/v1/flux-kontext' },
    ],
  },
  {
    key: 'midjourney',
    name: 'Midjourney (relay)',
    category: 'image',
    default_base_url: 'https://api.midjourney-proxy.com',
    website: 'https://midjourney.com',
    description: '需要通过第三方 relay 使用，每家 relay 的 path 不同',
    models: [
      { model_id: 'mj-v7', display_name: 'MJ V7', capability: 'image', protocol: 'raw', request_path: '/mj/submit/imagine' },
      { model_id: 'niji-v6', display_name: 'Niji V6', capability: 'image', protocol: 'raw', request_path: '/mj/submit/imagine' },
    ],
  },
  {
    key: 'stability',
    name: 'Stability AI',
    category: 'image',
    default_base_url: 'https://api.stability.ai',
    website: 'https://platform.stability.ai',
    description: 'Stable Diffusion / SD3.5 (原生协议)',
    models: [
      { model_id: 'sd3.5-large', display_name: 'SD 3.5 Large', capability: 'image', protocol: 'raw', request_path: '/v2beta/stable-image/generate/sd3' },
      { model_id: 'sd3.5-medium', display_name: 'SD 3.5 Medium', capability: 'image', protocol: 'raw', request_path: '/v2beta/stable-image/generate/sd3' },
      { model_id: 'stable-image-ultra', display_name: 'Stable Image Ultra', capability: 'image', protocol: 'raw', request_path: '/v2beta/stable-image/generate/ultra' },
    ],
  },
  {
    key: 'runway',
    name: 'Runway',
    category: 'video',
    default_base_url: 'https://api.runwayml.com',
    website: 'https://runwayml.com',
    description: 'Gen-4 视频生成 (异步提交+轮询，业务调用需额外实现)',
    models: [
      { model_id: 'gen4_turbo', display_name: 'Gen-4 Turbo', capability: 'video', protocol: 'raw', request_path: '/v1/image_to_video' },
      { model_id: 'gen3a_turbo', display_name: 'Gen-3 Alpha Turbo', capability: 'video', protocol: 'raw', request_path: '/v1/image_to_video' },
    ],
  },
  {
    key: 'kling',
    name: '可灵 Kling',
    category: 'video',
    default_base_url: 'https://api.klingai.com',
    website: 'https://klingai.com',
    description: '快手可灵视频 (异步)',
    models: [
      { model_id: 'kling-v2-master', display_name: '可灵 v2 Master', capability: 'video', protocol: 'raw', request_path: '/v1/videos/text2video' },
      { model_id: 'kling-v1-6', display_name: '可灵 v1.6', capability: 'video', protocol: 'raw', request_path: '/v1/videos/text2video' },
      { model_id: 'kling-lip-sync', display_name: '可灵对口型', capability: 'lipsync', protocol: 'raw', request_path: '/v1/videos/lip-sync' },
    ],
  },
  {
    key: 'jimeng',
    name: '即梦 Jimeng',
    category: 'video',
    default_base_url: 'https://visual.volcengineapi.com',
    website: 'https://jimeng.jianying.com',
    description: '字节即梦图像/视频 (火山 Visual API)',
    models: [
      { model_id: 'jimeng-video-3.0', display_name: '即梦 视频 3.0', capability: 'video', protocol: 'raw', request_path: '/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31' },
      { model_id: 'jimeng-image-3.0', display_name: '即梦 图像 3.0', capability: 'image', protocol: 'raw', request_path: '/?Action=CVProcess&Version=2022-08-31' },
    ],
  },
  {
    key: 'luma',
    name: 'Luma AI',
    category: 'video',
    default_base_url: 'https://api.lumalabs.ai',
    website: 'https://lumalabs.ai',
    description: 'Dream Machine (Ray 系列)',
    models: [
      { model_id: 'ray-2', display_name: 'Ray 2', capability: 'video', protocol: 'raw', request_path: '/dream-machine/v1/generations' },
      { model_id: 'ray-1-6', display_name: 'Ray 1.6', capability: 'video', protocol: 'raw', request_path: '/dream-machine/v1/generations' },
    ],
  },
  {
    key: 'pika',
    name: 'Pika',
    category: 'video',
    default_base_url: 'https://api.pika.art',
    website: 'https://pika.art',
    description: 'Pika 视频',
    models: [
      { model_id: 'pika-2.2', display_name: 'Pika 2.2', capability: 'video', protocol: 'raw', request_path: '/v1/generate' },
    ],
  },
  {
    key: 'minimax',
    name: 'MiniMax 海螺',
    category: 'video',
    default_base_url: 'https://api.minimax.chat',
    website: 'https://platform.minimaxi.com',
    description: 'MiniMax LLM + 视频 + 音色',
    models: [
      { model_id: 'MiniMax-Text-01', display_name: 'MiniMax Text 01', capability: 'chat', protocol: 'raw', request_path: '/v1/text/chatcompletion_v2' },
      { model_id: 'video-01', display_name: '海螺视频 01', capability: 'video', protocol: 'raw', request_path: '/v1/video_generation' },
      { model_id: 'speech-02-hd', display_name: 'MiniMax TTS', capability: 'tts', protocol: 'raw', request_path: '/v1/t2a_v2' },
    ],
  },
  {
    key: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'audio',
    default_base_url: 'https://api.elevenlabs.io',
    website: 'https://elevenlabs.io',
    description: '顶级语音克隆/合成 (路径里的 {voice_id} 需替换为实际 voice id)',
    models: [
      { model_id: 'eleven_multilingual_v2', display_name: 'Multilingual v2', capability: 'tts', protocol: 'raw', request_path: '/v1/text-to-speech/VOICE_ID_HERE' },
      { model_id: 'eleven_turbo_v2_5', display_name: 'Turbo v2.5', capability: 'tts', protocol: 'raw', request_path: '/v1/text-to-speech/VOICE_ID_HERE' },
      { model_id: 'scribe_v1', display_name: 'Scribe (STT)', capability: 'stt', protocol: 'raw', request_path: '/v1/speech-to-text' },
    ],
  },
  {
    key: 'fishaudio',
    name: 'Fish Audio',
    category: 'audio',
    default_base_url: 'https://api.fish.audio',
    website: 'https://fish.audio',
    description: 'Fish Speech 1.5',
    models: [
      { model_id: 'fish-speech-1.5', display_name: 'Fish Speech 1.5', capability: 'tts', protocol: 'raw', request_path: '/v1/tts' },
    ],
  },
  {
    key: 'azure-speech',
    name: 'Azure 语音',
    category: 'audio',
    default_base_url: 'https://YOUR-REGION.tts.speech.microsoft.com',
    website: 'https://azure.microsoft.com/products/ai-services/ai-speech',
    description: 'Azure Cognitive Speech (需在额外 Headers 加 Ocp-Apim-Subscription-Key)',
    models: [
      { model_id: 'azure-tts-neural', display_name: 'Azure Neural TTS', capability: 'tts', protocol: 'raw', request_path: '/cognitiveservices/v1' },
    ],
  },
]

export function findCatalogProvider(key: string): CatalogProvider | undefined {
  return MODEL_CATALOG.find((provider) => provider.key === key)
}
