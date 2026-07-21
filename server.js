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

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.OPENAI_API_KEY || "ad-client-studio-local-secret";
const sessions = new Map();

const COPY_RULES = `
Ты не обычный генератор рекламы. Ты редактор рекламных текстов для команды Арика.
Твоя задача: написать текст так, чтобы таргетологу не пришлось говорить "что за херня".

Жесткий порядок работы:
1. Сначала проверь язык ниши через web search: как люди и поставщики услуги реально называют услугу, проблему, риски, результат, CTA.
2. Выбери один угол. Один вариант = одна проблема, одна ситуация или один страх. Не мешай разные боли, услуги, зоны, симптомы и аудитории.
3. Напиши черновик в стиле нужного шаблона.
4. Прогони черновик через фильтр корявых фраз.
5. Прогони через стоп-краны.
6. Верни только финальные варианты и короткий блок "Что проверено".

Что запрещено:
- Не выдавай универсальную рекламную кашу. Если текст можно поставить любому клиенту в любой нише, это брак.
- Не пиши как анкета: "мы предлагаем", "наша команда", "индивидуально подберем", "обращайтесь", "получите консультацию" без конкретной ситуации.
- Не пересказывай данные клиента. Преврати их в один рекламный угол.
- Не придумывай услугу, если ее нет в данных клиента. Не подменяй остеопата косметологом, перевозки ремонтом, ремонт общей "услугой".
- Не добавляй новые проблемы из интернета, если пользователь их не дал. Интернет нужен для языка ниши, а не для случайных углов.
- Не начинай с ленивого вопроса типа "Болит спина?", "Хотите?", "Ищете?". Первый экран должен быть ситуацией, мыслью, страхом, результатом или конкретным наблюдением.
- Не используй длинное тире "—".
- Не используй рекламную пластмассу: "индивидуальный подход", "комплексное решение", "профессиональный сервис", "качество жизни", "в разы", "навсегда", "гарантированно", "ощутимый результат", "вернуть легкость движений" без конкретики.
- Не используй ленивые AI-открытия: "Помогу разобраться", "зона, которая давно не нравится", "начать путь к здоровью", "вернуть здоровье", "ваш путь", "забота о себе", "почувствовать легкость", "безопасно и эффективно".
- Не используй корявые фразы: "с помощью остеопатии", "работаю с Остеопатия", "зона вас беспокоит", "состояние кожи" для остеопата, "подбираю режим процедуры" там, где это не процедура.
- Не используй литературщину и псевдо-живые образы: "утренние ступеньки", "спуск злится", "колено злится", "вечерний круг", "тянет под надколенником", "пробежка по набережной" как заголовок, "тело просит", "зона держит", "шея не отпускает". Это звучит как модель, которая старается быть писателем.
- Не давай неодушевленным вещам эмоции или волю: лестница не злится, колено не обижается, нагрузка не разговаривает, зона не держит. Пиши, что человек чувствует и когда это происходит.
- Не пиши медицинские гарантии. Для здоровья, тела, остеопатии, массажа, косметологии запрещены: "лечить", "вылечить", "избавлю", "убирает жир", "уберу жир", "без боли навсегда", "гарантия результата".

Как писать:
- Первый экран сразу показывает нишу или конкретную проблему.
- Каждая строка должна звучать как нормальная человеческая речь в WhatsApp, а не как перевод или брошюра.
- Никаких красивых авторских фраз ради красоты. Если обычный клиент так не сказал бы администратору в WhatsApp, перепиши проще.
- Показывай реальную ситуацию покупателя: что болит, что бесит, что может пойти не так, чего он боится при выборе.
- Процесс нужен только как доказательство: что специалист/команда проверяет, уточняет, делает, чтобы снизить риск для клиента.
- CTA должен объяснять пользу действия: что человек поймет, проверит или избежит после сообщения в WhatsApp.
- Если есть опыт/соцдоказательство, используй форму: "За последние X лет я видел/помог X людям, у которых..." или "За последние X лет я помог X людям с проблемой..." Но без гарантий и без лечения, если ниша рискованная.

Правила по нишам:
- Перевозки/переезды: стиль эмоциональный, через бытовой стресс, вещи, коробки, мебель, этаж, лифт, машину, доплаты. Сильный угол: "дешево на входе, дорого в день переезда".
- Ремонты: не рекламируй общий "ремонт". Рекламируй конкретную услугу: ванная, санузел, кухня, плитка, сантехника, электрика. Углы: скрытые доплаты, сорванные сроки, кривые швы, переделки, гидроизоляция, смета до старта.
- Косметология/массаж/тело: стиль как личное обращение специалиста. Без "лечу" и без обещаний чудес. Говори про локальную проблему, визуальный дискомфорт, уход, курс, оценку состояния, безопасный следующий шаг.
- Остеопат/боли: "я остеопат", "на остеопатическом приеме". Говори "помочь уменьшить", "разобраться, откуда идет нагрузка", "посмотреть стопу, таз, поясницу, движение". Не говори "процедура", "убрать боль навсегда", "лечить".
- Остеопат/колено: хороший язык: "колено болит после пробежки", "тяжело спускаться по лестнице", "боль появляется при ходьбе", "после нагрузки колено ноет", "смотрю стопу, таз, поясницу и движение". Плохой язык: "утренние ступеньки", "спуск злится", "тянет под надколенником", "колено берет лишнюю работу на себя" без нормального объяснения.
- Иврит: один креатив = один язык. Не переводи русский шаблон дословно. Используй простые нативные фразы, проверенные web search.

Финальный фильтр перед ответом:
- Это можно сказать вслух?
- Это реально так думает/говорит клиент?
- Понятно ли в первую секунду, что рекламируем?
- Есть ли одна идея, а не список всего подряд?
- Есть ли конкретный риск/боль/результат?
- Любой конкурент мог бы сказать то же самое? Если да, перепиши.
- Есть ли хотя бы одна корявая фраза? Если да, перепиши.
- Похоже на ChatGPT/брошюру/лендинг? Если да, перепиши в человеческую рекламу по референсу.
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

Референс для перевозок, хаос переезда:

Когда вы слышите слово ПЕРЕЕЗД, что первое приходит в голову?

Головная боль. Бардак. Паника. Тревога.
Нужно собирать вещи. Таскать вещи. Ломать спину.
А вещей ведь столько много.

Нормальная компания нужна не для того, чтобы просто приехала машина.

Она нужна, чтобы день переезда не превратился в "ааааа" у подъезда.

Мы заранее уточняем объем вещей, этаж, лифт, мебель, упаковку и время.
Разбираем и собираем мебель. Помогаем с упаковкой. Аккуратно перевозим вещи.

Напишите в WhatsApp. Рассчитаем стоимость и договоримся на дату.

Референс для здоровья/тела:

Если у вас присутствует конкретная проблема: боль в колене при ходьбе, дискомфорт при подъеме по лестнице, напряжение в пояснице или ограничение движения, не надо смешивать это в один текст.

Выбираем одну проблему и пишем про нее.

Меня зовут [имя]. Я остеопат.

На приеме я смотрю не только место, где болит. Проверяю, как работает стопа, таз, поясница и движение в целом.

Задача не в том, чтобы обещать чудо за один сеанс.

Задача: понять, откуда может идти нагрузка, и помочь телу двигаться спокойнее.

Напишите в WhatsApp. Расскажите, когда именно болит: при ходьбе, лестнице, вставании или после нагрузки. Я подскажу, есть ли смысл прийти на прием.

Референс для остеопата Якова и боли в колене:

Боль в колене не всегда начинается в самом колене.

Иногда на колено влияет то, как работает стопа, таз, поясница или походка.

Меня зовут Яков. Я остеопат.

На остеопатическом приеме я смотрю не только место, где болит.
Проверяю движение, стопу, таз, поясницу и то, где тело может перегружать колено.

Я не обещаю "убрать боль навсегда" и не заменяю медицинскую диагностику.

Задача приема: разобраться, откуда может идти нагрузка, и помочь телу двигаться спокойнее.

Если колено болит при ходьбе, лестнице, вставании или после нагрузки, напишите в WhatsApp. Расскажите, когда именно болит, и я подскажу, есть ли смысл прийти на прием.

Референс для косметологии/массажа:

Вес почти устраивает, но одна зона все равно раздражает в зеркале.

Это не всегда решается еще одной диетой или еще одной тренировкой.

Меня зовут [имя]. Я работаю с [услуга].

На приеме я смотрю конкретную зону, состояние кожи и противопоказания. После этого объясняю, какой формат работы подойдет и чего ждать без сказок про чудо за один сеанс.

Процедура проходит без уколов, операции и долгого восстановления.

Напишите в WhatsApp. Расскажите, какая зона не нравится, и я подскажу, есть ли смысл прийти на процедуру.

Референс для локального аппарата/косметологии:

Вес почти устраивает, но одна зона все равно раздражает в зеркале.

Живот. Бока. Руки. Зона над коленями.

И это не всегда решается еще одной диетой или еще одной тренировкой.

Меня зовут [имя]. Я работаю с [услуга].

Перед процедурой я смотрю конкретную зону, противопоказания и объясняю, чего реально ждать без сказок про чудо за один сеанс.

Процедура проходит без уколов, операции и долгого восстановления.

Напишите в WhatsApp. Расскажите, какая зона не нравится, и я подскажу, есть ли смысл прийти на процедуру.
`;

