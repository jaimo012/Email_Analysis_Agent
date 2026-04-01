/**
 * 4_AI_Service.gs
 * Claude API 연동 (Haiku와 Sonnet 역할 분담)
 * 마크다운 제거 및 스타일 가이드 반영 버전
 */

/**
 * [분류 센터장] Haiku 4.5 모델로 이메일 카테고리 3단 분류
 */
function classifyEmailWithHaiku(msg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  const subject = msg.getSubject();
  const bodySnippet = msg.getPlainBody().slice(0, 500); 
  
  const prompt = `다음 이메일을 읽고 세 가지 카테고리 중 하나로 정확히 분류하세요.
  
  [카테고리 정의]
  1. SPAM: 단순 광고, 마케팅, 불법 스팸 메일
  2. SOURCING: 프로젝트 제안/입찰, 인력 소싱 요청(개발자/전문가 추천 요청)
  3. NORMAL: 그 외 일반적인 비즈니스 커뮤니케이션 메일
  
  제목: ${subject}
  본문: ${bodySnippet}
  
  규칙: 오직 "SPAM", "SOURCING", "NORMAL" 중 하나의 단어만 출력하세요. 부가 설명은 절대 하지 마세요.`;

  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_HAIKU, 
      max_tokens: 10, 
      messages: [{ role: 'user', content: prompt }] 
    }),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(res.getContentText());
    if (result.error) return 'NORMAL';
    
    const answer = result.content[0].text.trim().toUpperCase();
    if (answer.includes('SPAM')) return 'SPAM';
    if (answer.includes('SOURCING')) return 'SOURCING';
    return 'NORMAL';
  } catch (e) {
    return 'NORMAL';
  }
}

/**
 * [일반 초안] Sonnet 4.5 모델
 */
function generateDraftWithSonnet(msg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  const styleGuide = PropertiesService.getScriptProperties().getProperty('MY_EMAIL_STYLE') || "정중한 비즈니스 톤으로 작성해주세요.";
  
  const prompt = `
[내 이메일 스타일 가이드]
${styleGuide}

위 가이드라인의 인사말, 말투를 반드시 준수하여 아래 메일에 대한 답장 초안을 작성하세요.

[제약 조건]
1. ###, ** 등 마크다운 기호를 절대 사용하지 마세요.
2. 실제 사람이 보낸 메일처럼 자연스러운 줄바꿈만 사용하세요.

[수신 메일]
발신자: ${msg.getFrom()}
제목: ${msg.getSubject()}
본문:
${msg.getPlainBody().slice(0, 1000)}`;
  
  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_SONNET, 
      max_tokens: 1000, 
      messages: [{ role: 'user', content: prompt }] 
    }),
    muteHttpExceptions: true
  };
  
  try {
    const res = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(res.getContentText());
    return result.error ? null : result.content[0].text;
  } catch (e) {
    return null;
  }
}

/**
 * [수석 리크루터 모드] Sonnet 4.5 모델
 * 스타일 가이드 반영 + 마크다운 제거 버전
 */
function generateSourcingDraftWithSonnet(msg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  const styleGuide = PropertiesService.getScriptProperties().getProperty('MY_EMAIL_STYLE') || "수석 테크니컬 리크루터로서 정중하게 작성해주세요.";
  
  const systemPrompt = `
당신은 IT 기술 이해도가 높은 10년 차 수석 테크니컬 리크루터입니다. 

[내 이메일 스타일 가이드]
${styleGuide}

[과업]
위 스타일 가이드의 인사말, 톤앤매너를 유지하면서, 고객의 소싱 요청에 대한 답장을 작성하세요.

[메일 구성 로직]
1. 가이드에 따른 정중한 인사로 시작하세요.
2. "보내주신 내용 확인했습니다. 제가 이해한 핵심 내용이 다음과 같은데 맞을까요?"라며 요청 사항을 간결하게 요약하세요.
3. "추가로, 더 적합한 전문가를 매칭해드리기 위해 아래 내용들도 함께 알 수 있다면 큰 도움이 될 것 같습니다."라며 전문적인 질문을 2~3개 던지세요.

[중요 제약 조건]
- 절대 마크다운(###, **, -, > 등)을 사용하지 마세요. 
- 강조가 필요하면 줄바꿈이나 "내용:" 같은 일반 텍스트를 활용하세요. 
- AI가 쓴 보고서가 아닌, 차장님이 직접 타이핑한 메일처럼 보여야 합니다.
  `;
  
  const prompt = `${systemPrompt}\n\n[입력 메일]\n발신자: ${msg.getFrom()}\n제목: ${msg.getSubject()}\n본문:\n${msg.getPlainBody().slice(0, 1500)}`;
  
  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_SONNET, 
      max_tokens: 1500, 
      messages: [{ role: 'user', content: prompt }] 
    }),
    muteHttpExceptions: true
  };
  
  try {
    const res = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(res.getContentText());
    return result.error ? null : result.content[0].text;
  } catch (e) {
    return null;
  }
}

/**
 * ⭐️ [최종 고도화] 그룹 메일 브리핑 요약 (Sonnet 4.5 모델)
 */
function generateGroupSummaryWithSonnet(emailsText) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  
  const prompt = `다음은 오늘 그룹메일로 수신된 이메일 데이터입니다. 바쁜 담당자가 '개입 여부'를 즉시 판단할 수 있도록 아래 지침에 따라 초고도화된 브리핑 리포트를 작성하세요.

[핵심 지침]
1. 제목 유지: 각 요약 섹션의 헤더는 원본 메일의 '제목'을 토씨 하나 틀리지 않고 사용하세요.
2. 시간 기반 핑퐁 요약: 각 메일에 포함된 '수신 시간'을 참고하여 대화의 흐름을 파악하세요. 단순히 메일을 요약하는 것이 아니라, "A가 몇 시에 질문했고, B가 몇 시에 어떻게 대답하여 현재 어떤 상태다"라는 '맥락'이 드러나게 작성하세요.
3. 🚨 고강도 특이사항 필터링 (가장 중요): 
   - 담당자들이 일상적으로 잘 처리하고 있는 루틴한 업무(단순 배정, 업무 확인 등)는 절대 🚨 항목으로 만들지 마세요.
   - 오직 다음과 같은 '위험 신호'가 감지될 때만 🚨 항목을 생성하세요.
     * 고객의 명확한 불만 제기(Complaint)
     * 발신자의 사과 표현(미안합니다, 죄송합니다, 실수했습니다 등)
     * 프로젝트 일정의 심각한 지연이나 병목 현상
     * 담당자 선에서 해결 불가능한 의사결정 필요 상황
   - 위 조건에 해당하지 않으면 🚨 항목을 아예 생략하세요.
4. 서론/결론 생략: 바로 본론 리포트만 출력하세요.

[출력 포맷 예시]
[원본 메일 제목]
*발신*: OOO 외 n명
*경과*: (14:20) 고객의 문의 발생 -> (14:45) 담당자 A가 1차 대응 완료. 현재 최종 승인 프로세스 진행 중.
*🚨 특이사항*: (발생 시에만 작성) 고객이 이전 대응에 대해 '실망했다'는 표현을 사용함. 직접적인 사과 및 관계 회복 필요.

[이메일 목록 데이터]
${emailsText}`;

  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_SONNET, 
      max_tokens: 1500, 
      messages: [{ role: 'user', content: prompt }] 
    }),
    muteHttpExceptions: true
  };
  
  try {
    const res = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(res.getContentText());
    return result.error ? null : result.content[0].text;
  } catch (e) {
    return null;
  }
}
