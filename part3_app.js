// ============================================================
// ตั้งค่าการบันทึกคำถาม (สำหรับแอดมิน)
// วาง URL ของ Google Apps Script Web App ที่นี่ เพื่อบันทึกคำถามของผู้ใช้ทุกคน
// ไปยัง Google Sheet กลาง สำหรับนำไปทบทวนและเพิ่ม/แก้ไขฐานข้อมูลภายหลัง
// วิธีตั้งค่า ดูได้จากไฟล์ "คู่มือตั้งค่าการบันทึกคำถาม.md" ที่แนบมาด้วย
// หากปล่อยว่างไว้ ระบบจะไม่บันทึกข้อมูลใดๆ และจะไม่มี error เกิดขึ้น
const LOG_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbwgqpIUK7-baRCfT8hPS6mbFTI4MSzeh3KUxdTbEHPMpGjzn8cuukq_d7ns-FjYiAog3A/exec'; 
// ============================================================

// ---------- Setup ----------
const fuse = new Fuse(VACCINE_QA, {
  keys: [
    { name: 'q', weight: 0.6 },
    { name: 'a', weight: 0.25 },
    { name: 'cat', weight: 0.15 }
  ],
  threshold: 0.5,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true
});

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const categories = [...new Set(VACCINE_QA.map(x => x.cat))];

// Official medical/syringe line icon used for the bot avatar throughout the chat
const AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>';

// ---------- Conversational phrase banks ----------
const PROCESSING_STEPS = [
  '🔍 กำลังทำความเข้าใจคำถาม...',
  '📚 กำลังค้นข้อมูลจากแหล่งอ้างอิงที่เกี่ยวข้อง...',
  '🩺 กำลังตรวจสอบความถูกต้องของข้อมูล...',
  '🧠 กำลังเรียบเรียงคำตอบให้เข้าใจง่าย...'
];

const CATEGORY_EMPATHY = {
  'วัคซีนพื้นฐานในเด็ก': ['เป็นคำถามที่พ่อแม่ผู้ปกครองหลายคนสงสัยกันเลยค่ะ', 'เรื่องนี้สำคัญกับพัฒนาการของลูกน้อยมากค่ะ ขอตอบตามนี้นะคะ'],
  'อาการไข้จากวัคซีน': ['เข้าใจเลยค่ะ เวลาลูกมีไข้หลังฉีดวัคซีนก็เป็นห่วงกันเป็นธรรมดา', 'หลายบ้านก็กังวลเรื่องนี้เหมือนกันค่ะ อย่าเพิ่งตกใจไปนะคะ'],
  'โรคระบาดในเด็ก': ['เป็นประเด็นที่หลายพื้นที่ให้ความสำคัญอยู่ค่ะ'],
  'ฮาลาลและวัคซีน': ['เป็นคำถามที่พบบ่อยในพื้นที่ที่นับถือศาสนาอิสลามค่ะ ขอเรียนตามข้อมูลที่มีนะคะ'],
  'เปรียบเทียบกับมาเลเซีย': ['เรื่องนี้มีครอบครัวที่เดินทางข้ามแดนถามมาบ่อยเหมือนกันค่ะ'],
  'วัคซีนกับพัฒนาการเด็ก': ['เข้าใจความกังวลนี้ดีค่ะ เป็นคำถามที่พบบ่อยมากจากข่าวลือต่าง ๆ'],
  'การจัดเก็บวัคซีน': ['เป็นรายละเอียดทางเทคนิคที่ค่อนข้างสำคัญค่ะ'],
  'วัคซีนไข้หวัดใหญ่': ['ช่วงเปลี่ยนฤดูแบบนี้หลายคนถามเรื่องนี้กันเยอะเลยค่ะ'],
  'วัคซีนโควิด-19': ['เป็นเรื่องที่หลายคนยังมีคำถามค้างคาใจอยู่ค่ะ'],
  'วัคซีน HPV': ['เป็นเรื่องสุขภาพที่สำคัญมากสำหรับทุกเพศเลยค่ะ'],
  'ช่องทางติดต่อสอบถาม': ['ได้เลยค่ะ เดี๋ยวรวบรวมเบอร์ติดต่อให้นะคะ', 'สะดวกเลยค่ะ นี่คือช่องทางติดต่อที่ใช้ได้จริง'],
  'สถานที่บริการฉีดวัคซีน': ['ได้เลยค่ะ เดี๋ยวรวบรวมจุดบริการให้นะคะ', 'สะดวกเลยค่ะ นี่คือจุดฉีดวัคซีนที่ใช้บริการได้จริง']
};
const GENERIC_EMPATHY = ['เป็นคำถามที่ดีเลยค่ะ', 'ขอบคุณที่ถามเข้ามานะคะ', 'เดี๋ยวเช็คข้อมูลให้นะคะ'];

