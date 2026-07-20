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
