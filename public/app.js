const STORAGE_KEY = "ad-client-studio-v1";
const SESSION_KEY = "ad-client-studio-session-v1";
const USERS = {
  "Арик": "arik",
  "Таня": "tanya",
  "Эдик": "edik",
  "Иван": "ivan",
  "Алина": "alina"
};

const defaultClient = () => ({
  id: crypto.randomUUID(),
  name: "Новый клиент",
  mediaBuyer: "Таня",
  niche: "beauty_body",
  status: "Бриф",
  language: "ru",
  location: "",
  service: "",
  price: "",
  problems: "",
  procedures: "",
  notes: "",
  problem: "",
  facts: "",
  brief: "",
  files: [],
  creativeReserve: [],
  logs: [],
  finalOutput: "",
  approvedText: "",
  productionStatus: "Текст не одобрен",
  process: [],
  updatedAt: new Date().toISOString()
});

const state = {
  clients: [],
  activeId: null
};

let saveTimer = null;
let generationBusy = false;

const $ = (id) => document.getElementById(id);

const elements = {
  loginScreen: $("loginScreen"),
  loginForm: $("loginForm"),
  loginUser: $("loginUser"),
  loginPassword: $("loginPassword"),
  loginError: $("loginError"),
  logoutButton: $("logoutButton"),
  clientList: $("clientList"),
  dashboardPage: $("dashboardPage"),
  clientPage: $("clientPage"),
  dashboardPageButton: $("dashboardPageButton"),
  clientTableBody: $("clientTableBody"),
  buyerTableTitle: $("buyerTableTitle"),
  buyerTableCount: $("buyerTableCount"),
  clientSearch: $("clientSearch"),
  pageEyebrow: $("pageEyebrow"),
  clientTitle: $("clientTitle"),
  deleteClientButton: $("deleteClientButton"),
  clientStatusPill: $("clientStatusPill"),
  clientName: $("clientName"),
  clientMediaBuyer: $("clientMediaBuyer"),
  clientNiche: $("clientNiche"),
  clientStatus: $("clientStatus"),
  clientLanguage: $("clientLanguage"),
  clientLocation: $("clientLocation"),
  clientService: $("clientService"),
  clientPrice: $("clientPrice"),
  clientProblems: $("clientProblems"),
  clientProcedures: $("clientProcedures"),
  clientNotes: $("clientNotes"),
  fileInput: $("fileInput"),
  fileList: $("fileList"),
  fileCount: $("fileCount"),
  reserveList: $("reserveList"),
  reserveCount: $("reserveCount"),
  logList: $("logList"),
  logCount: $("logCount"),
  logType: $("logType"),
  logNote: $("logNote"),
  productionStatus: $("productionStatus"),
  finalOutput: $("finalOutput"),
  editInstruction: $("editInstruction"),
  generationStatus: $("generationStatus"),
  processList: $("processList"),
  templateBadge: $("templateBadge"),
  adFormat: $("adFormat"),
  angleMode: $("angleMode"),
  variantCount: $("variantCount"),
  mediaBuyerSelect: $("mediaBuyerSelect")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Ошибка сервера");
  }
  return response.json();
}

async function load() {
  try {
    const serverState = await api("/api/state");
    Object.assign(state, serverState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) Object.assign(state, JSON.parse(saved));
  }

  if (!state.clients.length) {
    state.activeId = null;
    return;
  }
  if (!state.clients.some((client) => client.id === state.activeId)) {
    state.activeId = state.clients[0].id;
  }
}

async function loadSession() {
  try {
    const { user } = await api("/api/me");
    if (user && USERS[user]) {
      await load();
      fillForm(getActiveClient());
      applyLogin(user);
      return;
    }
  } catch {
    if (window.location.protocol !== "file:") {
      localStorage.removeItem(SESSION_KEY);
      elements.loginScreen.classList.remove("hidden");
      return;
    }
    const user = localStorage.getItem(SESSION_KEY);
    if (user && USERS[user]) {
      await load();
      fillForm(getActiveClient());
      applyLogin(user);
    }
  }
}

function applyLogin(user) {
  elements.mediaBuyerSelect.value = user;
  elements.mediaBuyerSelect.disabled = user !== "Арик";
  elements.loginScreen.classList.add("hidden");
  localStorage.setItem(SESSION_KEY, user);
  showPage("dashboard");
  renderAll();
}

async function handleLogin(event) {
  event.preventDefault();
  const user = elements.loginUser.value;
  const password = elements.loginPassword.value;
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ user, password })
    });
    elements.loginError.textContent = "";
    await load();
    fillForm(getActiveClient());
    applyLogin(user);
  } catch (error) {
    if (window.location.protocol !== "file:") {
      elements.loginError.textContent = error.message || "Не получилось войти";
      return;
    }
    if (USERS[user] !== password) {
      elements.loginError.textContent = error.message || "Неверный пароль";
      return;
    }
    elements.loginError.textContent = "";
    await load();
    fillForm(getActiveClient());
    applyLogin(user);
    return;
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  elements.loginPassword.value = "";
  elements.loginScreen.classList.remove("hidden");
}