const UNCERTAIN_OPENERS = [
  'อาจไม่ตรงกับที่ถามเป๊ะ ๆ นะคะ แต่มีข้อมูลใกล้เคียงแบบนี้ค่ะ',
  'ลองค้นดูแล้ว เจอข้อมูลที่ใกล้เคียงที่สุดแบบนี้ค่ะ ลองอ่านดูก่อนนะคะ',
  'ไม่แน่ใจว่าตรงกับที่ถามหรือเปล่า แต่นี่คือข้อมูลที่ใกล้เคียงที่สุดที่มีค่ะ'
];
const FOLLOW_UPS = [
  'มีคำถามอื่นเกี่ยวกับวัคซีนอีกไหมคะ 😊',
  'อยากรู้เรื่องอื่นเพิ่มไหมคะ',
  'ถ้ามีคำถามอื่นถามต่อได้เลยนะคะ',
  'ยังมีอะไรอยากรู้เกี่ยวกับวัคซีนอีกไหมคะ'
];
const RELATED_LEADS = [
  'เผื่อสนใจ คำถามที่เกี่ยวข้องมีดังนี้ค่ะ',
  'อยากรู้เพิ่มเติมเรื่องที่ใกล้เคียงกันไหมคะ',
  'มีคำถามใกล้เคียงที่หลายคนถามบ่อยด้วยค่ะ'
];
const GREETING_REPLIES = [
  'สวัสดีค่ะ 👋 ยินดีให้ข้อมูลเรื่องวัคซีนเลยค่ะ อยากถามเรื่องอะไรดีคะ',
  'หวัดดีค่ะ มีคำถามเกี่ยวกับวัคซีนอะไรให้ช่วยไหมคะ',
];
const THANKS_REPLIES = [
  'ยินดีค่ะ 😊 ถ้ามีคำถามอื่นเกี่ยวกับวัคซีนถามได้เลยนะคะ',
  'ด้วยความยินดีค่ะ ถามเพิ่มได้ตลอดเลยค่ะ',
];
const BYE_REPLIES = [
  'ขอบคุณที่แวะมาคุยกันนะคะ ดูแลสุขภาพด้วยค่ะ 🌿',
  'บายค่ะ หากมีคำถามเรื่องวัคซีนอีก แวะมาถามได้เสมอนะคะ',
];
const NO_MATCH_OPENERS = [
  'อืม ลองค้นดูในฐานข้อมูลแล้ว ยังไม่พบข้อมูลที่ตรงกับคำถามนี้เลยค่ะ 🤔',
  'ขออภัยค่ะ ยังไม่มีข้อมูลเรื่องนี้ในฐานข้อมูลที่มีตอนนี้',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

// ---------- Question logging (for continuous knowledge-base improvement) ----------
// Sends every real question asked (not small talk) to the central log, tagged with
// whether the bot answered confidently, answered with low confidence, or found nothing.
// This never blocks or breaks the chat UX even if logging is unset or the network fails.
function logQuestion(question, status, matchedItem, score) {
  if (!LOG_ENDPOINT_URL) return;
  try {
    fetch(LOG_ENDPOINT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        question: question,
        status: status, // 'matched' | 'uncertain' | 'no_match'
        matchedQuestion: matchedItem ? matchedItem.q : '',
        category: matchedItem ? matchedItem.cat : '',
        score: (score !== undefined && score !== null) ? Number(score.toFixed(3)) : '',
        page: location.href,
        time: new Date().toISOString()
      })
    }).catch(() => {});
  } catch (e) { /* logging must never break the chat */ }
}

function isGreeting(text) {
  return /^(สวัสดี|หวัดดี|หวัดดีครับ|หวัดดีค่ะ|hello|hi|hey)\b|^(สวัสดี|หวัดดี)/i.test(text.trim());
}
function isThanks(text) {
  return /ขอบคุณ|ขอบใจ|thank/i.test(text);
}
function isBye(text) {
  return /^(บาย|ลาก่อน|บ๊ายบาย|bye|goodbye)/i.test(text.trim());
}