function compact(value) {
  return String(value || "").trim();
}

function clientContext(client) {
  return [
    client.service,
    client.problems,
    client.problem,
    client.procedures,
    client.price,
    client.notes,
    client.brief,
    client.facts,
    client.location
  ].map(compact).filter(Boolean).join("\n");
}

function validateGenerationInput(body) {
  const client = body.client || {};
  const service = compact(client.service);
  const context = clientContext(client);
  const fileText = compact((client.files || []).map((file) => file.text || file.content || file.name || "").join(" "));
  const contextWithoutService = [context, fileText]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const enoughContext = [service, contextWithoutService].join(" ").replace(/\s+/g, " ").trim();

  if (enoughContext.length < 45 || (!service && contextWithoutService.length < 90)) {
    const error = new Error("Недостаточно данных: заполните услугу, проблемы, процедуры/услуги, географию или цены. Примечания можно оставить пустыми.");
    error.status = 422;
    throw error;
  }
}

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

function stateForUser(state, user) {
  if (user === "Арик") return state;
  const clients = (state.clients || []).filter((client) => (client.mediaBuyer || "Таня") === user);
  return {
    clients,
    activeId: clients.some((client) => client.id === state.activeId) ? state.activeId : (clients[0]?.id || null)
  };
}

function mergeStateForUser(existingState, incomingState, user) {
  if (user === "Арик") return incomingState;

  const incomingClients = (incomingState.clients || []).map((client) => ({
    ...client,
    mediaBuyer: user
  }));
  const otherClients = (existingState.clients || []).filter((client) => (client.mediaBuyer || "Таня") !== user);

  return {
    clients: [...incomingClients, ...otherClients],
    activeId: incomingClients.some((client) => client.id === incomingState.activeId)
      ? incomingState.activeId
      : existingState.activeId
  };
}

