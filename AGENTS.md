# راهنمای توسعه پروژه

این پروژه شامل دو بخش اصلی است:

1.  **`client`**: اپلیکیشن فرانت‌اند که با React نوشته شده است.
2.  **`server`**: اپلیکیشن بک‌اند که با Node.js و Express ساخته شده است.

دیتابیس اصلی **PostgreSQL** است.

## دستورالعمل‌های راه‌اندازی

```bash
# PostgreSQL (لوکال با Docker)
docker compose up -d postgres

# نصب وابستگی‌های سرور
npm install --prefix server

# نصب وابستگی‌های کلاینت
npm install --prefix client
```

متغیر اتصال پیش‌فرض:

```
DATABASE_URL=postgres://roshdyar:roshdyar@127.0.0.1:5432/roshdyar
```

## اجرای پروژه

**ترمینال ۱ (برای سرور):**

```bash
npm run dev --prefix server
```

**ترمینال ۲ (برای کلاینت):**

```bash
npm start --prefix client
```

سرور روی پورت `5000` و کلاینت روی پورت `3000` اجرا خواهد شد.
هلث‌چک دیتابیس: `GET http://localhost:5000/api/health`

