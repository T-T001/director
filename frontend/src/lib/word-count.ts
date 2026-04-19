export function countWords(text: string): number {
  if (!text) return 0

  let englishWordCount = 0
  const textWithoutEnglish = text.replace(/[a-zA-Z0-9]+/g, () => {
    englishWordCount++
    return ''
  })

  const chineseMatches = textWithoutEnglish.match(/[\u4e00-\u9fa5\u3400-\u4dbf]/g)
  const chineseCount = chineseMatches ? chineseMatches.length : 0

  return englishWordCount + chineseCount
}