function save() {
  const active = getActiveClient();
  if (active) {
    readForm(active);
  }
  persistOnly();
  renderAll();
}

function getActiveClient() {
  return state.clients.find((client) => client.id === state.activeId);
}

function clientTextContext(client) {
  return [
    client.service,
    client.problems,
    client.problem,
    client.procedures,
    client.price,
    client.notes,
    client.brief
  ].filter(Boolean).join(" ");
}

function readForm(client) {
  client.name = elements.clientName.value.trim() || "Новый клиент";
  client.mediaBuyer = elements.clientMediaBuyer.value;
  client.niche = elements.clientNiche.value;
  client.status = elements.clientStatus.value;
  client.language = elements.clientLanguage.value;
  client.location = elements.clientLocation.value.trim();
  client.service = elements.clientService.value.trim();
  client.price = elements.clientPrice.value.trim();
  client.problems = elements.clientProblems.value.trim();
  client.procedures = elements.clientProcedures.value.trim();
  client.notes = elements.clientNotes.value.trim();
  client.problem = client.problems;
  client.facts = [client.price && `Цены: ${client.price}`, client.procedures && `Процедуры/услуги: ${client.procedures}`].filter(Boolean).join("\n");
  client.brief = client.notes;
  client.finalOutput = elements.finalOutput.value.trim();
  client.updatedAt = new Date().toISOString();
}

function fillForm(client) {
  if (!client) {
    clearForm();
    return;
  }
  elements.clientName.value = client.name || "";
  elements.clientMediaBuyer.value = client.mediaBuyer || "Таня";
  elements.clientNiche.value = client.niche || "beauty_body";
  elements.clientStatus.value = client.status || "Бриф";
  elements.clientLanguage.value = client.language || "ru";
  elements.clientLocation.value = client.location || "";
  elements.clientService.value = client.service || "";
  elements.clientPrice.value = client.price || "";
  elements.clientProblems.value = client.problems || client.problem || "";
  elements.clientProcedures.value = client.procedures || "";
  elements.clientNotes.value = client.notes || client.brief || "";
  elements.finalOutput.value = client.finalOutput || "";
  elements.productionStatus.textContent = client.productionStatus || "Текст не одобрен";
}

function clearForm() {
  elements.clientName.value = "";
  elements.clientMediaBuyer.value = elements.mediaBuyerSelect.value === "Арик" ? "Таня" : elements.mediaBuyerSelect.value;
  elements.clientNiche.value = "beauty_body";
  elements.clientStatus.value = "Бриф";
  elements.clientLanguage.value = "ru";
  elements.clientLocation.value = "";
  elements.clientService.value = "";
  elements.clientPrice.value = "";
  elements.clientProblems.value = "";
  elements.clientProcedures.value = "";
  elements.clientNotes.value = "";
  elements.finalOutput.value = "";
  elements.productionStatus.textContent = "Текст не одобрен";
}

function renderAll() {
  renderClientList();
  renderClientTable();
  const active = getActiveClient();
  if (!active) {
    clearForm();
    elements.clientStatusPill.textContent = "Нет клиента";
    elements.fileCount.textContent = "0 файлов";
    elements.reserveCount.textContent = "0 пакетов";
    elements.logCount.textContent = "0 записей";
    elements.templateBadge.textContent = "Нет клиента";
    renderFiles({ files: [] });
    renderReserve({ creativeReserve: [] });
    renderLogs({ logs: [] });
    renderProcess([]);
    updateTopbar();
    return;
  }
  elements.clientStatusPill.textContent = active.status;
  elements.fileCount.textContent = `${active.files.length} файлов`;
  elements.reserveCount.textContent = `${(active.creativeReserve || []).length} пакетов`;
  elements.logCount.textContent = `${(active.logs || []).length} записей`;
  elements.templateBadge.textContent = getTemplateName(active.niche);
  renderFiles(active);
  renderReserve(active);
  renderLogs(active);
  renderProcess(active.process || []);
  updateTopbar();
}

function visibleClients() {
  const query = elements.clientSearch.value.trim().toLowerCase();
  const selectedBuyer = elements.mediaBuyerSelect.value;
  return state.clients.filter((client) => {
    const buyerMatches = selectedBuyer === "Арик" || (client.mediaBuyer || "Таня") === selectedBuyer;
    const queryMatches = [client.name, client.service, client.location, client.status, client.mediaBuyer]
      .join(" ")
      .toLowerCase()
      .includes(query);
    return buyerMatches && queryMatches;
  });
}

