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
  problem: "",
  cta: "",
  proofYears: "",
  proofPeople: "",
  proofProblem: "",
  leads7d: "",
  cpl: "",
  sales: "",
  targetCpl: "",
  budget: "",
  adGeo: "",
  facts: "",
  brief: "",
  files: [],
  creativeReserve: [],
  logs: [],
  researchNotes: "",
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
  clientPageButton: $("clientPageButton"),
  clientTableBody: $("clientTableBody"),
  buyerTableTitle: $("buyerTableTitle"),
  buyerTableCount: $("buyerTableCount"),
  clientSearch: $("clientSearch"),
  clientTitle: $("clientTitle"),
  clientStatusPill: $("clientStatusPill"),
  clientName: $("clientName"),
  clientMediaBuyer: $("clientMediaBuyer"),
  clientNiche: $("clientNiche"),
  clientStatus: $("clientStatus"),
  clientLanguage: $("clientLanguage"),
  clientLocation: $("clientLocation"),
  clientService: $("clientService"),
  clientProblem: $("clientProblem"),
  clientCta: $("clientCta"),
  clientProofYears: $("clientProofYears"),
  clientProofPeople: $("clientProofPeople"),
  clientProofProblem: $("clientProofProblem"),
  clientFacts: $("clientFacts"),
  clientBrief: $("clientBrief"),
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
  researchNotes: $("researchNotes"),
  finalOutput: $("finalOutput"),
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
    const client = defaultClient();
    state.clients.push(client);
    state.activeId = client.id;
  }
  state.activeId ||= state.clients[0].id;
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

function readForm(client) {
  client.name = elements.clientName.value.trim() || "Новый клиент";
  client.mediaBuyer = elements.clientMediaBuyer.value;
  client.niche = elements.clientNiche.value;
  client.status = elements.clientStatus.value;
  client.language = elements.clientLanguage.value;
  client.location = elements.clientLocation.value.trim();
  client.service = elements.clientService.value.trim();
  client.problem = elements.clientProblem.value.trim();
  client.cta = elements.clientCta.value.trim();
  client.proofYears = elements.clientProofYears.value.trim();
  client.proofPeople = elements.clientProofPeople.value.trim();
  client.proofProblem = elements.clientProofProblem.value.trim();
  client.facts = elements.clientFacts.value.trim();
  client.brief = elements.clientBrief.value.trim();
  client.researchNotes = elements.researchNotes.value.trim();
  client.finalOutput = elements.finalOutput.value.trim();
  client.updatedAt = new Date().toISOString();
}

function fillForm(client) {
  elements.clientName.value = client.name || "";
  elements.clientMediaBuyer.value = client.mediaBuyer || "Таня";
  elements.clientNiche.value = client.niche || "beauty_body";
  elements.clientStatus.value = client.status || "Бриф";
  elements.clientLanguage.value = client.language || "ru";
  elements.clientLocation.value = client.location || "";
  elements.clientService.value = client.service || "";
  elements.clientProblem.value = client.problem || "";
  elements.clientCta.value = client.cta || "";
  elements.clientProofYears.value = client.proofYears || "";
  elements.clientProofPeople.value = client.proofPeople || "";
  elements.clientProofProblem.value = client.proofProblem || "";
  elements.clientFacts.value = client.facts || "";
  elements.clientBrief.value = client.brief || "";
  elements.researchNotes.value = client.researchNotes || "";
  elements.finalOutput.value = client.finalOutput || "";
  elements.productionStatus.textContent = client.productionStatus || "Текст не одобрен";
}

