/**
 * 5_External_Service.gs
 * 외부 서비스(Slack, Google Sheets) 적재 로직
 */
function sendToSlack(text, messageId) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;
  
  const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
  const finalMessage = `${text}\n\n📧 <${gmailLink}|Gmail에서 원본 열기>`;
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: finalMessage })
  };
  UrlFetchApp.fetch(webhookUrl, options);
}

function logSpamToSheet(msg, threadId) {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_SPAM);
  if (!sheet) return;

  const date = Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
  const link = `https://mail.google.com/mail/u/0/#inbox/${msg.getId()}`;
  const summary = msg.getPlainBody().slice(0, 100);
  
  sheet.appendRow([date, msg.getFrom(), msg.getSubject(), summary, link, msg.getId(), threadId, "대기중"]);
}

function logFeedbackToSheet(msg, draft) {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_FEEDBACK);
  if (!sheet) return;

  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
  const bodySnippet = msg.getPlainBody().slice(0, 500);
  
  sheet.appendRow([date, "직접 수신", msg.getTo(), bodySnippet, draft, "", ""]);
}