function buildGenerationPrompt(body) {
  const client = body.client || {};
  const nicheContext = [
    client.niche,
    client.service,
    client.problems,
    client.problem,
    client.procedures,
    client.notes,
    client.brief,
    client.location
  ].filter(Boolean).join(" ");

  const nicheDirective = /перевоз|переезд|груз/i.test(nicheContext)
    ? `Это перевозки/переезд. Пиши живо и конкретно: вещи, коробки, мебель, этаж, лифт, подъезд, упаковка, разборка, машина, доплаты. Хорошие углы: дешевый перевозчик, хаос переезда, скрытые доплаты, сломанная мебель, сорванное время.`
    : /ремонт|ванн|сануз|кухн|плитк|сантех|электр/i.test(nicheContext)
      ? `Это ремонт. Не рекламируй общий ремонт. Выбери конкретную услугу: ванная, санузел, плитка, сантехника, электрика, кухня. Пиши через риски: переделки, кривые швы, скрытые доплаты, гидроизоляция, сорванные сроки, грязь, смета.`
      : /остеопат|колен|поясниц|спин|шея|сустав|боль/i.test(nicheContext)
        ? `Это остеопат/телесная работа с болью. Не пиши как косметолог. Не говори "процедура", "состояние кожи", "зона беспокоит". Говори: прием, движение, нагрузка, стопа, таз, поясница, лестница, ходьба, вставание, после нагрузки.`
        : /космет|массаж|аппарат|iconic|тело|живот|бок|объем|целлюлит/i.test(nicheContext)
          ? `Это косметология/массаж/аппаратная процедура. Пиши как личное обращение специалиста. Без медицинских обещаний. Конкретная зона, визуальный дискомфорт, оценка противопоказаний, чего ждать без сказок.`
          : `Сам определи нишу по данным клиента, но не пиши общий универсальный текст.`;

  return `
Сгенерируй рекламные тексты по правилам Арика. Не нарушай правила ради красивого текста.

Количество вариантов: ${body.variantCount || 5}
Формат: ${body.format || "Meta post"}
Режим угла: ${body.angleMode || "auto"}
Язык: ${client.language || "ru"}
Ниша: ${client.niche || ""}
Клиент/специалист: ${client.name || ""}
Таргетолог: ${client.mediaBuyer || ""}
География: ${client.location || ""}
Услуга: ${client.service || ""}
Если поле "Услуга" пустое, найди услугу в заполненных данных. Если непонятно, что рекламируем, остановись и скажи, какой информации не хватает.
Цены: ${client.price || ""}
Какие проблемы решает: ${client.problems || client.problem || ""}
Какими процедурами/услугами владеет: ${client.procedures || ""}

Директива по нише:
${nicheDirective}

Примечания. Это дополнительное поле, а не обязательный бриф. Используй только если оно заполнено:
${client.notes || client.brief || ""}

Файлы клиента. Используй как дополнительный контекст, не выдумывай факты:
${(client.files || []).map((file) => file.text ? `[${file.name}]\n${file.text.slice(0, 2500)}` : `[${file.name}]`).join("\n\n")}

Интернет-проверка обязательна по умолчанию. Самостоятельно проверь:
- язык ниши: как клиенты и поставщики реально называют услугу, проблему и результат;
- информацию о процедуре/услуге: как это работает, какие этапы, что важно до/после;
- риски, ограничения, противопоказания или типичные причины недоверия;
- типичные боли и ситуации клиента;
- нормальный CTA для этой ниши.

Важно:
- Начинай каждый вариант с сильного рекламного первого экрана. Не начинай с "⚡ Помогу", "Если вас беспокоит", "Хотите", "Ищете", "Иногда".
- Не используй проблемы, услуги и обещания, которых нет в данных клиента.
- Если вариантов несколько, каждый вариант должен быть отдельным углом, а не синонимом.
- В каждом варианте должен быть свой первый экран.
- Не пиши "Вариант 1 - Отеки..." если проблема не про отеки.
- Не пиши "не медуслуга", если это выглядит как юридическая отписка внутри рекламы. Лучше мягко сформулируй обещание.
- Не пиши "поможем улучшить качество жизни", "индивидуальный подход", "комплексно", "профессионально", если это не привязано к конкретной ситуации.
- Перед финальным ответом сравни каждый вариант с референсом нужной ниши. Если он слабее и более общий, перепиши.
- Если текст звучит как обычный ChatGPT, салонная брошюра или "универсальная реклама для всех", это не финал. Перепиши до уровня референса.
- Перед отправкой перечитай каждый вариант как таргетолог. Если там нет живой боли, конкретики ниши и нормального человеческого ритма, перепиши.
- Не показывай черновик.

Верни структуру:
Вариант 1: [название угла]
[готовый текст]

Вариант 2: [название угла]
[готовый текст]

Что проверено:
- Интернет-язык ниши: [2-4 слова/фразы, которые реально использовал]
- Стоп-краны: [что убрано]
- Корявые фразы: [что переписано]
`;
}