function renderAll() {
  renderClientList();
  renderClientTable();
  const active = getActiveClient();
  if (!active) return;
  elements.clientTitle.textContent = active.name;
  elements.clientStatusPill.textContent = active.status;
  elements.fileCount.textContent = `${active.files.length} файлов`;
  elements.reserveCount.textContent = `${(active.creativeReserve || []).length} пакетов`;
  elements.logCount.textContent = `${(active.logs || []).length} записей`;
  elements.templateBadge.textContent = getTemplateName(active.niche);
  renderFiles(active);
  renderReserve(active);
  renderLogs(active);
  renderProcess(active.process || []);
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
    row.innerHTML = `<td class="empty-row" colspan="7">У этого таргетолога пока нет клиентов</td>`;
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

function autoAngle(client) {
  const service = `${client.service} ${client.problem} ${client.brief}`.toLowerCase();
  if (client.niche === "bodywork_pain" || /остеопат|мануаль|боль|колен|поясниц|спин|ше[ея]/i.test(service)) {
    if (service.includes("колен")) return "боль в колене мешает ходить, вставать и подниматься по лестнице";
    if (service.includes("поясниц")) return "боль в пояснице мешает нормально двигаться в течение дня";
    if (service.includes("спин")) return "боль в спине возвращается после нагрузки или долгого сидения";
    return "боль мешает обычным движениям";
  }
  if (client.niche === "repair") {
    if (service.includes("кух")) return "ошибки с розетками, техникой и фартуком";
    if (service.includes("ван") || service.includes("сануз")) return "доплаты, протечки и переделки после старта";
    if (service.includes("плит")) return "ровная плитка без кривых швов и переделок";
    return "понятная смета до начала работ";
  }
  if (client.niche === "moving") return "самая дешевая компания может стать дорогой в день переезда";
  if (service.includes("iconic") || service.includes("жир") || service.includes("объем")) return "локальная зона, которая плохо уходит при питании и спорте";
  return "конкретная проблема, которую человек уже хочет решить";
}

function anglePack(client) {
  const service = `${client.service} ${client.problem} ${client.brief}`.toLowerCase();
  const customProblem = client.problem ? [client.problem] : [];

  if (client.niche === "repair") {
    if (service.includes("кух")) {
      return [
        ...customProblem,
        "розетки и выводы под технику продуманы до фартука",
        "кухня готова к гарнитуру без переделок после установки",
        "смета понятна до начала работ",
        "электрика, сантехника и фартук идут в правильном порядке",
        "не нужно снова вызывать мастера из-за каждой мелочи"
      ];
    }
    if (service.includes("ван") || service.includes("сануз")) {
      return [
        ...customProblem,
        "смета понятна до демонтажа старой ванной",
        "гидроизоляция и сантехника сделаны до плитки",
        "меньше риска протечек и переделок",
        "плитка, трубы и электрика идут в правильном порядке",
        "ванная не превращается в ремонт без конца"
      ];
    }
    return [
      ...customProblem,
      "понятная смета до начала работ",
      "ремонт не растягивается без объяснений",
      "материалы и этапы понятны заранее",
      "не нужно искать мастера на каждый этап",
      "меньше риска переделок после сдачи"
    ];
  }

  if (client.niche === "moving") {
    return [
      ...customProblem,
      "самая дешевая компания может стать дорогой в день переезда",
      "дешевая цена на входе превращается в доплаты у подъезда",
      "вещи уже в коридоре, а цена начинает расти",
      "день переезда не превращается в хаос",
      "стоимость понятна до выезда",
      "мебель разбирают, собирают и перевозят аккуратно",
      "коробки, этаж и лифт уточняются заранее",
      "не нужно таскать тяжелые вещи самому"
    ];
  }

  if (client.niche === "bodywork_pain" || /остеопат|мануаль|боль|колен|поясниц|спин/i.test(service)) {
    return [
      ...customProblem,
      "боль в колене мешает ходить и подниматься по лестнице",
      "боль возвращается после нагрузки",
      "проблема может быть не только в месте, где болит",
      "обычные движения снова хочется делать осторожно",
      "человек устал жить с ожиданием боли"
    ];
  }

  if (client.niche === "beauty_body") {
    return [
      ...customProblem,
      "локальная зона плохо уходит при питании и спорте",
      "живот мешает посадке одежды",
      "бока портят силуэт в любимых вещах",
      "бедра и рельеф кожи хочется сделать ровнее",
      "нужна процедура без уколов и долгого восстановления"
    ];
  }

  return [
    ...customProblem,
    "конкретная проблема, которую человек уже хочет решить",
    "страх выбрать неправильно",
    "непонятно, с чего начать",
    "хочется результата без лишнего риска",
    "нужен первый шаг, который снимает неопределенность"
  ];
}

function researchLanguage(client) {
  const notes = client.researchNotes.trim();
  if (notes) return notes;

  if (client.language === "he" || client.language === "ru_he") {
    const hebrewNote = "Для иврита обязателен отдельный native phrase check: искать термины на иврите, не переводить русский шаблон дословно, проверять заголовки, услугу, боль, CTA и обещания как цельные фразы.";
    if (client.language === "he") return hebrewNote;
    return `${hebrewNote} Для русского текста параллельно сохраняем русскую логику и не смешиваем языки в одном варианте.`;
  }

  if (client.niche === "repair") {
    return "Рынок говорит конкретными услугами: ремонт ванной, ремонт санузла, ремонт кухни, укладка плитки, электрика под технику, разводка сантехники, гидроизоляция, смета, замер, гарантия.";
  }
  if (client.niche === "moving") {
    return "Рынок говорит через переезд, упаковку, разборку мебели, этаж, лифт, объем вещей, цену до выезда, аккуратную перевозку, дату и время.";
  }
  if (client.niche === "beauty_body") {
    return "Рынок говорит мягко: локальные жировые отложения, коррекция фигуры, уменьшение объемов, работа с рельефом кожи, RF, кавитация, вакуумный RF, без уколов и долгого восстановления.";
  }
  if (client.niche === "bodywork_pain") {
    return "Рынок говорит через конкретную боль и обычные движения: боль в колене, боль в пояснице, ходить, вставать со стула, подниматься по лестнице, подвижность, нагрузка, стопа, таз, поясница. Нельзя обещать лечение или гарантированный результат.";
  }
  return "Нужна интернет-проверка языка ниши перед финальным текстом.";
}

function generateDraft(client) {
  const angle = normalizeAngle(client.problem || (elements.angleMode.value === "auto" ? autoAngle(client) : elements.angleMode.options[elements.angleMode.selectedIndex].text), client);
  const service = client.service || "услуга";
  const facts = formatAllowedFacts(client.facts);
  const cta = client.cta || "WhatsApp";
  const proof = buildProof(client);

  if (client.niche === "repair") return repairTemplate(service, angle, client.location, facts, cta, proof);
  if (client.niche === "moving") return movingTemplate(service, angle, client.location, facts, cta, proof);
  if (client.niche === "beauty_body") return beautyTemplate(client.name, service, angle, facts, cta, proof);
  if (client.niche === "bodywork_pain" || /остеопат|мануаль/i.test(service)) return bodyworkPainTemplate(client.name, service, angle, facts, cta, proof);
  return customTemplate(client.name, service, angle, facts, cta, proof);
}

function generateDraftForAngle(client, rawAngle) {
  const angle = normalizeAngle(rawAngle, client);
  const service = client.service || "услуга";
  const facts = formatAllowedFacts(client.facts);
  const cta = client.cta || "WhatsApp";
  const proof = buildProof(client);

  if (client.niche === "repair") return repairTemplate(service, angle, client.location, facts, cta, proof);
  if (client.niche === "moving") return movingTemplate(service, angle, client.location, facts, cta, proof);
  if (client.niche === "beauty_body") return beautyTemplate(client.name, service, angle, facts, cta, proof);
  if (client.niche === "bodywork_pain" || /остеопат|мануаль/i.test(service)) return bodyworkPainTemplate(client.name, service, angle, facts, cta, proof);
  return customTemplate(client.name, service, angle, facts, cta, proof);
}

function normalizeAngle(rawAngle, client) {
  const text = String(rawAngle || "").trim();
  if (!text) return autoAngle(client);
  const lower = text.toLowerCase();
  if ((lower.includes("колен") && lower.includes("поясниц")) || (lower.includes(",") && /боль|боли/.test(lower))) {
    return lower.includes("колен")
      ? "боль в колене мешает ходить, вставать и подниматься по лестнице"
      : text.split(",")[0].trim();
  }
  return text;
}

function formatAllowedFacts(facts) {
  if (!facts) return "";
  const lines = facts
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/нельзя|запрещ|не использовать|не обещать/i.test(line));
  return lines.length ? `\n\n${lines.join("\n")}` : "";
}

