/**
 * 6_GroupEmail_Batch.gs
 * 지정된 시간(9시, 14시, 18시)에 한 번씩 작동하여 
 * 쌓여있는 그룹 메일을 한 번에 요약하여 슬랙으로 보냅니다.
 */
function processGroupEmailBatch() {
  Logger.log("그룹 메일 정기 브리핑 배치를 시작합니다.");

  const groupPendingLabel = GmailApp.getUserLabelByName(CONFIG.GROUP_PENDING_LABEL);
  if (!groupPendingLabel) {
    Logger.log("대기 중인 라벨이 존재하지 않습니다.");
    return;
  }
  
  // 대기 라벨이 붙은 스레드 가져오기
  const threads = groupPendingLabel.getThreads(0, 20); 
  
  if (threads.length === 0) {
    Logger.log("요약할 새로운 그룹 메일이 없습니다.");
    return;
  }
  
  // 1. 요약할 이메일 데이터 취합 (시간 정보 포함)
  let emailsTextData = "";
  threads.forEach((thread, index) => {
    const messages = thread.getMessages();
    const msg = messages[messages.length - 1]; // 가장 최신 메시지 기준
    const from = msg.getFrom();
    const subject = msg.getSubject();
    const msgId = msg.getId();
    
    // ⭐️ [추가] 수신 시간 추출 및 포맷팅
    const date = msg.getDate();
    const timeStr = Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm");
    
    const fullBody = msg.getPlainBody().trim().slice(0, 3000); 
    
    emailsTextData += `[메일 번호: ${index + 1}]
- 메시지 ID: ${msgId}
- 수신 시간: ${timeStr}
- 발신자: ${from}
- 제목: ${subject}
- 본문 내용:
${fullBody}

---
`;
  });
  
  // 2. Claude Sonnet 4.5 에 요약 요청
  Logger.log("Sonnet 4.5 모델에 브리핑 요약을 요청합니다... (시간 흐름 및 강도 높은 필터링 적용)");
  const summaryResult = generateGroupSummaryWithSonnet(emailsTextData);
  
  if (summaryResult) {
    // 3. 슬랙 발송
    const slackMsg = `*🕒 [정기 브리핑] 그룹 메일 요약 도착*\n총 ${threads.length}개의 그룹 메일 흐름을 분석했습니다.\n\n${summaryResult}`;
    const finalSlackMsg = slackMsg.replaceAll('**', '*'); // 완성된 데이터를 담는 새로운 상자
    sendToSlack(finalSlackMsg, threads[0].getMessages()[0].getId());
    
    // 4. 처리 완료 처리
    const processedLabel = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
    threads.forEach(thread => {
      thread.removeLabel(groupPendingLabel);
      thread.addLabel(processedLabel);
    });
    Logger.log("✅ 정기 브리핑 슬랙 발송 완료");
  } else {
    Logger.log("❌ 요약 생성에 실패했습니다.");
  }
}
