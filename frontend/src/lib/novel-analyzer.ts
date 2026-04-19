import { countWords } from './word-count'

export interface CharacterInsight {
  name: string
  lineCount: number
  wordCount: number
  sampleQuote: string | null
  firstAppearanceRatio: number
}

export interface SceneInsight {
  index: number
  location: string
  positionRatio: number
  preview: string
}

export interface KeywordInsight {
  word: string
  frequency: number
}

export interface DialogueInsight {
  totalLines: number
  averageLength: number
  longestLength: number
  ratioOfTotalText: number
}

export interface EmotionInsight {
  key: 'warm' | 'tense' | 'grief' | 'joy' | 'mystery' | 'action'
  label: string
  count: number
}

export interface NovelAnalysis {
  totalChars: number
  totalWords: number
  paragraphCount: number
  sentenceCount: number
  characters: CharacterInsight[]
  scenes: SceneInsight[]
  dialogue: DialogueInsight
  keywords: KeywordInsight[]
  emotions: EmotionInsight[]
  genre: string
  sentimentScore: number
  pace: 'slow' | 'steady' | 'fast'
}

const STOP_WORDS = new Set<string>([
  '他', '她', '它', '你', '我', '们', '的', '了', '和', '是', '在', '有', '就', '不',
  '也', '都', '这', '那', '个', '上', '下', '里', '去', '来', '说', '道', '看', '一',
  '着', '过', '又', '很', '要', '能', '会', '到', '被', '把', '从', '为', '而', '与',
  '之', '于', '所', '以', '但', '却', '只', '之后', '之前', '自己', '什么',
])

const LOCATION_SUFFIXES = /(房间|会议室|办公室|街道|广场|山顶|山脚|城镇|村庄|酒馆|旅店|城市|学校|宿舍|花园|公园|海边|湖畔|码头|港口|森林|山洞|宫殿|城堡|寺庙|祠堂|战场|战船|飞船|机场|车站|地铁|电梯|厨房|客厅|卧室|阳台|露台|走廊|楼梯|地下室|顶楼|玄关|门口|后院|工厂|仓库|实验室|书房|机房|塔顶|角落|大厅|走道|庭院|巷子|小巷)/

const LOCATION_PREFIX = /(在|于|到|抵达|来到|进入|穿过|走向|走进|离开)([\u4e00-\u9fa5]{2,8})/g
const QUOTED_DIALOGUE = /[「"""](.*?)[」"""]/g
const SPEAKER_DIALOGUE = /([\u4e00-\u9fa5]{2,4})(?:微微|缓缓|轻轻|冷冷|忽然|急忙|连忙|大声|低声|突然)?(?:说道|说|道|喊|答道|回道|笑道|问道|叹道|低语|怒道|冷笑道)[：:，,]?\s*[「"""]?(.+?)[」"""。！？!?\n]/g
const NAME_HINTS = /([\u4e00-\u9fa5]{2,4})(?:走|坐|站|看|皱|望|笑|抬|转|拿|接|摇|点头|叹|哭|喊|冲|跑|推开|闭上|睁开|仰|低头|开口|伸手|挥|盯|瞪)/g
const HONORIFIC_NAMES = /((?:[皇太]?子|公主|太后|陛下|大人|将军|先生|女士|姑娘|少爷|小姐|夫人|师父|师傅|师兄|师姐|教授|老师|管家|少主|长老|陛下|阁下|殿下|大王|族长)[\u4e00-\u9fa5]{0,3})/g

const GENRE_KEYWORDS: Record<string, string[]> = {
  武侠: ['剑', '刀', '内力', '武功', '门派', '江湖', '侠客', '侠客', '招式', '拳法', '轻功'],
  玄幻: ['灵力', '修为', '元气', '法宝', '飞升', '神识', '灵根', '修仙', '丹药'],
  科幻: ['飞船', '星系', '量子', '机甲', '基因', '虫洞', '空间站', '星舰', '人工智能', 'AI'],
  都市: ['公司', '手机', '地铁', '咖啡', '经理', '总裁', '办公室', '出租车', '股票', '合同'],
  悬疑: ['尸体', '凶手', '线索', '警方', '案件', '侦探', '真相', '指纹', '凶器', '调查'],
  爱情: ['心动', '拥抱', '亲吻', '告白', '约会', '喜欢', '爱你', '想你', '思念'],
  奇幻: ['魔法', '精灵', '龙', '巫师', '咒语', '法袍', '王国', '圣物'],
  历史: ['朝廷', '陛下', '太监', '皇后', '御前', '史官', '兵马', '宰相', '京城'],
}