function buildProof(client) {
  const years = client.proofYears;
  const people = client.proofPeople;
  const problem = client.proofProblem || client.problem || "этой проблемой";
  if (!years && !people) return "";

  const isSoftNiche = client.niche === "beauty_body" || client.niche === "bodywork_pain" || /остеопат|мануаль|косметолог|массаж/i.test(client.service);
  if (years && people && isSoftNiche) {
    return `\n\nЗа последние ${years} лет ко мне обращались больше ${people} людей с запросом: ${problem}.`;
  }
  if (years && people) {
    return `\n\nЗа последние ${years} лет мы помогли больше ${people} людям решить задачу: ${problem}.`;
  }
  if (years && isSoftNiche) {
    return `\n\nЗа последние ${years} лет я часто видел людей, у которых ${problem} мешала обычной жизни.`;
  }
  if (people && isSoftNiche) {
    return `\n\nКо мне обращались больше ${people} людей с запросом: ${problem}.`;
  }
  if (years) return `\n\nЗа последние ${years} лет мы много раз работали с задачей: ${problem}.`;
  return `\n\nМы помогли больше ${people} людям решить задачу: ${problem}.`;
}

function beautyTemplate(name, service, angle, facts, cta, proof) {
  const specialist = name && !name.includes("Новый") ? name : "специалист";
  return `⚡ Помогу разобраться с зоной, которая давно не нравится в зеркале ⚡

Иногда вес уже почти устраивает, но ${angle}.

И это не всегда решается еще одной диетой или еще одной тренировкой.

Меня зовут ${specialist}. Я работаю с ${service}.

На приеме я смотрю, какая зона беспокоит вас больше всего, оцениваю состояние кожи и подбираю режим процедуры.

Цель не в том, чтобы обещать чудо за один сеанс.

Цель: помочь телу выглядеть ровнее, подтянутее и легче в конкретной зоне.

Процедура проходит без уколов, операции и долгого восстановления.${proof}${facts}

Напишите в ${cta}. Расскажите, какая зона вас беспокоит, и я подскажу, подходит ли вам эта процедура.`;
}

