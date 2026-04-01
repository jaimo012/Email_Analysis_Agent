/**
 * 3_Main_Routine.gs
 * 미읽음 메일 확인 및 분류 루틴 (스레드 업데이트 대응 버전)
 */
function processNewEmails() {
  Logger.log("메일 확인 루틴 시작...");
  
  // [가드 클로즈] 워킹아워 (09시 ~ 17시 59분) 검사
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour < 9 || currentHour >= 18) {
    Logger.log(`현재 시간(${currentHour}시)은 워킹아워가 아니므로 종료합니다.`);
    return; 
  }

  // ⭐️ [수정] -label:PROCESSED 조건을 제거하여, 새 답장이 온 기존 스레드도 검색 대상에 포함합니다.
  const query = `is:unread in:inbox -category:promotions -category:social after:2026/03/31`;
  const threads = GmailApp.search(query, 0, 10);
  
  if (threads.length === 0) {
    Logger.log("처리할 새로운 메일이 없습니다.");
    return;
  }

  // 필요한 라벨들 준비
  const processedLabel = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL) || GmailApp.createLabel(CONFIG.PROCESSED_LABEL);
  const sourcingLabel = GmailApp.getUserLabelByName(CONFIG.SOURCING_LABEL) || GmailApp.createLabel(CONFIG.SOURCING_LABEL);
  const groupPendingLabel = GmailApp.getUserLabelByName(CONFIG.GROUP_PENDING_LABEL) || GmailApp.createLabel(CONFIG.GROUP_PENDING_LABEL);

  threads.forEach(thread => {
    const messages = thread.getMessages();
    // ⭐️ [수정] 스레드의 '가장 마지막' 메시지를 가져와서 현재 상태를 파악합니다.
    const msg = messages[messages.length - 1]; 
    
    // 이미 읽은 메시지라면 (스레드 전체는 unread지만 이 메시지는 처리했을 경우) 건너뜁니다.
    if (!msg.isUnread()) return;

    const from = (msg.getFrom() || '').toLowerCase();
    const to = (msg.getTo() || '').toLowerCase();
    const cc = (msg.getCc() || '').toLowerCase();
    
    // ⭐️ [상태 리셋] 이미 라벨이 붙어있던 스레드에 새 메시지가 온 것이라면 라벨을 떼고 재분류합니다.
    const existingLabels = thread.getLabels().map(l => l.getName());
    if (existingLabels.includes(CONFIG.PROCESSED_LABEL)) {
      thread.removeLabel(processedLabel);
    }
    if (existingLabels.includes(CONFIG.GROUP_PENDING_LABEL)) {
      thread.removeLabel(groupPendingLabel);
    }

    // [판별 로직]
    // 1. 내가 직접 수신자인가? (답장에서 내가 추가되었는지 여기서 체크됨)
    const isDirectToMe = to.includes(CONFIG.MY_EMAIL.toLowerCase());
    
    // 2. 회사 도메인(kmong.com)이나 그룹 메일이 연관되어 있는가?
    const hasKmongDomain = from.includes('kmong.com') || to.includes('kmong.com') || cc.includes('kmong.com');
    const hasGroupEmail = to.includes(CONFIG.GROUP_EMAIL.toLowerCase()) || cc.includes(CONFIG.GROUP_EMAIL.toLowerCase());

    // 3. 분류 결정
    const isGroupMailPending = !isDirectToMe && (hasKmongDomain || hasGroupEmail);
    const isProbablyBcc = !isDirectToMe && !hasKmongDomain && !hasGroupEmail;

    if (isGroupMailPending) {
      Logger.log(`[그룹/참조 메일 분류] ${msg.getSubject()}`);
      thread.addLabel(groupPendingLabel);
      
    } else if (isDirectToMe || isProbablyBcc) {
      const emailCategory = classifyEmailWithHaiku(msg);
      
      if (emailCategory === 'SPAM') {
        Logger.log(`[스팸 분류] ${msg.getSubject()}`);
        logSpamToSheet(msg, thread.getId());
        
      } else if (emailCategory === 'SOURCING') {
        Logger.log(`[소싱 메일 분류] sourcing 라벨 부착 및 초안 작성`);
        thread.addLabel(sourcingLabel); 
        const draft = generateSourcingDraftWithSonnet(msg);
        if (draft) {
          sendToSlack(`*🚨 [업데이트] 인력 소싱/프로젝트 제안 도착!*\n*발신:* ${msg.getFrom()}\n*제목:* ${msg.getSubject()}\n\n*🤖 초안:*\n${draft}`, msg.getId());
          logFeedbackToSheet(msg, draft);
        }
        
      } else {
        Logger.log(`[일반 직접 수신] 초안 작성 시작`);
        const draft = generateDraftWithSonnet(msg);
        if (draft) {
          sendToSlack(`*📧 [업데이트] 새 이메일 초안 대기 중*\n*발신:* ${msg.getFrom()}\n*제목:* ${msg.getSubject()}\n\n*🤖 초안:*\n${draft}`, msg.getId());
          logFeedbackToSheet(msg, draft);
        }
      }
    }
    
    // 처리가 끝나면 다시 완료 라벨 부착
    thread.addLabel(processedLabel);
  });
  
  Logger.log("메일 확인 및 분류 완료.");
}