const EMOTION_KEYWORDS: Record<EmotionInsight['key'], { label: string; keywords: string[] }> = {
  warm: { label: '温暖', keywords: ['温柔', '微笑', '暖', '安心', '拥抱', '依偎', '甜蜜', '柔软', '温暖'] },
  tense: { label: '紧张', keywords: ['紧张', '冷汗', '凝重', '屏息', '紧绷', '危险', '警觉', '戒备', '压迫'] },
  grief: { label: '悲伤', keywords: ['哭', '泪', '悲', '痛苦', '绝望', '离别', '死去', '颤抖', '哽咽'] },
  joy: { label: '喜悦', keywords: ['笑', '大笑', '欢呼', '兴奋', '激动', '灿烂', '爽朗', '开心', '欣喜'] },
  mystery: { label: '悬疑', keywords: ['阴影', '黑暗', '低语', '秘密', '诡异', '迷雾', '线索', '谜团', '奇怪'] },
  action: { label: '动作', keywords: ['冲', '挥', '砍', '劈', '踢', '拳', '跃', '跳', '奔', '击', '爆炸'] },
}

function topN<T>(items: T[], n: number) {
  return items.slice(0, n)
}

function ratio(partial: number, total: number) {
  if (!total) return 0
  return Math.min(1, Math.max(0, partial / total))
}

function sanitizeName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 6) return null
  if (STOP_WORDS.has(trimmed)) return null
  if (/^\d+$/.test(trimmed)) return null
  const verbs = ['说道', '说', '道', '喊', '答道', '回道', '笑道', '问道', '叹道', '低语', '走', '坐', '看']
  if (verbs.some((v) => trimmed.endsWith(v))) return null
  return trimmed
}