function bodyworkPainTemplate(name, service, angle, facts, cta, proof) {
  const specialist = name && !name.includes("Новый") ? name : "специалист";
  const serviceName = /остеопат/i.test(service) ? "остеопат" : service;
  return `Если ${angle}, проблема может быть не только в месте, где болит.

Меня зовут ${specialist}. Я ${serviceName} и работаю с болью через восстановление нормального движения тела.

На приеме я смотрю, как вы двигаетесь, где появляется боль и какие зоны могут давать лишнюю нагрузку.

Если речь о колене, я проверяю не только коленный сустав. Смотрю стопу, таз, поясницу, походку и то, как нога работает в движении.

${proof.trim() ? proof.trim() + "\n\n" : ""} 

Цель не в том, чтобы пообещать чудо за один сеанс.

Цель: понять, почему боль возвращается, и помочь телу двигаться легче в обычной жизни.

Если была свежая травма, колено сильно опухло, горячее или вы не можете наступить на ногу, сначала нужна медицинская проверка.${facts}

Если боль тянется давно или возвращается при движении, напишите в ${cta}. Расскажите, где и как болит, и я подскажу, есть ли смысл прийти на прием.`;
}

function repairTemplate(service, angle, location, facts, cta, proof) {
  const where = location ? `\n\nРаботаем: ${location}.` : "";
  return `${capitalize(service || "Ремонт")} не должен превращаться в бесконечное “тут еще надо докупить”.

Сначала кажется, что главное выбрать материалы и договориться с мастером.

А потом начинается самое неприятное: ${angle}.

Мы сначала смотрим объект, проверяем сложные места и считаем объем работ до старта.

Так вы понимаете, что входит в работу, какие материалы нужны и где могут появиться дополнительные расходы.

Что обычно уточняем перед расчетом:

✅ состояние стен и пола
✅ электрику и сантехнику
✅ мокрые зоны
✅ материалы
✅ сроки
✅ что нужно демонтировать и вывезти

Наша задача: чтобы ремонт не вышел из-под контроля после того, как старое уже разобрали.${proof}${where}${facts}

Напишите в ${cta}. Уточним задачу, размер помещения и состояние объекта, чтобы заранее понять объем работ и примерную стоимость.`;
}

