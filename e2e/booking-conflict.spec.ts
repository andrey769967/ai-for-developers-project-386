import { test, expect } from "@playwright/test";

// Две страницы гостя выбирают один Slot. Первая успевает записаться, вторая
// отправляет устаревший Slot и должна получить 409 с понятным сообщением.
// Сценарий идёт против настоящего сервера, без моков API.
test("гость видит конфликт, если время уже занято", async ({ browser, request }) => {
  const stamp = Date.now();
  const emailA = `conflict-a-${stamp}@example.com`;
  const emailB = `conflict-b-${stamp}@example.com`;

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await Promise.all([pageA.goto("/"), pageB.goto("/")]);

    // Берём тип, который не используют другие E2E-сценарии.
    const meetingType = /Глубокое погружение/;
    await Promise.all([
      pageA.getByRole("button", { name: meetingType }).click(),
      pageB.getByRole("button", { name: meetingType }).click(),
    ]);

    const slotsA = pageA.getByRole("button", { name: /^\d{2}:\d{2}$/ });
    const slotsB = pageB.getByRole("button", { name: /^\d{2}:\d{2}$/ });
    await expect(slotsA.first()).toBeVisible();
    await expect(slotsB.first()).toBeVisible();

    // Последний Slot окна: первый Slot занят другим E2E-сценарием.
    await slotsA.last().click();
    await slotsB.last().click();

    await pageA.getByPlaceholder("Ваше имя").fill("Гость A");
    await pageA.getByPlaceholder("you@example.com").fill(emailA);
    await pageB.getByPlaceholder("Ваше имя").fill("Гость B");
    await pageB.getByPlaceholder("you@example.com").fill(emailB);

    // Первая страница занимает Slot.
    await pageA.getByRole("button", { name: "Записаться" }).click();
    await expect(pageA.getByRole("heading", { name: "Вы записаны!" })).toBeVisible();

    // Вторая страница отправляет тот же Slot с устаревшей Availability.
    await pageB.getByRole("button", { name: "Записаться" }).click();
    await expect(
      pageB.getByText("Это время уже занято, выберите другое", { exact: true }),
    ).toBeVisible();
    await expect(pageB.getByRole("heading", { name: "Вы записаны!" })).toHaveCount(0);

    // На сервере ровно одна Booking на этот Slot и нет Booking от второго гостя.
    const response = await request.get("/api/bookings");
    expect(response.ok()).toBeTruthy();
    const bookings = (await response.json()) as Array<{
      guestEmail: string;
      startTime: string;
    }>;

    const bookingA = bookings.find((booking) => booking.guestEmail === emailA);
    expect(bookingA).toBeTruthy();
    expect(
      bookings.filter((booking) => booking.startTime === bookingA!.startTime),
    ).toHaveLength(1);
    expect(bookings.some((booking) => booking.guestEmail === emailB)).toBe(false);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