async function callOpenAI(input) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5",
      tools: [{ type: "web_search" }],
      input
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "OpenAI generation failed");
    error.status = response.status;
    throw error;
  }

  const outputText = data.output_text || (data.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n");

  return outputText.trim();
}

function assessCopyQuality(text, body) {
  const client = body.client || {};
  const haystack = String(text || "");
  const lower = haystack.toLowerCase();
  const issues = [];

  const genericPhrases = [
    "индивидуальный подход",
    "комплексное решение",
    "профессиональный сервис",
    "качественные услуги",
    "улучшить качество жизни",
    "вернуть здоровье",
    "начать путь к здоровью",
    "ваш путь к здоровью",
    "забота о себе",
    "почувствовать легкость",
    "легкость движений",
    "безопасно и эффективно",
    "помогу разобраться с зоной",
    "зона, которая давно не нравится",
    "доверьтесь профессионалам",
    "получите консультацию"
  ];
  genericPhrases.forEach((phrase) => {
    if (lower.includes(phrase)) issues.push(`пластмассовая фраза: ${phrase}`);
  });

  const crookedPhrases = [
    "с помощью остеопатии",
    "работаю с остеопатия",
    "с остеопатия",
    "зона вас беспокоит",
    "какая зона беспокоит",
    "подбираю режим процедуры",
    "подбираю режим работы",
    "утренние ступеньки",
    "спуск по лестнице уже злится",
    "спуск злится",
    "колено злится",
    "вечерний круг",
    "тянет под надколенником",
    "пробежка по набережной, утренние ступеньки",
    "тело просит",
    "зона держит",
    "шея не отпускает"
  ];
  crookedPhrases.forEach((phrase) => {
    if (lower.includes(phrase)) issues.push(`корявая фраза: ${phrase}`);
  });

  if (/леч(у|им|ит|ить|ение)|вылеч|избав(лю|им|ит|иться|ление)|гарантир|навсегда/i.test(haystack)) {
    issues.push("есть медицинское или слишком жесткое обещание");
  }

  if (/(лестниц|спуск|подъем|колен|шея|зона|тело|нагрузк)[а-я\s,.]{0,32}(злит|злится|просит|держит|не отпускает|обижается|берет на себя|разговаривает)/i.test(haystack)) {
    issues.push("литературщина: неодушевленный объект ведет себя как человек");
  }

  if (/набережн|утренн(ие|яя)\s+ступеньк|под\s+надколенник|вечерн(ий|ем)\s+круг/i.test(haystack)) {
    issues.push("слишком писательский образ вместо нормальной речи клиента");
  }

  if (/остеопат|колен|поясниц|спин/i.test(`${client.niche} ${clientContext(client)}`)) {
    if (/состояние кожи|локальн(ая|ую|ой) зон|жир|силуэт|процедура проходит без уколов/i.test(haystack)) {
      issues.push("остеопатический текст смешан с косметологическим шаблоном");
    }
    if (!/стоп|таз|поясниц|движен|нагруз|лестниц|ходьб|вставан/i.test(haystack)) {
      issues.push("нет языка остеопатической ниши про движение, нагрузку, стопу, таз или лестницу");
    }
  }

  if (/перевоз|переезд|груз/i.test(`${client.niche} ${clientContext(client)}`)) {
    if (!/короб|мебел|лифт|этаж|машин|доплат|вещ|подъезд|упаков/i.test(haystack)) {
      issues.push("нет живого языка перевозок: вещи, мебель, этаж, лифт, коробки, доплаты");
    }
  }

  if (/ремонт|ванн|сануз|кухн|плитк|сантех|электр/i.test(`${client.niche} ${clientContext(client)}`)) {
    if (/ремонт\b/i.test(haystack) && !/ванн|сануз|кухн|плитк|сантех|электр|гидроизоляц|шв|смет/i.test(haystack)) {
      issues.push("ремонт написан слишком общо, без конкретной услуги и ремонтного риска");
    }
  }

  const variantMatches = haystack.match(/Вариант\s+\d+/gi) || [];
  const requestedCount = Number(body.variantCount || 5);
  if (requestedCount > 1 && variantMatches.length < Math.min(2, requestedCount)) {
    issues.push("модель не вернула несколько вариантов");
  }

  const firstTextLine = haystack
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !/^Вариант\s+\d+/i.test(line));
  if (firstTextLine && /\?$/.test(firstTextLine)) {
    issues.push("первый экран начинается ленивым вопросом");
  }
  if (firstTextLine && /^(⚡\s*)?(помогу|если вас|хотите|ищете|иногда)/i.test(firstTextLine)) {
    issues.push("первый экран начинается ленивой шаблонной фразой");
  }
  if (firstTextLine && /набережн|ступеньк|утренн|вечерн(ий|ем)\s+круг|под\s+надколенник/i.test(firstTextLine)) {
    issues.push("первый экран звучит как литературный заголовок, а не реклама");
  }

  const lines = haystack.split("\n").map((line) => line.trim()).filter(Boolean);
  const concreteSignals = [
    /короб|мебел|лифт|этаж|машин|подъезд|доплат|упаков|вещ/i,
    /шв|плитк|смет|гидроизоляц|сануз|ванн|кухн|сантех|электр|срок/i,
    /стоп|таз|поясниц|движен|нагруз|лестниц|ходьб|вставан|колен/i,
    /живот|бок|рук|объем|кож|противопоказ|аппарат|курс|зон/i
  ];
  if (!concreteSignals.some((pattern) => pattern.test(haystack))) {
    issues.push("нет конкретного языка ниши, текст слишком универсальный");
  }
  if (lines.filter((line) => line.length > 0 && line.length < 130).length < Math.min(8, lines.length)) {
    issues.push("ритм слишком похож на брошюру, нужно короче и разговорнее");
  }

  if (haystack.length < 600) {
    issues.push("текст слишком короткий для набора вариантов");
  }

  return [...new Set(issues)];
}

