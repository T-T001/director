import { countWords } from './word-count'

export interface EpisodeMarkerMatch {
  index: number
  text: string
  episodeNumber: number
}

export interface PreviewSplit {
  number: number
  title: string
  wordCount: number
  startIndex: number
  endIndex: number
  preview: string
}

export interface EpisodeMarkerResult {
  hasMarkers: boolean
  markerType: string
  markerTypeKey: string
  confidence: 'high' | 'medium' | 'low'
  matches: EpisodeMarkerMatch[]
  previewSplits: PreviewSplit[]
}

const CHINESE_NUMBERS: Record<string, number> = {
  '零': 0, '〇': 0,
  '一': 1, '壹': 1,
  '二': 2, '贰': 2, '两': 2,
  '三': 3, '叁': 3,
  '四': 4, '肆': 4,
  '五': 5, '伍': 5,
  '六': 6, '陆': 6,
  '七': 7, '柒': 7,
  '八': 8, '捌': 8,
  '九': 9, '玖': 9,
  '十': 10, '拾': 10,
  '百': 100, '佰': 100,
  '千': 1000, '仟': 1000,
}

function chineseToNumber(chinese: string): number {
  if (/^\d+$/.test(chinese)) {
    return parseInt(chinese, 10)
  }

  let result = 0
  let temp = 0
  let lastUnit = 1

  for (const char of chinese) {
    const num = CHINESE_NUMBERS[char]
    if (num === undefined) continue

    if (num >= 10) {
      if (temp === 0) temp = 1
      temp *= num
      if (num >= lastUnit) {
        result += temp
        temp = 0
      }
      lastUnit = num
    } else {
      temp = num
    }
  }

  return result + temp
}

interface DetectionPattern {
  regex: RegExp
  typeKey: string
  typeName: string
  extractNumber: (match: RegExpMatchArray) => number
  extractTitle: (match: RegExpMatchArray) => string
}

const DETECTION_PATTERNS: DetectionPattern[] = [
  {
    regex: /^第([一二三四五六七八九十百千\d]+)集[：:\s]*(.*)?/gm,
    typeKey: 'episode',
    typeName: '第X集',
    extractNumber: (match) => chineseToNumber(match[1]),
    extractTitle: (match) => match[2]?.trim() || '',
  },
  {
    regex: /^第([一二三四五六七八九十百千\d]+)章[：:\s]*(.*)?/gm,
    typeKey: 'chapter',
    typeName: '第X章',
    extractNumber: (match) => chineseToNumber(match[1]),
    extractTitle: (match) => match[2]?.trim() || '',
  },
  {
    regex: /^第([一二三四五六七八九十百千\d]+)幕[：:\s]*(.*)?/gm,
    typeKey: 'act',
    typeName: '第X幕',
    extractNumber: (match) => chineseToNumber(match[1]),
    extractTitle: (match) => match[2]?.trim() || '',
  },
  {
    regex: /^(\d+)[\.、：:]\s*(.+)/gm,
    typeKey: 'numbered',
    typeName: '数字编号',
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => match[2]?.trim().slice(0, 20) || '',
  },
  {
    regex: /^Episode\s*(\d+)[：:\s]*(.*)?/gim,
    typeKey: 'episodeEn',
    typeName: 'Episode X',
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => match[2]?.trim() || '',
  },
  {
    regex: /^Chapter\s*(\d+)[：:\s]*(.*)?/gim,
    typeKey: 'chapterEn',
    typeName: 'Chapter X',
    extractNumber: (match) => parseInt(match[1], 10),
    extractTitle: (match) => match[2]?.trim() || '',
  },
]