function renderClientList() {
  const clients = visibleClients();

  elements.clientList.innerHTML = "";
  clients.forEach((client) => {
    const button = document.createElement("button");
    button.className = `client-item ${client.id === state.activeId ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(client.name)}</strong><span>${escapeHtml(client.mediaBuyer || "Таня")} · ${escapeHtml(client.status)} · ${escapeHtml(getTemplateName(client.niche))}</span>`;
    button.addEventListener("click", () => {
      const active = getActiveClient();
      if (active) readForm(active);
      state.activeId = client.id;
      fillForm(client);
      persistOnly();
      renderAll();
      showPage("client");
    });
    elements.clientList.appendChild(button);
  });
}

function renderClientTable() {
  const clients = visibleClients();
  const selectedBuyer = elements.mediaBuyerSelect.value;
  elements.buyerTableTitle.textContent = selectedBuyer === "Арик" ? "Клиенты: все таргетологи" : `Клиенты: ${selectedBuyer}`;
  elements.buyerTableCount.textContent = `${clients.length} клиентов`;
  elements.clientTableBody.innerHTML = "";

  if (!clients.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="empty-row" colspan="6">У этого таргетолога пока нет клиентов</td>`;
    elements.clientTableBody.appendChild(row);
    return;
  }

  clients.forEach((client) => {
    const row = document.createElement("tr");
    row.className = client.id === state.activeId ? "active-row" : "";
    row.innerHTML = `
      <td><strong>${escapeHtml(client.name)}</strong><br><span class="muted">${escapeHtml(client.mediaBuyer || "Таня")}</span></td>
      <td>${escapeHtml(client.status || "")}</td>
      <td>${escapeHtml(getTemplateName(client.niche))}</td>
      <td>${escapeHtml(client.service || "Не заполнено")}</td>
      <td>${escapeHtml(languageLabel(client.language))}</td>
      <td>${escapeHtml(formatDate(client.updatedAt))}</td>
    `;
    row.addEventListener("click", () => {
      const active = getActiveClient();
      if (active) readForm(active);
      state.activeId = client.id;
      fillForm(client);
      persistOnly();
      renderAll();
      showPage("client");
    });
    elements.clientTableBody.appendChild(row);
  });
}

function hasReserve(client) {
  return Boolean((client.creativeReserve || []).length);
}

function languageLabel(value) {
  const labels = {
    ru: "Русский",
    he: "Иврит",
    ru_he: "Русский и иврит"
  };
  return labels[value] || "Русский";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function renderFiles(client) {
  elements.fileList.innerHTML = "";
  client.files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-card";
    item.innerHTML = `<strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.kind)} · ${formatBytes(file.size)}</span>`;
    elements.fileList.appendChild(item);
  });
}

function renderReserve(client) {
  elements.reserveList.innerHTML = "";
  const reserve = client.creativeReserve || [];
  if (!reserve.length) {
    const empty = document.createElement("div");
    empty.className = "reserve-card";
    empty.innerHTML = "<strong>Запас пуст</strong><span>Сгенерируй пакет и нажми “Сохранить в запас”.</span>";
    elements.reserveList.appendChild(empty);
    return;
  }

  reserve.forEach((item) => {
    const card = document.createElement("button");
    card.className = "reserve-card";
    card.type = "button";
    card.innerHTML = `<strong>${escapeHtml(item.service || "Пакет креативов")}</strong><span>${escapeHtml(item.createdAt)} · ${escapeHtml(item.variantCount)} вариантов</span>`;
    card.addEventListener("click", () => {
      const active = getActiveClient();
      if (!active) return;
      active.finalOutput = item.text;
      fillForm(active);
      persistOnly();
      renderAll();
    });
    elements.reserveList.appendChild(card);
  });
}

function renderLogs(client) {
  elements.logList.innerHTML = "";
  const logs = client.logs || [];
  if (!logs.length) {
    const empty = document.createElement("div");
    empty.className = "log-item";
    empty.innerHTML = "<strong>Записей пока нет</strong><span>Добавляй смену бюджета, географии, статуса, креатива и запусков.</span>";
    elements.logList.appendChild(empty);
    return;
  }

  logs.forEach((log) => {
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<strong>${escapeHtml(log.type)} · ${escapeHtml(log.date)}</strong><span>${escapeHtml(log.note)}</span>`;
    elements.logList.appendChild(item);
  });
}

function renderProcess(process) {
  elements.processList.innerHTML = "";
  const fallback = [
    ["Интернет-проверка", "Перед финальным текстом система обязана собрать язык ниши."],
    ["Выбор шаблона", "Шаблон выбирается по нише, но наши правила важнее шаблона."],
    ["Фильтр фраз", "Каждая строка проверяется на корявость и живую речь."],
    ["Финал", "Показывается только текст после стоп-кранов."]
  ];

  (process.length ? process : fallback.map(([title, body]) => ({ title, body, warning: title === "Интернет-проверка" }))).forEach((step) => {
    const item = document.createElement("div");
    item.className = `step ${step.warning ? "warning" : ""}`;
    item.innerHTML = `<strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.body)}</p>`;
    elements.processList.appendChild(item);
  });
}

