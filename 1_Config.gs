/**
 * 1_Config.gs
 * 시스템 설정값 관리. 용도별 Claude 모델이 분리되었습니다.
 */
const CONFIG = {
  // 라벨 및 이메일 설정
  PROCESSED_LABEL: 'ATS-processed',
  GROUP_EMAIL: 'gigs@kmong.com',
  
  // 구글 시트 ID 설정
  DB_SHEET_ID: '1_L29sQpyortIf8xNlW8mOsWWsJ44PWobWAuuDoX0UdU',
  SHEET_SPAM: '스팸_보관함',
  SHEET_WHITELIST: '스팸_제외_리스트',
  SHEET_FEEDBACK: '프롬프트_피드백',
  
  // Claude API 연동 설정
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_VERSION: '2023-06-01',
  
  // ⭐️ 모델 라우팅 설정
  MODEL_SONNET: 'claude-sonnet-4-5-20250929', // 무겁고 정교한 작업용 (분석, 초안 작성)
  MODEL_HAIKU: 'claude-haiku-4-5-20251001'    // 가볍고 빠른 작업용 (스팸 분류 스캐닝)
};