function buildRewritePrompt(body, badText, issues) {
  return `
Первый ответ не прошел контроль качества команды Арика.

Проблемы:
${issues.map((issue) => `- ${issue}`).join("\n")}

Плохой текст:
${badText}

Перепиши с нуля.
Обязательно:
- держи стиль референса нужной ниши, а не общий маркетинговый стиль;
- каждый вариант = отдельный угол;
- первый экран должен сразу попадать в конкретную ситуацию клиента;
- не добавляй чужую нишу, чужие проблемы и чужие обещания;
- убери литературность, псевдо-живые образы и странные телесные метафоры;
- пиши так, как человек реально написал бы в WhatsApp: "болит после пробежки", "тяжело спускаться по лестнице", "боль появляется к вечеру";
- запрещены фразы в стиле: "утренние ступеньки", "спуск злится", "тянет под надколенником", "вечерний круг";
- блок "Что проверено" оставь коротким и конкретным.

Исходный запрос:
${buildGenerationPrompt(body)}
`;
}

function buildInstructionRewritePrompt(body) {
  const client = body.client || {};
  const instruction = compact(body.instruction);
  const currentText = compact(body.currentText);
  return `
Переделай уже готовый рекламный текст по комментарию таргетолога.

Это не новая генерация с нуля. Нужно прочитать текущий текст, понять, что именно просят исправить, и вернуть улучшенную версию.

Комментарий таргетолога:
${instruction}

Текущий текст:
${currentText}

Контекст клиента:
Язык: ${client.language || "ru"}
Ниша: ${client.niche || ""}
Клиент/специалист: ${client.name || ""}
География: ${client.location || ""}
Услуга: ${client.service || ""}
Цены: ${client.price || ""}
Какие проблемы решает: ${client.problems || client.problem || ""}
Какими процедурами/услугами владеет: ${client.procedures || ""}
Примечания:
${client.notes || client.brief || ""}

Обязательно:
- Исправь именно то, что написано в комментарии.
- Сохрани сильные куски текущего текста, если они не мешают правке.
- Не меняй нишу, услугу, географию и язык.
- Не добавляй новые обещания, которых нет в данных клиента.
- Если комментарий просит нарушить стоп-краны, не нарушай. Сделай максимально близко, но безопасно.
- Прогони результат через фильтр корявых фраз и стоп-краны.
- Если текст был общим, перепиши его ближе к референсу нужной ниши.

Верни только исправленный финальный текст и короткий блок:
Что изменено:
- [2-4 конкретных правки]
`;
}

