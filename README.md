# تات کیدز (TatKids)

**نسخه مرجع: `1.0.0`**

همراه هوشمند رشد و سلامت کودک. این مخزن نسخهٔ نهایی محصول روی شاخهٔ `main` است؛ کار بعدی از همین نقطه شروع می‌شود، نه از برنچ‌ها و پول‌ریکویست‌های پراکنده.

- محصول: [tatkids.com](https://tatkids.com/)
- کد: `client/` (React) + `server/` (Node.js / Express)
- نام زیرساختی استقرار: `roshdyar` (`/var/www/roshdyar`، PM2، پایگاه `roshdyar.db`)

جزئیات تغییرات این نسخه در [`CHANGELOG.md`](CHANGELOG.md) است.

## چه چیزی داخل نسخه ۱.۰ است

| بخش | مسیرهای اصلی | توضیح |
| --- | --- | --- |
| ورود و حساب | `/register` ، `/login` ، `/profile` | ثبت‌نام و ورود با پیامک OTP، ورود با رمز، بازیابی رمز، پروفایل |
| خانه و کودکان | `/dashboard` ، `/my-children` | داشبورد خدمات، مدیریت فرزندان، ویزارد افزودن/ویرایش |
| رشد و سلامت | `/child-growth/:id` ، `/growth-chart/:id` ، `/health-profile/:id` | رشد کودک من، نمودار WHO، پرونده و تحلیل سلامت |
| واکسن و آزمایش | `/vaccination/:id` ، `/vaccination-status/:id` ، `/lab-tests/:id` | کارت واکسن (با PDF)، وضعیت، چکاپ |
| مجله سلامت | `/news` | مقاله، ویدیو، پادکست، نویسنده و سئو — بدون ورود هم دیده می‌شود |
| فروشگاه | `/shop` ، `/cart` ، `/orders` ، `/vendor` | کالا، فیلتر، سبد، سفارش، پنل فروشنده |
| پیام و پشتیبانی | داخل پروفایل | صندوق پیام، یادآور، تیکت |
| مدیریت | `/admin` | کاربران، فروشگاه، مجله، فروشندگان، پیام و تیکت |

منبع حقیقت محصول **شاخه `main`** است. برنچ‌های `cursor/*` و پول‌ریکویست‌های باز، آزمایش هستند مگر بعد از ادغام در `main`.

## راه‌اندازی محلی

```bash
npm install --prefix server
npm install --prefix client

npm run dev --prefix server    # پورت 5000
npm start --prefix client      # پورت 3000
```

کپی متغیرها:

```bash
cp server/.env.example server/.env
```

در توسعه، اگر کلید پیامک نباشد، OTP در پاسخ API به‌صورت `devOtp` برمی‌گردد.

بررسی سلامت سرور: `GET http://localhost:5000/api/health`  
فهرست API: `GET http://localhost:5000/api`

## پایگاه داده

| حالت | شرط | فایل |
| --- | --- | --- |
| پیش‌فرض (فعلی) | بدون `DATABASE_URL` | SQLite در `server/data/roshdyar.db` |
| مقیاس‌پذیر | `DATABASE_URL=postgres://...` | PostgreSQL با `server/db-pg.js` |
| قدیمی | فقط مهاجرت | `server/db.json` |

مهاجرت:

```bash
npm run migrate:sqlite --prefix server
bash scripts/migrate-postgres.sh
```

## استقرار

```bash
BRANCH=main bash scripts/deploy-server.sh
```

- اپ PM2: `roshdyar` (`ecosystem.config.js`)
- بکاپ: `scripts/backup.sh`
- اسرار فقط در `server/.env`: `JWT_SECRET`، `SMS_*`، در صورت نیاز `DATABASE_URL`

## تست

```bash
npm test --prefix server
```

## نسخه و تگ

فایل [`VERSION`](VERSION) همان برچسب انتشار است. بعد از ادغام این شاخه در `main`، تگ گیت را این‌طور بزنید:

```bash
git checkout main
git pull
git tag -a v1.0.0 -m "TatKids 1.0.0 — نسخه مرجع محصول"
git push origin v1.0.0
```

از اینجا به بعد هر قابلیت جدید روی برنچ جدا از `v1.0.0` / `main` ساخته شود تا رشتهٔ تغییرات دوباره گم نشود.
