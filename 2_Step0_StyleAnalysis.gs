/**
 * 2_Step0_StyleAnalysis.gs
 * [Step 0] 내 이메일 스타일 분석 (최초 1회 실행)
 */
function analyzeMyEmailStyle() {
  Logger.log("🔍 이메일 수집을 시작합니다...");
  const emailSamples = getRecentSentEmails(3, 200);
  
  if (emailSamples.length === 0) {
    Logger.log("❌ 분석할 발신 메일이 없습니다.");
    return;
  }
  
  Logger.log(`✅ ${emailSamples.length}개의 발신 메일 수집 완료. Sonnet 4.5 모델에 분석을 요청합니다...`);
  const styleGuideResult = analyzeWithClaudeSonnet(emailSamples);
  
  if (!styleGuideResult) {
    Logger.log("❌ API 호출 중 문제가 발생했습니다.");
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty('MY_EMAIL_STYLE', styleGuideResult);
  
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  let styleSheet = ss.getSheetByName('스타일_가이드');
  if (!styleSheet) styleSheet = ss.insertSheet('스타일_가이드');
  
  styleSheet.clear();
  styleSheet.getRange("A1").setValue("💡 이메일 스타일 가이드 (시스템 참조용)");
  styleSheet.getRange("A1").setFontWeight("bold");
  styleSheet.getRange("A2").setValue(styleGuideResult);
  
  Logger.log("🎉 분석 완료! 구글 시트의 [스타일_가이드] 탭을 확인해주세요.");
}

function getRecentSentEmails(monthsAgo, maxCount) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd");
  
  const searchQuery = `in:sent after:${formattedDate}`;
  const threads = GmailApp.search(searchQuery, 0, maxCount); 
  
  return threads.map(thread => { 
    const msg = thread.getMessages()[0];
    return {
      to: msg.getTo(), subject: msg.getSubject(), body: msg.getPlainBody().slice(0, 500)
    };
  });
}

function analyzeWithClaudeSonnet(emailSamples) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) return null;
  
  const systemPrompt = `당신은 세계 최고의 비즈니스 이메일 분석가입니다. 
  제공된 이메일 샘플을 분석하여 1. 수신 유형 갈래 2. 작성 스타일 가이드를 출력해주세요.`;
  const userData = JSON.stringify(emailSamples, null, 2);
  
  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_SONNET, // ⭐️ 정교한 분석을 위해 Sonnet 사용
      max_tokens: 1500, 
      messages: [{ role: 'user', content: `${systemPrompt}\n\n[데이터]\n${userData}` }]
    }),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(response.getContentText());
    return result.error ? null : result.content[0].text;
  } catch (error) {
    return null;
  }
}