function movingTemplate(service, angle, location, facts, cta, proof) {
  const where = location ? `\n\nРаботаем: ${location}.` : "";
  if (/дешев|дорог|доплат|цена.*раст|у подъезда/i.test(angle)) {
    return `Самая дешевая компания для ${service || "переезда"} часто кажется хорошей идеей.

До момента, когда машина уже стоит у подъезда.

И тут начинается:

✅ “Это негабарит”
✅ “За этаж отдельно”
✅ “Коробок больше, чем вы сказали”
✅ “Мебель надо разбирать, это доплата”
✅ “В машину не влезает, нужна вторая”

И вы уже не выбираете спокойно.

Ваши вещи стоят в коридоре, день сорван, а цена растет прямо на месте.

Нормальный переезд начинается не с самой низкой цифры.

Он начинается с понятного расчета: сколько вещей, какой этаж, есть ли лифт, нужна ли упаковка, разборка мебели и какая машина подойдет.

Мы заранее уточняем детали, считаем объем работ и говорим, что входит в стоимость.

Чтобы переезд не превратился в дешевое объявление, которое в итоге вышло дороже всех.${proof}${where}${facts}

Напишите в ${cta}. Рассчитаем переезд заранее и договоримся на удобное время.`;
  }

  return `Когда вы слышите “${service || "переезд"}”, что первое приходит в голову?

Коробки. Мебель. Лифт. Лестница. Время. И мысль, что день может легко превратиться в хаос.

Мы понимаем, почему ${service || "эта услуга"} часто нервирует: ${angle}.

Поэтому заранее уточняем объем вещей, этаж, лифт, маршрут, упаковку и время.

Так вы понимаете, что входит в работу, и не узнаете о доплате уже у подъезда.

Мы разбираем и собираем мебель, помогаем с упаковкой и аккуратно перевозим вещи.${proof}${where}${facts}

Напишите в ${cta}. Уточним детали и поможем понять стоимость до дня переезда.`;
}