function getTemplateName(niche) {
  const names = {
    beauty_body: "Тело / косметология",
    bodywork_pain: "Остеопат / боли",
    repair: "Конкретный ремонт",
    moving: "Стрессовая услуга",
    custom: "Ручной шаблон"
  };
  return names[niche] || names.custom;
}

function crookedPhrasePass(text, client) {
  const replacements = [
    [/с помощью остеопатии/gi, "на остеопатическом приеме"],
    [/убира(ю|ет|ем) жир/gi, "работаю с локальными отложениями"],
    [/сжига(ю|ет|ем) жир/gi, "помогаю уменьшить объем в конкретной зоне"],
    [/силуэт мечты/gi, "более ровный контур тела"],
    [/я работаю с остеопатия/gi, "я остеопат"],
    [/работаю с Остеопатия/g, "я остеопат"],
    [/с Остеопатия/g, "как остеопат"],
    [/индивидуальный подход/gi, "смотрю конкретную задачу перед тем, как предлагать следующий шаг"],
    [/качественн(ая|ые|ый) услуг(а|и|у)/gi, "понятная работа с конкретной задачей"],
    [/комплексное решение/gi, "несколько шагов под одну задачу"],
    [/в разы лучше/gi, "заметно легче"],
    [/навсегда/gi, "надолго, если причина подходит для такой работы"],
    [/гарантированно/gi, "по состоянию и после осмотра"]
  ];

  let cleaned = text;
  const changes = [];
  replacements.forEach(([pattern, replacement]) => {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, replacement);
      changes.push(replacement);
    }
  });

  cleaned = cleaned
    .replace(/\s*\(\[[^\]]{1,100}\]\(https?:\/\/[^)]+\)\)/gi, "")
    .replace(/\[([^\]]{1,100})\]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/\s*—\s*/g, ", ");

  if (client.niche === "beauty_body") {
    cleaned = cleaned.replace(/похудеть за один сеанс/gi, "получить чудо за один сеанс");
  }
  if (client.niche === "bodywork_pain" || /остеопат|мануаль/i.test(clientTextContext(client))) {
    cleaned = cleaned
      .replace(/оцениваю состояние кожи и подбираю режим процедуры/gi, "смотрю движение, нагрузку и то, где появляется боль")
      .replace(/выглядеть ровнее, подтянутее и легче в конкретной зоне/gi, "двигаться легче в обычной жизни")
      .replace(/какая зона вас беспокоит/gi, "где и как болит")
      .replace(/подходит ли вам эта процедура/gi, "есть ли смысл прийти на прием");
  }

  return {
    text: cleaned,
    summary: changes.length
      ? `Заменены кривые или рискованные фразы: ${changes.join(", ")}. Убраны длинные тире.`
      : "Кривые шаблонные фразы не найдены. Длинные тире проверены."
  };
}

function stopCranePass(text, client) {
  const warnings = [];
  if (/[?]\s*$/.test(text.split("\n").find(Boolean) || "")) warnings.push("первый экран начинается вопросом");
  if (/избав(лю|ит|им)|вылеч(у|ит|им)|гарант/gi.test(text)) warnings.push("слишком сильное обещание");
  if (/спина.*колен.*шея|акне.*морщин.*пигмент/gi.test(text)) warnings.push("слишком много проблем в одном тексте");
  if (/утренн(ие|яя)\s+ступеньк|спуск.*злит|колено.*злит|вечерн(ий|ем)\s+круг|тянет\s+под\s+надколенник|набережн/i.test(text)) warnings.push("литературщина вместо нормальной речи клиента");
  if (/индивидуальный подход|комплексное решение|качество жизни|путь к здоровью|почувствовать легкость|получите консультацию/gi.test(text)) warnings.push("пластмассовые рекламные фразы");
  if (/с помощью остеопатии|работаю с Остеопатия|зона вас беспокоит|подбираю режим процедуры/gi.test(text)) warnings.push("корявые фразы");
  if (!text.toLowerCase().includes((client.service || "").split(" ")[0].toLowerCase())) warnings.push("услуга может быть недостаточно ясно названа");

  return {
    ok: warnings.length === 0,
    summary: warnings.length ? `Найдено и учтено: ${warnings.join(", ")}.` : "Стоп-краны пройдены: одна идея, понятная услуга, без жестких обещаний."
  };
}

function setGenerationBusy(isBusy, label = "") {
  generationBusy = isBusy;
  const generateButton = $("generateButton");
  const rewriteButton = $("rewriteTextButton");
  const manualCheckButton = $("manualCheckButton");
  if (generateButton) {
    generateButton.disabled = isBusy;
    generateButton.textContent = isBusy ? "Генерирую..." : "Сгенерировать текст";
    generateButton.classList.toggle("is-loading", isBusy);
  }
  if (rewriteButton) rewriteButton.disabled = isBusy;
  if (manualCheckButton) manualCheckButton.disabled = isBusy;
  if (elements.generationStatus) {
    elements.generationStatus.textContent = label;
    elements.generationStatus.classList.toggle("active", Boolean(label));
  }
}

