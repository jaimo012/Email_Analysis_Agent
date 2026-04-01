/**
 * 4_AI_Service.gs
 * Claude API 연동 (Haiku와 Sonnet 역할 분담)
 */

/**
 * [빠른 스캐닝] Haiku 4.5 모델로 스팸 여부 판단
 */
function checkSpamWithHaiku(msg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  const subject = msg.getSubject();
  const bodySnippet = msg.getPlainBody().slice(0, 300); // 판단을 위해 본문 일부만 발췌
  
  const prompt = `다음 이메일이 광고, 마케팅, 불법 스팸인지 판단하세요.
  제목: ${subject}
  본문: ${bodySnippet}
  
  규칙: 스팸이면 오직 "SPAM"이라고만 대답하고, 정상 비즈니스 메일이면 "NORMAL"이라고만 대답하세요. 다른 부가 설명은 절대 하지 마세요.`;

  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_HAIKU, // ⭐️ 가장 빠른 Haiku 모델 사용
      max_tokens: 10, // 단답형이므로 토큰을 극단적으로 최소화하여 비용/속도 절감
      messages: [{ role: 'user', content: prompt }] 
    }),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
    const result = JSON.parse(res.getContentText());
    if (result.error) return false; // 에러 시 안전을 위해 정상 메일로 취급
    
    const answer = result.content[0].text.trim().toUpperCase();
    return answer.includes("SPAM");
  } catch (e) {
    return false;
  }
}

/**
 * [심층 분석] Sonnet 4.5 모델로 이메일 초안 생성
 */
function generateDraftWithSonnet(msg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  const styleGuide = PropertiesService.getScriptProperties().getProperty('MY_EMAIL_STYLE') || "기본 톤앤매너로 작성해주세요.";
  
  const prompt = `[내 이메일 스타일 가이드]\n${styleGuide}\n\n---\n발신자: ${msg.getFrom()}\n제목: ${msg.getSubject()}\n본문:\n${msg.getPlainBody().slice(0, 1000)}\n\n위 이메일에 대한 답장 초안을 가이드에 맞춰 작성해줘.`;
  
  const options = {
    method: 'post',
    headers: { 'x-api-key': apiKey, 'anthropic-version': CONFIG.CLAUDE_VERSION, 'content-type': 'application/json' },
    payload: JSON.stringify({ 
      model: CONFIG.MODEL_SONNET, // ⭐️ 정교한 글쓰기를 위한 Sonnet 모델 사용
      max_tokens: 800, 
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
