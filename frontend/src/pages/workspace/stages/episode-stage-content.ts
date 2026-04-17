import type { Episode } from '../../../types/project'

export type StageLine = {
  id: string
  order: number
  text: string
  source: 'srt' | 'novel'
  startTime: string | null
  endTime: string | null
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function parseSrtBlock(block: string) {
  const rawLines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (rawLines.length < 2) {
    return null
  }

  const firstLineIsIndex = /^\d+$/.test(rawLines[0])
  const timingLine = rawLines[firstLineIsIndex ? 1 : 0]
  const timingParts = timingLine.split('-->')

  if (timingParts.length !== 2) {
    return null
  }

  const textLines = rawLines.slice(firstLineIsIndex ? 2 : 1)
  const text = normalizeWhitespace(textLines.join(' '))
  if (!text) {
    return null
  }

  return {
    startTime: timingParts[0].trim(),
    endTime: timingParts[1].trim(),
    text,
  }
}

function parseSrtContent(srtContent: string): StageLine[] {
  const blocks = srtContent
    .replace(/\r/g, '')
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  return blocks
    .map(parseSrtBlock)
    .filter((item): item is NonNullable<ReturnType<typeof parseSrtBlock>> => Boolean(item))
    .map((item, index) => ({
      id: `srt-${index + 1}`,
      order: index + 1,
      text: item.text,
      source: 'srt',
      startTime: item.startTime,
      endTime: item.endTime,
    }))
}

function parseNovelText(novelText: string): StageLine[] {
  const segments = novelText
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?\u3002\uFF01\uFF1F])/u))
    .map(normalizeWhitespace)
    .filter(Boolean)

  return segments.map((segment, index) => ({
    id: `novel-${index + 1}`,
    order: index + 1,
    text: segment,
    source: 'novel',
    startTime: null,
    endTime: null,
  }))
}

function parsePlainLineText(text: string): StageLine[] {
  const lines = text
    .split('\n')
    .map(normalizeWhitespace)
    .filter(Boolean)

  return lines.map((line, index) => ({
    id: `plain-${index + 1}`,
    order: index + 1,
    text: line,
    source: 'srt',
    startTime: null,
    endTime: null,
  }))
}

export function buildEpisodeStageLines(episode: Pick<Episode, 'novel_text' | 'srt_content'>): StageLine[] {
  const srtContent = episode.srt_content?.trim()
  if (srtContent) {
    const lines = parseSrtContent(srtContent)
    if (lines.length > 0) {
      return lines
    }

    const plainLines = parsePlainLineText(srtContent)
    if (plainLines.length > 0) {
      return plainLines
    }
  }

  const novelText = episode.novel_text?.trim()
  if (novelText) {
    return parseNovelText(novelText)
  }

  return []
}

export function inferSpeaker(lineText: string): string | null {
  const normalized = normalizeWhitespace(lineText)
  if (!normalized) {
    return null
  }

  const match = normalized.match(/^([^:\uFF1A]{1,24})[:\uFF1A]\s*(.+)$/u)
  if (!match) {
    return null
  }

  const candidate = normalizeWhitespace(match[1])
  if (!candidate || /\s{2,}/.test(candidate)) {
    return null
  }

  return candidate
}

export function lineTimeLabel(line: Pick<StageLine, 'startTime' | 'endTime'>): string | null {
  if (!line.startTime && !line.endTime) {
    return null
  }

  if (line.startTime && line.endTime) {
    return `${line.startTime} -> ${line.endTime}`
  }

  return line.startTime ?? line.endTime
}

export function buildDraftPrompt(text: string) {
  const normalized = normalizeWhitespace(text)
  if (!normalized) {
    return ''
  }
  return `Cinematic scene, keep character continuity, ${normalized}`
}

export function parseTimestampSeconds(value: string | null): number | null {
  if (!value) {
    return null
  }
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/)
  if (!match) {
    return null
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  const milliseconds = Number(match[4])

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}