async function generate() {
  if (generationBusy) return;
  const client = getActiveClient();
  if (!client) return;
  readForm(client);

  setGenerationBusy(true, "Генерация запущена. Проверяю интернет, язык ниши и наши стоп-краны...");
  client.process = [
    {
      title: "Генерация идет",
      body: "Кнопка сработала. Сейчас сервер проверяет язык ниши через интернет, выбирает угол и прогоняет текст через фильтры.",
      warning: false
    }
  ];
  client.finalOutput = "Генерирую текст...\n\nЭто может занять до минуты: система проверяет интернет, пишет варианты и прогоняет стоп-краны.";
  fillForm(client);
  persistOnly();
  renderAll();

  try {
    const data = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        client,
        variantCount: Number(elements.variantCount.value || 5),
        format: elements.adFormat.value,
        angleMode: elements.angleMode.value
      })
    });
    setGenerationBusy(false, "Готово. Текст сгенерирован и прошел фильтры.");
    client.finalOutput = hardStopCraneRewrite(data.text || "", client).text;
    client.process = [
      {
        title: "Интернет-проверка",
        body: "Серверная AI-генерация прошла с web search. Модель должна была взять язык ниши из актуальных источников."
      },
      {
        title: "Фильтр корявых фраз",
        body: "После генерации текст дополнительно прошел локальный фильтр кривых фраз и стоп-слов."
      },
      {
        title: "Стоп-краны",
        body: "Проверены жесткие обещания, лечение, гарантии, смешение нескольких проблем и рискованные формулировки."
      },
      {
        title: "Финал",
        body: "Это уже не локальный шаблон, а серверная генерация. Все равно таргетолог должен прочитать и одобрить."
      }
    ];
    fillForm(client);
    persistOnly();
    renderAll();
    setTimeout(() => setGenerationBusy(false, ""), 2500);
    return;
  } catch (error) {
    setGenerationBusy(false, "");
    if (/Недостаточно брифа|Недостаточно данных/i.test(error.message)) {
      client.finalOutput = error.message;
      client.process = [
        {
          title: "Стоп-кран",
          body: "Генерация остановлена до OpenAI. Пустая карточка не должна превращаться в выдуманный рекламный текст.",
          warning: true
        },
        {
          title: "Что заполнить",
          body: "Заполните основные поля: услуга, проблемы, процедуры/услуги, география или цены. Примечания можно оставить пустыми."
        },
        {
          title: "Наши правила",
          body: "Без конкретной услуги и проблемы нельзя выбрать нормальный угол, проверить язык ниши и пройти фильтр корявых фраз."
        }
      ];
      fillForm(client);
      persistOnly();
      renderAll();
      return;
    }
    if (/Нужно войти/i.test(error.message)) {
      localStorage.removeItem(SESSION_KEY);
      elements.loginScreen.classList.remove("hidden");
      client.finalOutput = "Нужно заново войти в аккаунт. После входа нажмите “Сгенерировать текст” еще раз.";
      client.process = [
        {
          title: "Нужно войти",
          body: "Серверная сессия закончилась после деплоя. Локальная память браузера больше не считается настоящим входом.",
          warning: true
        }
      ];
      fillForm(client);
      persistOnly();
      renderAll();
      return;
    }
    if (/не прошел фильтр качества/i.test(error.message)) {
      client.finalOutput = error.message;
      client.process = [
        {
          title: "Стоп-кран качества",
          body: "Сервер не выпустил текст как финальный, потому что он нарушил наши правила.",
          warning: true
        },
        {
          title: "Что делать",
          body: "Нажмите генерацию еще раз или уточните одну конкретную проблему, услугу, географию, цену и ограничения."
        },
        {
          title: "Правило",
          body: "Лучше остановить плохой текст, чем показать таргетологу дурацкую рекламу как готовую."
        }
      ];
      fillForm(client);
      persistOnly();
      renderAll();
      return;
    }
    if (/слишком долго отвечает/i.test(error.message)) {
      client.finalOutput = error.message;
      client.process = [
        {
          title: "Таймаут AI",
          body: "Сервер остановил генерацию, чтобы кнопка не висела бесконечно.",
          warning: true
        },
        {
          title: "Что сделать",
          body: "Нажмите генерацию еще раз или выберите меньше вариантов. Web search иногда отвечает медленно."
        }
      ];
      fillForm(client);
      persistOnly();
      renderAll();
      return;
    }
    client.finalOutput = `AI-генерация не завершилась.\n\nПричина: ${error.message}\n\nЕсли это повторяется, проверьте данные клиента и попробуйте еще раз.`;
    client.process = [
      {
        title: "Стоп",
        body: "Сервер не вернул готовый рекламный текст.",
        warning: true
      },
      {
        title: "Что проверить",
        body: "Услуга, проблемы, процедуры/услуги, география, цены и ограничения должны быть заполнены без каши из разных ниш."
      }
    ];
    fillForm(client);
    persistOnly();
    renderAll();
    return;
  }

}

