/**
 * 0_UpdateSheet.gs
 * 알려주신 시트에 접근해서 필요한 탭(시트)과 헤더를 만들어주는 함수입니다.
 * 이 코드를 한 번만 '실행' 하시면 시트가 마법처럼 세팅됩니다!
 */
function updateDatabaseSheet() {
  // 1. 사용자가 지정한 고유 ID로 특정 시트 파일을 엽니다.
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  
  // --- [스팸 보관함 세팅] ---
  let spamSheet = ss.getSheetByName(CONFIG.SHEET_SPAM);
  
  // 방어 코드(Guard Clause): 만약 누군가 시트를 삭제했거나 없다면 새로 만듭니다.
  if (!spamSheet) {
    spamSheet = ss.insertSheet(CONFIG.SHEET_SPAM);
  }
  
  // 요청하신 메일 ID, 스레드 ID가 포함된 새로운 헤더
  const spamHeaders = [["수신 일시", "발신자", "제목", "본문 요약", "메일 링크", "메일 ID", "스레드 ID", "처리 상태"]];
  spamSheet.getRange(1, 1, 1, spamHeaders[0].length).setValues(spamHeaders);
  spamSheet.getRange(1, 1, 1, spamHeaders[0].length).setFontWeight("bold");
  
  // --- [스팸 제외 리스트 (화이트리스트) 세팅] ---
  let whitelistSheet = ss.getSheetByName(CONFIG.SHEET_WHITELIST);
  
  // 방어 코드
  if (!whitelistSheet) {
    whitelistSheet = ss.insertSheet(CONFIG.SHEET_WHITELIST);
  }
  
  // 화이트리스트 헤더 (이메일 주소가 핵심이지만, 관리를 위해 이름/메모 등을 추가)
  const whiteHeaders = [["이메일 주소", "이름/소속", "등록일", "메모"]];
  whitelistSheet.getRange(1, 1, 1, whiteHeaders[0].length).setValues(whiteHeaders);
  whitelistSheet.getRange(1, 1, 1, whiteHeaders[0].length).setFontWeight("bold");
  
  Logger.log("✅ 시트 구조 업데이트가 완벽하게 끝났습니다! 시트를 확인해보세요.");
}
