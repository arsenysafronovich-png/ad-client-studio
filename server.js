const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const USERS = {
  "Арик": process.env.PASSWORD_ARIK || "arik",
  "Таня": process.env.PASSWORD_TANYA || "tanya",
  "Эдик": process.env.PASSWORD_EDIK || "edik",
  "Иван": process.env.PASSWORD_IVAN || "ivan",
  "Алина": process.env.PASSWORD_ALINA || "alina"
};

const sessions = new Map();

const COPY_RULES = `
Ты пишешь рекламные тексты на русском/иврите для performance ads.

Главные правила:
- Перед текстом используй язык ниши: реальные слова клиентов, услуг, симптомов, этапов, страхов.
- Один текст = один угол, одна проблема, одна ситуация. Не смешивай боли, зоны и услуги.
- Всегда прогоняй текст через фильтр корявых фраз. Убирай канцелярит, дословные переводы, "с помощью остеопатии", "индивидуальный подход", "комплексное решение", "в разы", "навсегда", "гарантированно".
- Для здоровья, тела, остеопатии, массажа, косметологии: не обещай лечение, гарантированный результат, избавление, чудо. Не используй "лечить", "вылечить", "избавлю", "убирает жир".
- Для ремонтов не рекламируй "ремонт" вообще. Выбирай конкретную услугу: ванная, санузел, кухня, плитка, электрика, сантехника.
- Для перевозок/переездов отдельный сильный угол: "дешево на входе, дорого в день переезда". Показывай риск дешевой компании через скрытые доплаты: негабарит, этаж, коробки, разборка мебели, вторая машина, ручной пронос, упаковка. Вывод: нормальный переезд начинается с понятного расчета заранее.
- Для иврита не переводи русский шаблон дословно. Пиши как нативная реклама.
- Стиль: живой, прямой, без маркетинговой пластмассы. Можно эмоционально, но без истерики там, где ниша требует доверия.
- Дай несколько готовых вариантов. Каждый вариант должен иметь свой угол.
- После текстов дай короткий блок "Что проверено": язык ниши, стоп-краны, корявые фразы.
`;

const COPY_REFERENCES = `
Референс для перевозок, угол "дешево на входе, дорого в день переезда":

Самая дешёвая компания для переезда часто кажется хорошей идеей.

До момента, когда машина уже стоит у подъезда.

И тут начинается:

"Это негабарит".
"За этаж отдельно".
"Коробок больше, чем вы сказали".
"Мебель надо разбирать, это доплата".
"В машину не влезает, нужна вторая".

И вы уже не выбираете спокойно.
Ваши вещи стоят в коридоре, день сорван, а цена растёт прямо на месте.

Нормальный переезд начинается не с самой низкой цифры.

Он начинается с понятного расчёта: сколько вещей, какой этаж, есть ли лифт, нужна ли упаковка, разборка мебели и какая машина подойдёт.

Мы заранее уточняем детали, считаем объём работ и говорим, что входит в стоимость.

Чтобы переезд не превратился в дешёвое объявление, которое в итоге вышло дороже всех.

Напишите в WhatsApp. Рассчитаем переезд заранее и договоримся на удобное время.
`;

function defaultState() {
  return {
    clients: [],
    activeId: null
  };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState(), null, 2));
  }
}

function readState() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return defaultState();
  }
}

function writeState(state) {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function buildGenerationPrompt(body) {
  const client = body.client || {};
  return `
Сгенерируй рекламные тексты.

Количество вариантов: ${body.variantCount || 5}
Язык: ${client.language || "ru"}
Ниша: ${client.niche || ""}
Клиент/специалист: ${client.name || ""}
Таргетолог: ${client.mediaBuyer || ""}
География: ${client.location || ""}
Услуга: ${client.service || ""}
Главная проблема: ${client.problem || ""}
CTA: ${client.cta || "WhatsApp"}
Опыт/лет: ${client.proofYears || ""}
Соцдоказательство/людей: ${client.proofPeople || ""}
Проблема для соцдоказательства: ${client.proofProblem || ""}
Факты и ограничения:
${client.facts || ""}

Бриф:
${client.brief || ""}

Заметки для интернет-проверки:
${client.researchNotes || ""}

Верни только готовые варианты рекламы и короткий блок проверки. Не объясняй теорию.
`;
}

async function generateWithOpenAI(body) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY не подключен");
    error.status = 501;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: COPY_RULES },
        { role: "system", content: COPY_REFERENCES },
        { role: "user", content: buildGenerationPrompt(body) }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI generation failed");
  }

  const outputText = data.output_text || (data.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n");

  return outputText.trim();
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function currentUser(req) {
  const token = parseCookies(req).acs_session;
  return token ? sessions.get(token) : null;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    if (!USERS[body.user] || USERS[body.user] !== body.password) {
      sendJson(res, 401, { error: "Неверный пароль" });
      return;
    }
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, body.user);
    res.setHeader("Set-Cookie", `acs_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
    sendJson(res, 200, { user: body.user });
    return;
  }

  if (url.pathname === "/api/logout" && req.method === "POST") {
    const token = parseCookies(req).acs_session;
    if (token) sessions.delete(token);
    res.setHeader("Set-Cookie", "acs_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    sendJson(res, 200, { ok: true });
    return;
  }

  const user = currentUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Нужно войти" });
    return;
  }

  if (url.pathname === "/api/me" && req.method === "GET") {
    sendJson(res, 200, { user });
    return;
  }

  if (url.pathname === "/api/state" && req.method === "GET") {
    sendJson(res, 200, readState());
    return;
  }

  if (url.pathname === "/api/state" && req.method === "POST") {
    const state = await readBody(req);
    writeState(state);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/generate" && req.method === "POST") {
    const body = await readBody(req);
    const text = await generateWithOpenAI(body);
    sendJson(res, 200, { text });
    return;
  }

  sendJson(res, 404, { error: "Не найдено" });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || "Ошибка сервера" });
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  ensureDataDir();
  console.log(`Ad Client Studio running on ${PORT}`);
});
