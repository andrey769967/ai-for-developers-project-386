// Smoke-проверка живого сервера: только чтение, ничего не создаёт.
// Локально: npm run smoke
// Публичный стенд: BASE_URL=https://call-booking-fqwk.onrender.com npm run smoke
const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");

let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(120_000) });
  return { response, body: await response.json().catch(() => null) };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    console.log(`ok   ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name} — ${error.message}`);
  }
}

console.log(`Smoke against ${base}`);

await check("GET /health", async () => {
  const { response, body } = await get("/health");
  assert(response.status === 200, `status ${response.status}`);
  assert(body?.status === "ok", `body ${JSON.stringify(body)}`);
  return "200 ok";
});

let meetingTypeId;

await check("GET /api/meeting-types", async () => {
  const { response, body } = await get("/api/meeting-types");
  assert(response.status === 200, `status ${response.status}`);
  assert(Array.isArray(body) && body.length > 0, "список типов встреч пуст");
  meetingTypeId = body[0].id;
  return `${body.length} типа встреч`;
});

await check("GET /api/booking-window", async () => {
  const { response, body } = await get("/api/booking-window");
  assert(response.status === 200, `status ${response.status}`);
  const days = (new Date(body.endTime) - new Date(body.startTime)) / 86_400_000;
  assert(days === 14, `окно ${days} суток`);
  return "14 суток";
});

await check("GET /api/meeting-types/{id}/slots", async () => {
  assert(meetingTypeId, "нет типа встречи для проверки слотов");
  const { response, body } = await get(`/api/meeting-types/${meetingTypeId}/slots`);
  assert(response.status === 200, `status ${response.status}`);
  assert(Array.isArray(body), "ответ не массив слотов");
  return `${body.length} слотов`;
});

await check("GET /api/bookings", async () => {
  const { response, body } = await get("/api/bookings");
  assert(response.status === 200, `status ${response.status}`);
  assert(Array.isArray(body), "ответ не массив записей");
  return `${body.length} записей`;
});

if (failed > 0) {
  console.error(`\n${failed} проверок провалено`);
  process.exit(1);
}

console.log("\nSmoke пройден");