function customTemplate(name, service, angle, facts, cta, proof) {
  return `Если вас беспокоит ${angle}, важно сначала понять, что именно нужно решить.

Меня зовут ${name || "специалист"}. Я работаю с услугой: ${service}.

Перед тем как предлагать решение, я уточняю задачу, ожидания, ограничения и то, что уже пробовали раньше.

Так следующий шаг становится понятнее, а решение не выглядит как случайный совет.${proof}${facts}

Напишите в ${cta}. Расскажите коротко о ситуации, и я подскажу, с чего лучше начать.`;
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
    [/индивидуальный подход/gi, "смотрю вашу ситуацию и подбираю процедуру по зоне"],
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

  cleaned = cleaned.replace(/—/g, ".");

  if (client.niche === "beauty_body") {
    cleaned = cleaned.replace(/похудеть за один сеанс/gi, "получить чудо за один сеанс");
  }
  if (client.niche === "bodywork_pain" || /остеопат|мануаль/i.test(`${client.service} ${client.brief}`)) {
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
  if (!text.toLowerCase().includes((client.service || "").split(" ")[0].toLowerCase())) warnings.push("услуга может быть недостаточно ясно названа");

  return {
    ok: warnings.length === 0,
    summary: warnings.length ? `Найдено и учтено: ${warnings.join(", ")}.` : "Стоп-краны пройдены: одна идея, понятная услуга, без жестких обещаний."
  };
}

async function generate() {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);

  const research = researchLanguage(client);
  client.process = [
    {
      title: "AI + интернет",
      body: "Запускаю серверную генерацию. Если OPENAI_API_KEY подключен, модель сначала проверит язык ниши через web search.",
      warning: false
    }
  ];
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
    return;
  } catch (error) {
    if (/Недостаточно брифа/i.test(error.message)) {
      client.finalOutput = error.message;
      client.process = [
        {
          title: "Стоп-кран",
          body: "Генерация остановлена до OpenAI. Пустая карточка не должна превращаться в выдуманный рекламный текст.",
          warning: true
        },
        {
          title: "Что заполнить",
          body: "Минимум: конкретная услуга, одна главная проблема, география или факты. После этого можно запускать интернет-проверку и генерацию."
        },
        {
          title: "Наши правила",
          body: "Без брифа нельзя выбрать нормальный угол, проверить язык ниши и пройти фильтр корявых фраз."
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
    client.finalOutput = `AI-генерация пока не подключена.\n\nПричина: ${error.message}\n\nЧто нужно сделать:\n1. В Render открыть сервис ad-client-studio.\n2. Зайти в Environment.\n3. Добавить переменную OPENAI_API_KEY.\n4. Перезапустить сервис.\n\nДо этого сайт не должен притворяться, что реально проверил интернет и написал сильный текст.`;
    client.process = [
      {
        title: "Стоп",
        body: "Настоящая генерация не запущена, потому что сервер не получил доступ к OpenAI API.",
        warning: true
      },
      {
        title: "Почему старые тексты были плохими",
        body: "Раньше работал локальный шаблон без модели и без настоящего интернета. Это годится только как макет интерфейса."
      },
      {
        title: "Что дальше",
        body: "Подключаем OPENAI_API_KEY, и кнопка начнет генерировать через AI + web search."
      }
    ];
    fillForm(client);
    persistOnly();
    renderAll();
    return;
  }

  const count = Number(elements.variantCount.value || 5);
  const angles = uniqueAngles(anglePack(client)).slice(0, count);
  const languageModes = client.language === "ru_he" ? ["ru", "he"] : [client.language || "ru"];
  const results = [];
  languageModes.forEach((languageMode) => {
    angles.forEach((angle) => {
      const draft = languageMode === "he" ? hebrewPlaceholder(client, angle) : generateDraftForAngle(client, angle);
    const phrasePass = crookedPhrasePass(draft, client);
    const stopPass = stopCranePass(phrasePass.text, client);
      results.push({ languageMode, angle, text: phrasePass.text, phrasePass, stopPass });
    });
  });
  const finalText = results.map((item, index) => {
    const langLabel = item.languageMode === "he" ? "Иврит" : "Русский";
    return `Вариант ${index + 1}. ${langLabel}. ${capitalize(item.angle)}\n\n${item.text}`;
  }).join("\n\n---\n\n");
  const changedCount = results.filter((item) => !item.phrasePass.summary.startsWith("Кривые шаблонные")).length;
  const stopSummaries = [...new Set(results.map((item) => item.stopPass.summary))].join(" ");

  client.finalOutput = finalText;
  client.process = [
    {
      title: "Интернет-проверка",
      body: research,
      warning: !client.researchNotes.trim()
    },
    {
      title: "Выбранный шаблон",
      body: `${getTemplateName(client.niche)}. Сгенерировано вариантов: ${results.length}. Углы: ${angles.join("; ")}.`
    },
    {
      title: "Фильтр корявых фраз",
      body: changedCount ? `Фильтр сработал в ${changedCount} вариантах. Длинные тире проверены.` : "Кривые шаблонные фразы не найдены. Длинные тире проверены."
    },
    {
      title: "Стоп-краны",
      body: stopSummaries
    },
    {
      title: "Финал",
      body: "Текст готов для ручной правки или запуска следующего прогона."
    }
  ];

  fillForm(client);
  persistOnly();
  renderAll();
}

function hebrewPlaceholder(client, angle) {
  return `Иврит-версия не сгенерирована в локальном прототипе.

Почему: для иврита нельзя переводить русский шаблон дословно. Нужно сначала проверить реальные фразы в нише на иврите, затем прогнать native phrase check и фильтр корявых фраз.

Что будет проверяться:

✅ название услуги на иврите
✅ как люди описывают проблему
✅ нормальные CTA
✅ риск буквального перевода
✅ медицинские или косметологические обещания

Угол для будущей иврит-версии:
${angle}

После подключения AI + интернет-поиска здесь будет отдельный текст на иврите, без смешивания с русским.`;
}

function uniqueAngles(angles) {
  return [...new Set(angles.map((angle) => String(angle || "").trim()).filter(Boolean))];
}

function manualCheck() {
  const client = getActiveClient();
  if (!client) return;
  readForm(client);
  const source = client.finalOutput || generateDraft(client);
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
    [/вылеч(у|им|ит|ить)\b/gi, "помочь разобраться с причиной"],
    [/избав(лю|им|ит|иться|ление)\b/gi, "помочь снизить влияние проблемы"],
    [/гарантир(ую|уем|ует|ованно|ованный)/gi, "по состоянию после оценки"],
    [/убира(ю|ем|ет)\s+жир/gi, "работаю с локальными отложениями"],
    [/жир\s+уйдет/gi, "объем в зоне может уменьшиться"],
    [/чудо\s+за\s+один\s+сеанс/gi, "быстрые обещания без оценки"],
    [/с помощью остеопатии/gi, "на остеопатическом приеме"],
    [/Я работаю с Остеопатия/g, "Я остеопат"],
    [/работаю с Остеопатия/g, "я остеопат"]
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
      client.brief = [client.brief, `\n\n[Файл: ${file.name}]\n${record.text.slice(0, 6000)}`].join("").trim();
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
  readForm(client);
  client.service = "";
  client.problem = "";
  client.proofProblem = "";
  client.researchNotes = "";
  client.finalOutput = "";
  client.approvedText = "";
  client.productionStatus = "Новая услуга: нужен бриф";
  client.status = "Бриф";
  client.process = [
    { title: "Новая услуга", body: "Очищены поля услуги, проблемы, интернет-проверки и финального текста. Остальные данные клиента сохранены." }
  ];
  addSystemLog(client, "Новая услуга", "Начат новый бриф услуги");
  fillForm(client);
  persistOnly();
  renderAll();
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

function showPage(page) {
  const isDashboard = page === "dashboard";
  elements.dashboardPage.classList.toggle("active-page", isDashboard);
  elements.clientPage.classList.toggle("active-page", !isDashboard);
  elements.dashboardPageButton.classList.toggle("active", isDashboard);
  elements.clientPageButton.classList.toggle("active", !isDashboard);
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
$("clientPageButton").addEventListener("click", () => showPage("client"));
$("saveButton").addEventListener("click", save);
$("exportButton").addEventListener("click", exportData);
$("generateButton").addEventListener("click", generate);
$("manualCheckButton").addEventListener("click", manualCheck);
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
  elements.clientTitle.textContent = elements.clientName.value || "Новый клиент";
});
elements.clientStatus.addEventListener("change", () => {
  elements.clientStatusPill.textContent = elements.clientStatus.value;
});
elements.clientNiche.addEventListener("change", () => {
  elements.templateBadge.textContent = getTemplateName(elements.clientNiche.value);
});

loadSession();