async function rewriteTextWithInstruction() {
  if (generationBusy) return;
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  const instruction = elements.editInstruction.value.trim();
  const currentText = client.finalOutput.trim();

  if (!currentText) {
    client.process = [
      { title: "Нечего редактировать", body: "Сначала нужно сгенерировать текст. После этого можно написать, что именно исправить.", warning: true }
    ];
    persistOnly();
    renderAll();
    return;
  }

  if (!instruction) {
    client.process = [
      { title: "Нужен комментарий", body: "Напишите, что не устраивает: слабый хук, много воды, не тот угол, слишком мягко, слишком медицински, мало конкретики.", warning: true }
    ];
    persistOnly();
    renderAll();
    return;
  }

  setGenerationBusy(true, "Переделываю текст по комментарию. Читаю текущий вариант и правлю по вашим словам...");
  client.process = [
    { title: "Редактирование", body: "Читаю текущий текст, комментарий таргетолога, данные по услуге и наши правила. Переписываю не с нуля, а по указанной правке." }
  ];
  fillForm(client);
  persistOnly();
  renderAll();

  try {
    const data = await api("/api/rewrite", {
      method: "POST",
      body: JSON.stringify({
        client,
        currentText,
        instruction,
        format: elements.adFormat.value
      })
    });
    setGenerationBusy(false, "Готово. Текст переделан по комментарию.");
    client.finalOutput = hardStopCraneRewrite(data.text || "", client).text;
    client.process = [
      { title: "Комментарий учтен", body: `Правка: ${instruction}` },
      { title: "Текущий текст прочитан", body: "Система редактировала существующий текст, а не запускала случайную новую генерацию." },
      { title: "Фильтры", body: "После переписывания прошли стоп-краны, фильтр корявых фраз и проверка на общую рекламную кашу." },
      { title: "Финал", body: "Исправленная версия заменяет текст в поле. Старую можно было заранее сохранить в запас." }
    ];
    elements.editInstruction.value = "";
    fillForm(client);
    persistOnly();
    renderAll();
    setTimeout(() => setGenerationBusy(false, ""), 2500);
  } catch (error) {
    setGenerationBusy(false, "");
    client.process = [
      { title: "Не получилось переделать", body: error.message || "Сервер не вернул исправленную версию.", warning: true },
      { title: "Что сделать", body: "Проверьте, что текст уже есть, комментарий заполнен, и попробуйте еще раз." }
    ];
    fillForm(client);
    persistOnly();
    renderAll();
  }
}

function manualCheck() {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  const source = client.finalOutput;
  if (!source.trim()) {
    client.process = [
      { title: "Нечего проверять", body: "Сначала сгенерируйте или вставьте текст. Ручной прогон не должен сам создавать текст по старому локальному шаблону.", warning: true }
    ];
    persistOnly();
    renderAll();
    return;
  }
  const phrasePass = crookedPhrasePass(source, client);
  const rewritePass = hardStopCraneRewrite(phrasePass.text, client);
  const stopPass = stopCranePass(rewritePass.text, client);
  client.finalOutput = rewritePass.text;
  client.process = [
    { title: "Ручной прогон", body: "Запущена отдельная проверка без смены карточки клиента." },
    { title: "Фильтр корявых фраз", body: `${phrasePass.summary} ${rewritePass.summary}` },
    { title: "Стоп-краны", body: stopPass.summary },
    { title: "Итог", body: rewritePass.changed ? "Текст реально переписан и сохранен." : "Критичных стоп-фраз не найдено. Текст сохранен." }
  ];
  fillForm(client);
  persistOnly();
  renderAll();
}