async function generateWithOpenAI(body) {
  validateGenerationInput(body);

  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY не подключен");
    error.status = 501;
    throw error;
  }

  const input = [
    { role: "system", content: COPY_RULES },
    { role: "system", content: COPY_REFERENCES },
    { role: "user", content: buildGenerationPrompt(body) }
  ];
  let outputText = await callOpenAI(input);
  let finalIssues = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const issues = assessCopyQuality(outputText, body);
    finalIssues = issues;
    if (!issues.length) {
      finalIssues = [];
      break;
    }
    outputText = await callOpenAI([
      { role: "system", content: COPY_RULES },
      { role: "system", content: COPY_REFERENCES },
      { role: "user", content: buildRewritePrompt(body, outputText, issues) }
    ]);
  }
  finalIssues = assessCopyQuality(outputText, body);
  if (finalIssues.length) {
    const error = new Error(`Текст не прошел фильтр качества: ${finalIssues.join("; ")}. Нажмите “Сгенерировать текст” еще раз или уточните проблему/услугу.`);
    error.status = 422;
    throw error;
  }

  return outputText;
}

async function rewriteWithOpenAI(body) {
  validateGenerationInput(body);

  const instruction = compact(body.instruction);
  const currentText = compact(body.currentText);
  if (!currentText || currentText.length < 50) {
    const error = new Error("Нет текста для редактирования");
    error.status = 422;
    throw error;
  }
  if (!instruction || instruction.length < 8) {
    const error = new Error("Напишите, что именно нужно изменить в тексте");
    error.status = 422;
    throw error;
  }

  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY не подключен");
    error.status = 501;
    throw error;
  }

  let outputText = await callOpenAI([
    { role: "system", content: COPY_RULES },
    { role: "system", content: COPY_REFERENCES },
    { role: "user", content: buildInstructionRewritePrompt(body) }
  ]);

  let finalIssues = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const issues = assessCopyQuality(outputText, body);
    finalIssues = issues;
    if (!issues.length) {
      finalIssues = [];
      break;
    }
    outputText = await callOpenAI([
      { role: "system", content: COPY_RULES },
      { role: "system", content: COPY_REFERENCES },
      { role: "user", content: buildRewritePrompt(body, outputText, issues) }
    ]);
  }
  finalIssues = assessCopyQuality(outputText, body);
  if (finalIssues.length) {
    const error = new Error(`Исправленный текст не прошел фильтр качества: ${finalIssues.join("; ")}. Напишите правку проще или нажмите “Переделать текст” еще раз.`);
    error.status = 422;
    throw error;
  }

  return outputText;
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