export function analyzeNovel(raw: string): NovelAnalysis {
  const text = raw.trim()
  const totalChars = text.length
  const totalWords = countWords(text)
  const paragraphs = text.split(/\n{1,}/).filter((p) => p.trim().length > 0)
  const sentences = text.split(/[。！？!?…]+/).filter((s) => s.trim().length > 0)

  const quotedMatches: Array<{ text: string; index: number }> = []
  let match: RegExpExecArray | null
  const quotedRegex = new RegExp(QUOTED_DIALOGUE.source, 'g')
  while ((match = quotedRegex.exec(text)) !== null) {
    if (match[1]?.trim()) {
      quotedMatches.push({ text: match[1].trim(), index: match.index })
    }
  }

  const speakerLines: Array<{ speaker: string; line: string; index: number }> = []
  const speakerRegex = new RegExp(SPEAKER_DIALOGUE.source, 'g')
  while ((match = speakerRegex.exec(text)) !== null) {
    const cleaned = sanitizeName(match[1])
    if (cleaned && match[2]?.trim()) {
      speakerLines.push({ speaker: cleaned, line: match[2].trim(), index: match.index })
    }
  }

  const nameCounts = new Map<string, { count: number; firstIndex: number; sample: string | null }>()

  for (const entry of speakerLines) {
    const existing = nameCounts.get(entry.speaker)
    if (existing) {
      existing.count += 1
      if (!existing.sample) existing.sample = entry.line
    } else {
      nameCounts.set(entry.speaker, { count: 1, firstIndex: entry.index, sample: entry.line })
    }
  }

  const hintRegex = new RegExp(NAME_HINTS.source, 'g')
  while ((match = hintRegex.exec(text)) !== null) {
    const cleaned = sanitizeName(match[1])
    if (!cleaned) continue
    const existing = nameCounts.get(cleaned)
    if (existing) {
      existing.count += 0.4
    } else {
      nameCounts.set(cleaned, { count: 0.6, firstIndex: match.index, sample: null })
    }
  }

  const honorificRegex = new RegExp(HONORIFIC_NAMES.source, 'g')
  while ((match = honorificRegex.exec(text)) !== null) {
    const cleaned = sanitizeName(match[1])
    if (!cleaned) continue
    const existing = nameCounts.get(cleaned)
    if (existing) existing.count += 0.5
    else nameCounts.set(cleaned, { count: 0.8, firstIndex: match.index, sample: null })
  }

  const characters: CharacterInsight[] = Array.from(nameCounts.entries())
    .filter(([, info]) => info.count >= 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, info]) => ({
      name,
      lineCount: Math.round(info.count),
      wordCount: info.sample ? countWords(info.sample) : 0,
      sampleQuote: info.sample,
      firstAppearanceRatio: ratio(info.firstIndex, totalChars),
    }))

  const sceneMatches: Array<{ location: string; position: number; contextPreview: string }> = []
  const locRegex = new RegExp(LOCATION_PREFIX.source, 'g')
  const seenLocations = new Set<string>()
  while ((match = locRegex.exec(text)) !== null) {
    const loc = match[2]
    if (!loc || seenLocations.has(loc)) continue
    if (loc.length < 2 || loc.length > 8) continue
    if (!LOCATION_SUFFIXES.test(loc) && !/[\u4e00-\u9fa5]{2,}/.test(loc)) continue
    seenLocations.add(loc)
    const context = text.slice(match.index, match.index + 36).replace(/\s+/g, '')
    sceneMatches.push({ location: loc, position: match.index, contextPreview: context })
    if (sceneMatches.length >= 8) break
  }

  const scenes: SceneInsight[] = sceneMatches
    .sort((a, b) => a.position - b.position)
    .map((entry, idx) => ({
      index: idx + 1,
      location: entry.location,
      positionRatio: ratio(entry.position, totalChars),
      preview: entry.contextPreview,
    }))

  const totalDialogueChars = quotedMatches.reduce((sum, d) => sum + d.text.length, 0)
  const longestLine = quotedMatches.reduce((max, d) => Math.max(max, d.text.length), 0)
  const dialogue: DialogueInsight = {
    totalLines: quotedMatches.length,
    averageLength: quotedMatches.length > 0 ? Math.round(totalDialogueChars / quotedMatches.length) : 0,
    longestLength: longestLine,
    ratioOfTotalText: ratio(totalDialogueChars, totalChars),
  }

  const keywordMap = new Map<string, number>()
  const cleanText = text.replace(/[\s\n\r\t，。！？、：；""''「」()（）【】\[\]\-—…·]/g, ' ')
  const ngramWindow = (n: number) => {
    for (let i = 0; i <= cleanText.length - n; i++) {
      const token = cleanText.slice(i, i + n)
      if (!/^[\u4e00-\u9fa5]+$/.test(token)) continue
      if (Array.from(token).some((ch) => STOP_WORDS.has(ch))) continue
      keywordMap.set(token, (keywordMap.get(token) ?? 0) + 1)
    }
  }
  ngramWindow(2)
  ngramWindow(3)

  const keywords: KeywordInsight[] = Array.from(keywordMap.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, frequency]) => ({ word, frequency }))

  const emotions: EmotionInsight[] = (Object.entries(EMOTION_KEYWORDS) as Array<[EmotionInsight['key'], { label: string; keywords: string[] }]>)
    .map(([key, { label, keywords: words }]) => {
      let count = 0
      for (const kw of words) {
        const re = new RegExp(kw, 'g')
        count += (text.match(re) || []).length
      }
      return { key, label, count }
    })
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)

  let genre = '综合'
  let topGenreScore = 0
  for (const [name, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (text.match(new RegExp(kw, 'g')) || []).length, 0)
    if (score > topGenreScore) {
      topGenreScore = score
      genre = name
    }
  }
  if (topGenreScore < 2) genre = '综合'

  const positive = (EMOTION_KEYWORDS.warm.keywords.concat(EMOTION_KEYWORDS.joy.keywords)).reduce((s, kw) => s + (text.match(new RegExp(kw, 'g')) || []).length, 0)
  const negative = (EMOTION_KEYWORDS.grief.keywords.concat(EMOTION_KEYWORDS.tense.keywords)).reduce((s, kw) => s + (text.match(new RegExp(kw, 'g')) || []).length, 0)
  const sentimentScore = positive + negative > 0 ? (positive - negative) / (positive + negative) : 0

  const actionCount = EMOTION_KEYWORDS.action.keywords.reduce((s, kw) => s + (text.match(new RegExp(kw, 'g')) || []).length, 0)
  const pacePer1k = totalChars > 0 ? (actionCount / totalChars) * 1000 : 0
  const pace: NovelAnalysis['pace'] = pacePer1k > 4 ? 'fast' : pacePer1k > 1.5 ? 'steady' : 'slow'

  return {
    totalChars,
    totalWords,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    characters: topN(characters, 8),
    scenes: topN(scenes, 6),
    dialogue,
    keywords,
    emotions: topN(emotions, 5),
    genre,
    sentimentScore,
    pace,
  }
}