function hardStopCraneRewrite(text, client) {
  let cleaned = String(text || "");
  const before = cleaned;
  const replacements = [
    [/леч(у|им|ит|ить|ение)\b/gi, "работаю с состоянием"],
    [/вылеч(у|им|ит|ить)\b/gi, "разобрать возможную причину"],
    [/избав(лю|им|ит|иться|ление)\b/gi, "помочь снизить влияние проблемы"],
    [/гарантир(ую|уем|ует|ованно|ованный)/gi, "по состоянию после оценки"],
    [/убира(ю|ем|ет)\s+жир/gi, "работаю с локальными отложениями"],
    [/жир\s+уйдет/gi, "объем в зоне может уменьшиться"],
    [/чудо\s+за\s+один\s+сеанс/gi, "быстрые обещания без оценки"],
    [/с помощью остеопатии/gi, "на остеопатическом приеме"],
    [/Я работаю с Остеопатия/g, "Я остеопат"],
    [/работаю с Остеопатия/g, "я остеопат"],
    [/утренн(ие|яя)\s+ступеньк[а-я]*/gi, "лестница утром"],
    [/спуск\s+по\s+лестнице\s+уже\s+злится/gi, "тяжело спускаться по лестнице"],
    [/спуск\s+злится/gi, "тяжело спускаться"],
    [/колено\s+злится/gi, "колено болит"],
    [/вечерн(ий|ем)\s+круг/gi, "вечерняя прогулка"],
    [/тянет\s+под\s+надколенником/gi, "болит в области колена"],
    [/почувствовать легкость/gi, "двигаться спокойнее"],
    [/получите консультацию/gi, "напишите в WhatsApp"],
    [/путь к здоровью/gi, "следующий шаг"]
  ];

  replacements.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });

  if (client.niche === "bodywork_pain") {
    cleaned = cleaned
      .replace(/процедур[а-я]*/gi, "прием")
      .replace(/зона вас беспокоит/gi, "где и как болит")
      .replace(/состояние кожи/gi, "движение и нагрузку")
      .replace(/подбираю режим/gi, "смотрю, откуда может идти нагрузка");
  }

  cleaned = cleaned
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:]){2,}/g, "$1")
    .replace(/[ \t]{2,}/g, " ");

  return {
    text: cleaned,
    changed: cleaned !== before,
    summary: cleaned !== before
      ? "Жесткие обещания и медицински рискованные слова заменены."
      : "Жестких обещаний и запрещенных слов не найдено."
  };
}

async function handleFiles(files) {
  const client = getActiveClient();
  if (!client) return;

  for (const file of files) {
    const record = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      kind: file.type || file.name.split(".").pop() || "file",
      text: "",
      addedAt: new Date().toISOString()
    };

    if (isTextReadable(file)) {
      record.text = await file.text();
    }
    client.files.push(record);
  }

  fillForm(client);
  persistOnly();
  renderAll();
}

function isTextReadable(file) {
  return (
    file.type.startsWith("text/") ||
    /\.(txt|md|csv|json|html)$/i.test(file.name)
  );
}

function persistOnly() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api("/api/state", {
      method: "POST",
      body: JSON.stringify(state)
    }).catch(() => {});
  }, 250);
}

