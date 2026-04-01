/**
 * 1_Config.gs
 * 시스템 설정값 관리. (Gemini 2.5 Flash 및 Claude 하이브리드 라우팅 적용)
 */
const CONFIG = {
  // 라벨 및 이메일 설정
  PROCESSED_LABEL: 'ATS-processed',
  SOURCING_LABEL: 'sourcing',
  GROUP_PENDING_LABEL: 'ATS-group-pending',
  GROUP_EMAIL: 'gigs@kmong.com',
  MY_EMAIL: 'alpha@kmong.com',
  
  // 구글 시트 ID 설정
  DB_SHEET_ID: '1_L29sQpyortIf8xNlW8mOsWWsJ44PWobWAuuDoX0UdU',
  SHEET_SPAM: '스팸_보관함',
  SHEET_WHITELIST: '스팸_제외_리스트',
  SHEET_FEEDBACK: '프롬프트_피드백',
  
  // Claude API 연동 설정 (초안 및 요약용)
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_VERSION: '2023-06-01',
  MODEL_SONNET: 'claude-sonnet-4-5-20250929', // 정교한 작업용 (답장 초안 작성)
  MODEL_HAIKU: 'claude-haiku-4-5-20251001',   // 빠르고 가벼운 작업용 (그룹 메일 요약)

  // Gemini API 연동 설정 (단순 분류 스캐닝용)
  GEMINI_API_URL_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
  MODEL_GEMINI_FLASH: 'gemini-2.5-flash'      // 압도적 가성비 (카테고리 3단 분류)
};
