/**
 * 2_Step0_StyleAnalysis.gs
 * [Step 0] 내 이메일 스타일과 유형을 분석하는 메인 함수 (최초 1회 수동 실행)
 */
function analyzeMyEmailStyle() {
  Logger.log("🔍 이메일 수집을 시작합니다...");
  
  // 1. 최근 3개월 발신 메일 데이터 가져오기
  const emailSamples = getRecentSentEmails(3, 200); 
  
  // 방어 코드: 보낸 메일이 하나도 없다면 분석을 중단합니다.
  if (emailSamples.length === 0) {
    Logger.log("❌ 분석할 발신 메일이 없습니다. 기간을 조정하거나 메일함을 확인해주세요.");
    return;
  }
  
  Logger.log(`✅ ${emailSamples.length}개의 발신 메일을 수집했습니다. Claude API에 분석을 요청합니다...`);
  
  // 2. Claude API를 호출하여 스타일 및 유형 분석
  const styleGuideResult = analyzeWithClaude(emailSamples);
  
  if (!styleGuideResult) {
    Logger.log("❌ Claude API 호출 중 문제가 발생했습니다.");
    return;
  }
  
  // 3. 분석 결과를 Script Properties(비밀 금고)에 저장 (시스템 연동용)
  PropertiesService.getScriptProperties().setProperty('MY_EMAIL_STYLE', styleGuideResult);
  
  // ⭐️ 4. [신규 추가] 사용자가 직접 보고 수정할 수 있도록 구글 시트에 저장
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  let styleSheet = ss.getSheetByName('스타일_가이드');
  
  // 시트가 없으면 새로 생성합니다.
  if (!styleSheet) {
    styleSheet = ss.insertSheet('스타일_가이드');
  }
  
  // 기존 내용을 깔끔하게 지우고 새 결과물을 덮어씁니다.
  styleSheet.clear(); 
  
  // 안내 문구와 결과물 입력
  styleSheet.getRange("A1").setValue("💡 이메일 스타일 가이드 (시스템이 이 내용을 바탕으로 초안을 작성합니다. 자유롭게 수정하세요!)");
  styleSheet.getRange("A1").setFontWeight("bold");
  styleSheet.getRange("A2").setValue(styleGuideResult);
  
  Logger.log("🎉 분석이 완료되었습니다! 구글 시트의 [스타일_가이드] 탭을 확인해주세요.");
}


/**
 * 특정 개월 수 이전부터 지금까지 보낸 메일을 추출하는 헬퍼 함수
 */
function getRecentSentEmails(monthsAgo, maxCount) {
  // 오늘 날짜 기준으로 N개월 전의 날짜 계산 (하드코딩 방지)
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd");
  
  // Gmail 검색 쿼리: 지정된 날짜 이후에 보낸 메일 
  const searchQuery = `in:sent after:${formattedDate}`;
  const threads = GmailApp.search(searchQuery, 0, maxCount); 
  
  // 추출된 스레드에서 필요한 정보만 매핑하여 배열로 반환 
  const samples = threads.map(thread => { 
    const msg = thread.getMessages()[0]; // 스레드의 첫 번째(가장 최근) 메시지
    return {
      to: msg.getTo(), 
      subject: msg.getSubject(), 
      body: msg.getPlainBody().slice(0, 500) // 500자까지만 자르기 
    };
  });
  return samples;
}


/**
 * 수집된 이메일 데이터를 바탕으로 Claude에게 분석을 요청하는 헬퍼 함수
 */
function analyzeWithClaude(emailSamples) {
  // Script Properties에 미리 저장해둔 API 키를 불러옵니다.
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  
  if (!apiKey) {
    Logger.log("⚠️ CLAUDE_API_KEY가 Script Properties에 설정되지 않았습니다!");
    return null;
  }
  
  // Claude에게 지시할 프롬프트 구성
  const systemPrompt = `당신은 세계 최고의 비즈니스 이메일 분석가입니다. 
  다음은 내가 지난 몇 달간 직접 작성해서 보낸 이메일 샘플들입니다. 
  이 샘플들을 분석하여 다음 두 가지를 작성해주세요.
  
  1. 나의 주요 이메일 수신 유형 갈래 (예: 고객사 문의, 내부 보고, 파트너 협의 등)
  2. 나의 이메일 작성 스타일 가이드 (인사말, 맺음말, 톤앤매너, 자주 쓰는 표현 등)
  
  이후 당신이 내 답장 초안을 대신 작성해 줄 것이므로, 당신이 참고할 수 있는 완벽한 가이드라인 형태로 출력해주세요.`;
  
  // 이메일 데이터를 문자열로 변환
  const userData = JSON.stringify(emailSamples, null, 2);
  
  // API 요청 옵션 설정
  const options = {
    method: 'post',
    headers: { 
      'x-api-key': apiKey, 
      'anthropic-version': CONFIG.CLAUDE_VERSION, 
      'content-type': 'application/json' 
    },
    payload: JSON.stringify({ 
      model: CONFIG.CLAUDE_MODEL, 
      max_tokens: 1500, // 분석 결과는 길 수 있으므로 1500으로 넉넉히 잡습니다.
      messages: [
        { role: 'user', content: `${systemPrompt}\n\n[이메일 샘플 데이터]\n${userData}` }
      ]
    }),
    muteHttpExceptions: true // 에러 발생 시 스크립트가 멈추지 않고 상세 에러를 볼 수 있게 함
  };
  
  // API 호출 및 결과 반환
  try {
    const response = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.error) {
      Logger.log("API 에러 응답: " + result.error.message);
      return null;
    }
    
    return result.content[0].text;
  } catch (error) {
    Logger.log("API 호출 실패: " + error.toString());
    return null;
  }
}