function exportData() {
  save();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ad-client-studio-export.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function copyOutput() {
  navigator.clipboard.writeText(elements.finalOutput.value);
}

function saveToReserve() {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  if (!client.finalOutput.trim()) return;
  client.creativeReserve ||= [];
  client.creativeReserve.unshift({
    id: crypto.randomUUID(),
    service: client.service || "Пакет креативов",
    text: client.finalOutput,
    variantCount: (client.finalOutput.match(/Вариант \d+/g) || []).length || 1,
    createdAt: new Date().toLocaleString("ru-RU")
  });
  client.process = [
    { title: "Запас", body: "Текущий пакет сохранен в запас креативов клиента." },
    { title: "Правило", body: "При просадке рекламы сначала берем готовый запас. Новые тексты делаем под новую услугу или когда запас закончился." }
  ];
  addSystemLog(client, "Креатив", `Пакет сохранен в запас: ${client.service || "без названия услуги"}`);
  persistOnly();
  renderAll();
}

function startNewService() {
  const client = getActiveClient();
  if (!client) return;
  const shouldStart = confirm("Клиент хочет запустить другую услугу? Текущая услуга, проблемы, процедуры, цены и тексты очистятся, сам клиент останется.");
  if (!shouldStart) return;
  readForm(client);
  client.service = "";
  client.problem = "";
  client.problems = "";
  client.procedures = "";
  client.price = "";
  client.notes = "";
  client.brief = "";
  client.finalOutput = "";
  client.approvedText = "";
  client.productionStatus = "Новая услуга: нужны данные";
  client.status = "Бриф";
  client.process = [
    { title: "Новая услуга", body: "Очищены услуга, проблемы, процедуры, цены, примечания и финальный текст. Клиент, таргетолог, ниша, язык, география, файлы и дневник сохранены." }
  ];
  addSystemLog(client, "Новая услуга", "Начаты новые данные по услуге");
  fillForm(client);
  persistOnly();
  renderAll();
  showPage("client");
  elements.clientService.focus();
}

function approveText() {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  if (!client.finalOutput.trim()) return;
  client.approvedText = client.finalOutput;
  client.productionStatus = "Текст одобрен";
  client.status = "Крео";
  client.process = [
    { title: "Одобрено", body: "Таргетолог одобрил текст. Теперь можно делать статику, монтаж и сохранять пакет в запас." },
    { title: "Следующий шаг", body: "Загрузить материалы по процедуре: фото, видео, отзывы, скрины, логотип, визуальные референсы." }
  ];
  addSystemLog(client, "Креатив", "Текст одобрен таргетологом");
  fillForm(client);
  persistOnly();
  renderAll();
}

function createProductionTask(kind) {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  if (!client.approvedText && client.finalOutput) {
    client.approvedText = client.finalOutput;
  }
  const title = kind === "static" ? "Статика" : "Монтаж";
  client.productionStatus = `${title}: задача создана`;
  client.status = "Крео";
  client.process = [
    { title, body: `Создана задача: ${kind === "static" ? "сделать статичные креативы по одобренному тексту" : "сделать видео/монтаж по одобренному тексту"}.` },
    { title: "Материалы", body: "Нужны материалы по процедуре: фото/видео процесса, результат, специалист, кабинет, отзывы, брендовые элементы." },
    { title: "Запас", body: "Готовые креативы должны попадать в запас клиента, чтобы при просадке брать их оттуда." }
  ];
  addSystemLog(client, title, `${title}: задача создана`);
  fillForm(client);
  persistOnly();
  renderAll();
}

function addLogEntry() {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  const note = elements.logNote.value.trim();
  if (!note) return;
  addSystemLog(client, elements.logType.value, note);
  elements.logNote.value = "";
  persistOnly();
  renderAll();
}

function addSystemLog(client, type, note) {
  client.logs ||= [];
  client.logs.unshift({
    id: crypto.randomUUID(),
    type,
    note,
    date: new Date().toLocaleString("ru-RU")
  });
}

function addClient() {
  const shouldCreate = confirm("Вы хотите создать нового клиента?");
  if (!shouldCreate) return;
  const active = getActiveClient();
  if (active) readForm(active);
  const client = defaultClient();
  if (elements.mediaBuyerSelect.value !== "Арик") {
    client.mediaBuyer = elements.mediaBuyerSelect.value;
  }
  state.clients.unshift(client);
  state.activeId = client.id;
  fillForm(client);
  persistOnly();
  renderAll();
  showPage("client");
}

function deleteActiveClient() {
  const client = getActiveClient();
  if (!client) return;
  const name = client.name || "этого клиента";
  const shouldDelete = confirm(`Удалить клиента “${name}”? Это действие нельзя отменить.`);
  if (!shouldDelete) return;

  state.clients = state.clients.filter((item) => item.id !== client.id);
  state.activeId = state.clients[0]?.id || null;

  fillForm(getActiveClient());
  persistOnly();
  renderAll();
  showPage("dashboard");
}

function showPage(page) {
  const isDashboard = page === "dashboard";
  document.body.dataset.page = isDashboard ? "clients" : "client";
  elements.dashboardPage.classList.toggle("active-page", isDashboard);
  elements.clientPage.classList.toggle("active-page", !isDashboard);
  elements.dashboardPageButton.classList.toggle("active", isDashboard);
  updateTopbar();
}

function updateTopbar() {
  const isDashboard = document.body.dataset.page === "clients";
  const active = getActiveClient();
  elements.pageEyebrow.textContent = isDashboard ? "Клиенты" : "Карточка клиента";
  elements.clientTitle.textContent = isDashboard ? "Все клиенты" : active?.name || "Новый клиент";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

$("newClientButton").addEventListener("click", addClient);
$("loginForm").addEventListener("submit", handleLogin);
$("logoutButton").addEventListener("click", logout);
$("dashboardPageButton").addEventListener("click", () => showPage("dashboard"));
$("saveButton").addEventListener("click", save);
$("deleteClientButton").addEventListener("click", deleteActiveClient);
$("generateButton").addEventListener("click", generate);
$("manualCheckButton").addEventListener("click", manualCheck);
$("rewriteTextButton").addEventListener("click", rewriteTextWithInstruction);
$("saveReserveButton").addEventListener("click", saveToReserve);
$("newServiceButton").addEventListener("click", startNewService);
$("approveTextButton").addEventListener("click", approveText);
$("createStaticButton").addEventListener("click", () => createProductionTask("static"));
$("createVideoButton").addEventListener("click", () => createProductionTask("video"));
$("addLogButton").addEventListener("click", addLogEntry);
$("copyButton").addEventListener("click", copyOutput);
elements.fileInput.addEventListener("change", (event) => handleFiles([...event.target.files]));
elements.clientSearch.addEventListener("input", renderClientList);
elements.mediaBuyerSelect.addEventListener("change", renderClientList);
elements.clientName.addEventListener("input", () => {
  if (document.body.dataset.page !== "clients") {
    elements.clientTitle.textContent = elements.clientName.value || "Новый клиент";
  }
});
elements.clientStatus.addEventListener("change", () => {
  elements.clientStatusPill.textContent = elements.clientStatus.value;
});
elements.clientNiche.addEventListener("change", () => {
  elements.templateBadge.textContent = getTemplateName(elements.clientNiche.value);
});

loadSession();