function signSessionPayload(payload) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({
    user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  })).toString("base64url");
  return `v1.${payload}.${signSessionPayload(payload)}`;
}

function verifySessionToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;

  const [, payload, signature] = parts;
  const expected = signSessionPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.user || !USERS[data.user]) return null;
    if (!data.exp || Date.now() > data.exp) return null;
    return data.user;
  } catch {
    return null;
  }
}

function currentUser(req) {
  const token = parseCookies(req).acs_session;
  if (!token) return null;
  return verifySessionToken(token) || sessions.get(token) || null;
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
    const token = createSessionToken(body.user);
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
    sendJson(res, 200, stateForUser(readState(), user));
    return;
  }

  if (url.pathname === "/api/state" && req.method === "POST") {
    const incomingState = await readBody(req);
    const existingState = readState();
    writeState(mergeStateForUser(existingState, incomingState, user));
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/generate" && req.method === "POST") {
    const body = await readBody(req);
    const text = await generateWithOpenAI(body);
    sendJson(res, 200, { text });
    return;
  }

  if (url.pathname === "/api/rewrite" && req.method === "POST") {
    const body = await readBody(req);
    const text = await rewriteWithOpenAI(body);
    sendJson(res, 200, { text });
    return;
  }

  sendJson(res, 404, { error: "Не найдено" });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch((error) => {
      sendJson(res, error.status || 500, { error: error.message || "Ошибка сервера" });
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  ensureDataDir();
  console.log(`Ad Client Studio running on ${PORT}`);
});
