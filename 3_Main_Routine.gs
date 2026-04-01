/**
 * 3_Main_Routine.gs
 * [마이너 수정] 소싱 메일 판별 시 전용 라벨(sourcing) 부착 로직 추가
 */
function processNewEmails() {
  Logger.log("메일 확인 루틴 시작...");
  
  const query = `is:unread in:inbox -category:promotions -category:social after:2026/03/31 -label:${CONFIG.PROCESSED_LABEL}`;
  const threads = GmailApp.search(query, 0, 10);
  
  if (threads.length === 0) {
    Logger.log("처리할 새로운 메일이 없습니다.");
    return;
  }

  // 기본 라벨 준비
  let processedLabel = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
  if (!processedLabel) processedLabel = GmailApp.createLabel(CONFIG.PROCESSED_LABEL);

  // ⭐️ [추가] 소싱 전용 라벨 준비
  let sourcingLabel = GmailApp.getUserLabelByName(CONFIG.SOURCING_LABEL);
  if (!sourcingLabel) sourcingLabel = GmailApp.createLabel(CONFIG.SOURCING_LABEL);

  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    const to = (msg.getTo() || '').toLowerCase();
    const cc = (msg.getCc() || '').toLowerCase();
    
    const isGroupMail = to.includes(CONFIG.GROUP_EMAIL) || cc.includes(CONFIG.GROUP_EMAIL);
    const isDirectToMe = to.includes(CONFIG.MY_EMAIL);
    const isProbablyBcc = to === "" || (!to.includes("kmong.com") && !cc.includes("kmong.com"));
    
    if (isGroupMail) {
      Logger.log(`[그룹 메일] ${msg.getSubject()}`);
      sendToSlack(`*그룹 메일 브리핑*\n발신: ${msg.getFrom()}\n제목: ${msg.getSubject()}`, msg.getId());
      
    } else if (isDirectToMe || isProbablyBcc) {
      const emailCategory = classifyEmailWithHaiku(msg);
      
      if (emailCategory === 'SPAM') {
        Logger.log(`[스팸 분류] ${msg.getSubject()}`);
        logSpamToSheet(msg, thread.getId());
        
      } else if (emailCategory === 'SOURCING') {
        // ⭐️ [수정] 소싱 메일로 판별된 경우 sourcing 라벨 부착
        Logger.log(`[인력 소싱 메일] sourcing 라벨 부착 및 초안 작성 시작...`);
        thread.addLabel(sourcingLabel); 
        
        const draft = generateSourcingDraftWithSonnet(msg);
        if (draft) {
          const slackMsg = `*🚨 신규 인력 소싱/프로젝트 제안 도착!*\n\n*발신:* ${msg.getFrom()}\n*제목:* ${msg.getSubject()}\n\n*🤖 수석 리크루터 초안:*\n${draft}`;
          sendToSlack(slackMsg, msg.getId());
          logFeedbackToSheet(msg, draft);
        }
        
      } else {
        Logger.log(`[일반 직접 수신] 일반 AI 초안 작성 시작...`);
        const draft = generateDraftWithSonnet(msg);
        if (draft) {
          const slackMsg = `*새로운 이메일 초안 대기 중*\n\n*발신:* ${msg.getFrom()}\n*제목:* ${msg.getSubject()}\n\n*🤖 일반 답장 초안:*\n${draft}`;
          sendToSlack(slackMsg, msg.getId());
          logFeedbackToSheet(msg, draft);
        }
      }
    }
    
    thread.addLabel(processedLabel);
  });
  
  Logger.log("메일 확인 루틴 완료.");
}
