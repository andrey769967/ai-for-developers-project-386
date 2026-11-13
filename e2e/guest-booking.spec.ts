import { test, expect } from "@playwright/test";

// Сквозной сценарий гостя против настоящего сервера: типы встреч из seed,
// календарь на Booking window, свободный Slot, форма и подтверждение.
// Ответы API не подменяются: страница ходит в тот же процесс, что и тест.
test("гость записывается на свободный слот", async ({ page, request }) => {
  const guestName = "E2E Guest";
  const guestEmail = `e2e-${Date.now()}@example.com`;

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Запись на звонок" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Консультация/ })).toBeVisible();

  await page.getByRole("button", { name: /Консультация/ }).click();
  await expect(page.getByText("Даты")).toBeVisible();

  // Первый доступный день выбирается сам, остаётся взять первый свободный старт
  const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
  await expect(slot).toBeVisible();
  await slot.click();

  await page.getByPlaceholder("Ваше имя").fill(guestName);
  await page.getByPlaceholder("you@example.com").fill(guestEmail);
  await page.getByRole("button", { name: "Записаться" }).click();

  await expect(page.getByRole("heading", { name: "Вы записаны!" })).toBeVisible();

  // Подтверждение экрана мало: Booking должен реально сохраниться на сервере
  const response = await request.get("/api/bookings");
  expect(response.ok()).toBeTruthy();
  const bookings = (await response.json()) as Array<{ guestEmail: string }>;
  expect(bookings.some((booking) => booking.guestEmail === guestEmail)).toBe(true);
});