// ---------- Message rendering ----------
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="msg user"></div>`;
  row.querySelector('.msg').textContent = text;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function addBotMessageInstant(html, extraClass) {
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.innerHTML = `<div class="avatar">${AVATAR_SVG}</div><div class="msg bot${extraClass ? ' ' + extraClass : ''}"></div>`;
  row.querySelector('.msg').innerHTML = html;
  chatMessages.appendChild(row);
  scrollToBottom();
  return row;
}

// Typewriter effect: reveals plain text progressively
function addBotMessageTyped(plainText) {
  return new Promise(resolve => {
    const row = document.createElement('div');
    row.className = 'msg-row bot';
    row.innerHTML = `<div class="avatar">${AVATAR_SVG}</div><div class="msg bot"></div>`;
    const bubble = row.querySelector('.msg');
    chatMessages.appendChild(row);
    scrollToBottom();

    let i = 0;
    const step = Math.max(1, Math.round(plainText.length / 45));
    const timer = setInterval(() => {
      i += step;
      bubble.textContent = plainText.slice(0, i);
      scrollToBottom();
      if (i >= plainText.length) {
        clearInterval(timer);
        bubble.textContent = plainText;
        scrollToBottom();
        resolve(row);
      }
    }, 16);
  });
}

function showDotTyping() {
  const row = document.createElement('div');
  row.className = 'msg-row bot typing-row';
  row.id = 'typingIndicator';
  row.innerHTML = `<div class="avatar">${AVATAR_SVG}</div><div class="msg bot"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}
function hideDotTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// Shows a sequence of "processing" status lines (simulates the bot working through the question)
function showProcessing(stepCount) {
  return new Promise(resolve => {
    const row = document.createElement('div');
    row.className = 'msg-row bot processing-row';
    row.id = 'processingIndicator';
    row.innerHTML = `<div class="avatar">${AVATAR_SVG}</div><div class="msg bot"><span class="spinner"></span><span class="processing-text"></span></div>`;
    chatMessages.appendChild(row);
    const textEl = row.querySelector('.processing-text');
    scrollToBottom();

    const steps = PROCESSING_STEPS.slice(0, stepCount);
    let idx = 0;
    textEl.style.opacity = 1;
    textEl.textContent = steps[0];

    const interval = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        textEl.style.opacity = 0;
        setTimeout(() => {
          textEl.textContent = steps[idx];
          textEl.style.opacity = 1;
          scrollToBottom();
        }, 150);
      } else {
        clearInterval(interval);
        row.remove();
        resolve();
      }
    }, 620);
  });
}

function bindSuggestionButtons(container) {
  container.querySelectorAll('.suggestions button[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = VACCINE_QA[parseInt(btn.dataset.idx)];
      addUserMessage(item.q);
      logQuestion(item.q, 'matched', item, 0);
      runAnswerFlow(item, false);
    });
  });
  container.querySelectorAll('.suggestions button[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      addUserMessage(`อยากรู้เรื่อง${btn.dataset.cat}`);
      respondWithCategory(btn.dataset.cat);
    });
  });
}

// ---------- Core response flow: processing -> empathy bubble -> typed answer -> source note -> follow-up ----------
async function runAnswerFlow(item, uncertain) {
  // Step 1: visible "processing" sequence (feels like real thinking/research)
  await showProcessing(uncertain ? 4 : 3);
  await wait(200);

  // Step 2: short conversational acknowledgment bubble
  const empathyBank = CATEGORY_EMPATHY[item.cat] || GENERIC_EMPATHY;
  const opener = uncertain ? pick(UNCERTAIN_OPENERS) : pick(empathyBank);
  addBotMessageInstant(opener);
  await wait(550 + Math.random() * 350);

  // Step 3: typed main answer
  showDotTyping();
  await wait(500 + Math.random() * 400);
  hideDotTyping();
  await addBotMessageTyped(item.a);
  await wait(300);

  // Step 4: source note as its own small bubble
  addBotMessageInstant(
    `📎 แหล่งอ้างอิง: <a href="${item.source}" target="_blank" rel="noopener">${item.sourceLabel}</a>`,
    'note-bubble'
  );
  await wait(650);

  // Step 5: follow-up + related suggestions
  showDotTyping();
  await wait(450);
  hideDotTyping();
  const results = fuse.search(item.q).filter(r => r.item !== item).slice(0, 3);
  let html = pick(FOLLOW_UPS);
  if (results.length > 0) {
    html += `<br><span style="color:#94a3b8;font-size:12.5px;">${pick(RELATED_LEADS)}</span>`;
    html += `<div class="suggestions">`;
    results.forEach(r => {
      html += `<button data-idx="${VACCINE_QA.indexOf(r.item)}">${r.item.q}</button>`;
    });
    html += `</div>`;
  }
  const row = addBotMessageInstant(html);
  bindSuggestionButtons(row);
}

