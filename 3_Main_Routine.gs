/**
 * 3_Main_Routine.gs
 * 30분마다 실행되는 메일 확인 및 분류 컨트롤러
 */
function processNewEmails() {
  Logger.log("메일 확인 루틴 시작...");
  
  const query = `is:unread in:inbox -label:${CONFIG.PROCESSED_LABEL}`;
  const threads = GmailApp.search(query, 0, 10);
  
  if (threads.length === 0) {
    Logger.log("새로운 메일이 없습니다.");
    return;
  }

  let processedLabel = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
  if (!processedLabel) processedLabel = GmailApp.createLabel(CONFIG.PROCESSED_LABEL);

  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    const to = (msg.getTo() || '').toLowerCase();
    const cc = (msg.getCc() || '').toLowerCase();
    
    const isGroupMail = to.includes(CONFIG.GROUP_EMAIL) || cc.includes(CONFIG.GROUP_EMAIL);
    
    if (isGroupMail) {
      Logger.log(`[그룹 메일] ${msg.getSubject()}`);
      sendToSlack(`*그룹 메일 수신*\n발신: ${msg.getFrom()}\n제목: ${msg.getSubject()}`, msg.getId());
      
    } else {
      // ⭐️ Haiku 모델을 이용한 초고속 스팸 스캐닝
      const isSpam = checkSpamWithHaiku(msg);
      
      if (isSpam) {
        Logger.log(`[스팸 분류] ${msg.getSubject()}`);
        logSpamToSheet(msg, thread.getId());
      } else {
        Logger.log(`[직접 수신] AI 초안 작성 시작...`);
        // ⭐️ Sonnet 모델을 이용한 고품질 초안 작성
        const draft = generateDraftWithSonnet(msg);
        
        if (draft) {
          const slackMsg = `*새로운 이메일 초안 대기 중*\n\n*발신:* ${msg.getFrom()}\n*제목:* ${msg.getSubject()}\n\n*🤖 AI 초안:*\n${draft}`;
          sendToSlack(slackMsg, msg.getId());
          logFeedbackToSheet(msg, draft);
        }
      }
    }
    thread.addLabel(processedLabel);
  });
  
  Logger.log("메일 확인 루틴 완료.");
}
