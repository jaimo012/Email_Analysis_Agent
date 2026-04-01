/**
 * 1_Config
 * 시스템 전체에서 사용하는 설정값(상수)입니다.
 * 외부 API 설정과 구글 시트 설정이 모두 포함된 최종 완결판입니다!
 */
const CONFIG = {
  // 1. 라벨 및 그룹 이메일 설정
  PROCESSED_LABEL: 'ATS-processed',
  GROUP_EMAIL: 'gigs@kmong.com',
  
  // 2. ⭐️ 구글 시트 설정
  DB_SHEET_ID: '1_L29sQpyortIf8xNlW8mOsWWsJ44PWobWAuuDoX0UdU',
  SHEET_SPAM: '스팸_보관함',
  SHEET_WHITELIST: '스팸_제외_리스트',
  SHEET_FEEDBACK: '프롬프트_피드백',
  
  // 3. 🤖 Claude API 설정 (이 부분이 빠져서 에러가 났었어요!)
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_VERSION: '2023-06-01',
  CLAUDE_MODEL: 'claude-sonnet-4-5-20250929' // 최신 모델명으로 적용
};