function respondWithCategory(cat) {
  showDotTyping();
  setTimeout(() => {
    hideDotTyping();
    const items = VACCINE_QA.filter(x => x.cat === cat).slice(0, 8);
    let html = `หมวด <strong>${cat}</strong> มีคำถามที่คนถามบ่อยแบบนี้ค่ะ ลองเลือกดูได้เลยนะคะ`;
    html += `<div class="suggestions">`;
    items.forEach(it => {
      html += `<button data-idx="${VACCINE_QA.indexOf(it)}">${it.q}</button>`;
    });
    html += `</div>`;
    const row = addBotMessageInstant(html);
    bindSuggestionButtons(row);
  }, 500);
}

async function respondNoMatch() {
  await showProcessing(2);
  let html = `${pick(NO_MATCH_OPENERS)} ลองถามด้วยคำอื่น หรือเลือกหมวดที่สนใจด้านล่างนี้ดูไหมคะ`;
  html += `<div class="suggestions">`;
  categories.forEach(c => {
    html += `<button data-cat="${c}">${c}</button>`;
  });
  html += `</div>`;
  const row = addBotMessageInstant(html);
  bindSuggestionButtons(row);
}

function respondSmallTalk(replyBank) {
  showDotTyping();
  setTimeout(() => {
    hideDotTyping();
    addBotMessageInstant(pick(replyBank));
  }, 450);
}

// ---------- Main query handler ----------
function handleQuery(rawText) {
  const text = rawText.trim();
  if (isGreeting(text)) return respondSmallTalk(GREETING_REPLIES);
  if (isThanks(text)) return respondSmallTalk(THANKS_REPLIES);
  if (isBye(text)) return respondSmallTalk(BYE_REPLIES);

  const results = fuse.search(text);
  if (results.length === 0) {
    logQuestion(text, 'no_match', null, undefined);
    return respondNoMatch();
  }

  const best = results[0];
  const uncertain = best.score > 0.32;
  logQuestion(text, uncertain ? 'uncertain' : 'matched', best.item, best.score);
  runAnswerFlow(best.item, uncertain);
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  addUserMessage(text);
  chatInput.value = '';
  handleQuery(text);
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// ---------- Welcome message ----------
window.addEventListener('DOMContentLoaded', () => {
  const introItems = [
    VACCINE_QA.find(x => x.q.includes('เด็กเล็กจำเป็นต้องฉีดวัคซีนทุกตัว')),
    VACCINE_QA.find(x => x.q.includes('ลูกมีไข้หลังจากฉีดวัคซีน')),
    VACCINE_QA.find(x => x.q.includes('ฮาลาลหรือไม่ และสอดคล้อง')),
    VACCINE_QA.find(x => x.q.includes('HPV กี่เข็มและเว้นอย่างไร')),
    VACCINE_QA.find(x => x.q.includes('มีช่องทางติดต่อสอบถามเรื่องฉีดวัคซีน')),
    VACCINE_QA.find(x => x.q.includes('มีสถานที่ให้บริการฉีดวัคซีนที่ไหนบ้าง'))
  ].filter(Boolean);

  let html = `สวัสดีค่ะ 👋 ดิฉันเป็นผู้ช่วยตอบคำถามเรื่องวัคซีนเด็กและผู้ใหญ่ พิมพ์คำถามมาได้เลยค่ะ เช่น`;
  html += `<div class="suggestions">`;
  introItems.forEach(it => {
    html += `<button data-idx="${VACCINE_QA.indexOf(it)}">${it.q}</button>`;
  });
  html += `</div>`;
  const row = addBotMessageInstant(html);
  bindSuggestionButtons(row);
  chatInput.focus();
});
</script>
</body>
</html>