export function detectEpisodeMarkers(content: string): EpisodeMarkerResult {
  const result: EpisodeMarkerResult = {
    hasMarkers: false,
    markerType: '',
    markerTypeKey: '',
    confidence: 'low',
    matches: [],
    previewSplits: [],
  }

  if (!content || content.length < 100) {
    return result
  }

  for (const pattern of DETECTION_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    const matches: EpisodeMarkerMatch[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      const episodeNumber = pattern.extractNumber(match)
      matches.push({ index: match.index, text: match[0], episodeNumber })
    }

    if (matches.length >= 2 && matches.length > result.matches.length) {
      result.matches = matches
      result.markerType = pattern.typeName
      result.markerTypeKey = pattern.typeKey
      result.hasMarkers = true
    }
  }

  if (!result.hasMarkers) return result

  result.matches.sort((a, b) => a.index - b.index)

  const matchCount = result.matches.length
  const avgDistance = matchCount > 1
    ? (result.matches[matchCount - 1].index - result.matches[0].index) / (matchCount - 1)
    : 0

  if (matchCount >= 3 && avgDistance >= 500 && avgDistance <= 8000) {
    result.confidence = 'high'
  } else if (matchCount >= 2) {
    result.confidence = 'medium'
  }

  const previewSplits: PreviewSplit[] = []
  result.matches.forEach((match, idx) => {
    const startIndex = idx === 0 ? 0 : match.index
    const endIndex = idx < result.matches.length - 1 ? result.matches[idx + 1].index : content.length
    const episodeContent = content.slice(startIndex, endIndex)
    const wordCount = countWords(episodeContent)
    const title = `第 ${match.episodeNumber} 集`
    const markerPositionInContent = match.index - startIndex
    const markerPrefix = match.text.match(/^(?:第[一二三四五六七八九十百千\d]+[集章幕]|Episode\s*\d+|Chapter\s*\d+|\d+)[\.、：:\s]*/i)?.[0] || ''
    const prefixLength = markerPrefix.length || match.text.length
    const previewStart = markerPositionInContent + prefixLength
    const preview = episodeContent.slice(previewStart, previewStart + 50).trim().slice(0, 20)

    previewSplits.push({
      number: match.episodeNumber,
      title,
      wordCount,
      startIndex,
      endIndex,
      preview: preview + (preview.length >= 20 ? '...' : ''),
    })
  })

  result.previewSplits = previewSplits
  return result
}

export interface SplitEpisode {
  number: number
  title: string
  summary: string
  content: string
  wordCount: number
}

export function splitByMarkers(content: string, markerResult: EpisodeMarkerResult): SplitEpisode[] {
  if (!markerResult.hasMarkers || markerResult.previewSplits.length === 0) return []

  return markerResult.previewSplits.map((split) => {
    const episodeContent = content.slice(split.startIndex, split.endIndex).trim()
    return {
      number: split.number,
      title: split.title || `第 ${split.number} 集`,
      summary: '',
      content: episodeContent,
      wordCount: countWords(episodeContent),
    }
  })
}

export function splitByWordCount(content: string, targetWordsPerEpisode = 5000): SplitEpisode[] {
  const trimmed = content.trim()
  if (!trimmed) return []

  const total = countWords(trimmed)
  if (total <= targetWordsPerEpisode) {
    return [{ number: 1, title: '第 1 集', summary: '', content: trimmed, wordCount: total }]
  }

  const paragraphs = trimmed
    .split(/\n{2,}|(?<=[。！？])\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const episodes: SplitEpisode[] = []
  let buffer: string[] = []
  let bufferWords = 0
  let number = 1

  const flush = () => {
    if (!buffer.length) return
    const text = buffer.join('\n\n').trim()
    const wordCount = countWords(text)
    episodes.push({
      number,
      title: `第 ${number} 集`,
      summary: text.slice(0, 30).trim() + (text.length > 30 ? '...' : ''),
      content: text,
      wordCount,
    })
    number += 1
    buffer = []
    bufferWords = 0
  }

  for (const paragraph of paragraphs) {
    const words = countWords(paragraph)
    if (bufferWords + words > targetWordsPerEpisode && buffer.length > 0) {
      flush()
    }
    buffer.push(paragraph)
    bufferWords += words
  }
  flush()

  return episodes
}
