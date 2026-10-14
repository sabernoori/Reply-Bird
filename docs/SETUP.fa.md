# راه‌اندازی ReplyBird

این راهنما مرحله‌به‌مرحله است. جمله‌ها کوتاه‌اند. اگر جایی گیر کردید، همان صفحه را در متا یا نئون دوباره بخوانید و از اول همان مرحله را تکرار کنید.

ReplyBird برای **یک** حساب اینستاگرام حرفه‌ای (Business یا Creator) ساخته شده. متن پیام‌ها و کلیدواژه‌ها را بعداً در صفحه ادمین می‌نویسید. هیچ برند خاصی داخل کد قفل نشده.

---

## چیزهایی که لازم دارید

- یک حساب اینستاگرام **حرفه‌ای** (Business یا Creator)
- یک شماره موبایل/ایمیل برای [developers.facebook.com](https://developers.facebook.com)
- یک پروژه رایگان در [Neon](https://neon.tech) برای Postgres
- یک حساب [Vercel](https://vercel.com) و این مخزن روی GitHub
- (اختیاری) یک ربات تلگرام برای گزارش لید

توکن‌ها را هیچ‌وقت داخل گیت نگذارید.

---

## ۱) ساخت اپ در Meta

1. بروید به [developers.facebook.com](https://developers.facebook.com) و با فیسبوک وارد شوید.
2. **My Apps** → **Create App**.
3. نوع اپ را **Business** انتخاب کنید.
4. اسمی عمومی بگذارید (مثلاً ReplyBird). این اسم بعداً در صفحه مجوز اینستاگرام دیده می‌شود.
5. وقتی اپ ساخته شد، از داشبورد محصول **Instagram** را اضافه کنید.
6. مهم: **Instagram API with Instagram Login** را انتخاب کنید.  
   مسیر قدیمی «Instagram API with Facebook Login» را استفاده نکنید. ReplyBird با `graph.instagram.com` کار می‌کند، نه با توکن پیج فیسبوک.

مجوزهایی که بعداً لازم دارید:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

---

## ۲) اضافه کردن حساب اینستاگرام به‌عنوان تستر

تا وقتی اپ در حالت **Development** است، وبهوک واقعی فقط برای تسترها می‌آید.

1. در اپ متا بروید به **App roles** → **Roles**.
2. بخش **Instagram Testers** را پیدا کنید و حساب حرفه‌ای خودتان را اضافه کنید.
3. در اپلیکیشن اینستاگرام (موبایل) با همان حساب وارد شوید.
4. بروید به **Settings → Website permissions / Tester invites** (یا «دعوت‌های تست») و دعوت را **Accept** کنید.

اگر دعوت را در اینستاگرام قبول نکنید، ساخت توکن و وبهوک شکست می‌خورد.

---

## ۳) ساخت توکن بلندمدت

1. در اپ متا بروید به محصول Instagram → **API setup with Instagram login** (یا Generate access token).
2. حساب تستر را وصل کنید و این دسترسی‌ها را بدهید: basic، manage comments، manage messages.
3. یک توکن کوتاه‌مدت می‌گیرید. آن را با این درخواست به توکن **۶۰ روزه** تبدیل کنید:

```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret=IG_APP_SECRET
  &access_token=SHORT_LIVED_TOKEN
```

4. مقدار `access_token` برگشتی را در `IG_ACCESS_TOKEN` بگذارید.
5. شناسه حساب را بگیرید:

```
GET https://graph.instagram.com/me?fields=user_id,username,id
  &access_token=LONG_LIVED_TOKEN
```

6. فیلد **`user_id`** را در `IG_USER_ID` بگذارید (نه فقط `id` اپ‌اسکوپ، اگر این دو فرق داشتند).

کرون روزانه ReplyBird همین توکن بلندمدت را با `refresh_access_token` تمدید می‌کند و داخل دیتابیس ذخیره می‌کند.

---

## ۴) آدرس وبهوک و Verify Token

بعد از دیپلوی روی Vercel، در متا:

1. Instagram → **Webhooks** (یا Configuration → Callback URL).
2. Callback URL:

```
https://YOUR_DOMAIN/api/webhooks/instagram
```

`YOUR_DOMAIN` همان دامنه Vercel است، مثلاً `https://replybird.vercel.app`.

3. Verify Token را خودتان بسازید (یک رشته تصادفی). همان را در `IG_VERIFY_TOKEN` هم بگذارید.
4. **Verify and save**. اگر سبز نشد:
   - توکن وبهوک در متا و در Vercel یکی نیست
   - آدرس وبهوک ریدایرکت ۳۰۷ می‌دهد (دامنه غیر اصلی را نگذارید)
   - هنوز دیپلوی نشده
5. فیلدهای **`comments`** و **`messages`** را Subscribe کنید.
   - `comments` = کامنت به دایرکت
   - `messages` = جواب خودکار به دایرکت/ریپلای استوری (اگر در قانون ادمین روشن باشد)

برای تست بدون کامنت واقعی: کنار `comments` روی **Test** بزنید، بعد **Send to My Server**. فقط دکمه Test کافی نیست.

---

## ۵) Live کردن اپ

در حالت Development، کامنت کاربر عادی به سرور شما نمی‌رسد. فقط تستر و دکمه Test.

برای کار واقعی:

1. در متا **App Review** را برای همان سه مجوز بالا بفرستید (اگر از محدوده تستر خارج می‌شوید).
2. بعد از تأیید، اپ را **Live** کنید.
3. حساب اینستاگرام باید حرفه‌ای بماند.

تا Live نشده، از یک حساب تسترِ دوم روی پست خودتان کامنت بگذارید.

---

## ۶) ساخت دیتابیس Neon

1. در [console.neon.tech](https://console.neon.tech) یک پروژه بسازید.
2. Connection string **pooled** را کپی کنید (`-pooler` در هاست). این می‌شود `DATABASE_URL`.
3. روی لپ‌تاپ:

```bash
cp .env.example .env.local
# DATABASE_URL را در .env.local بگذارید
npm install
npm run migrate
```

باید ببینید: `applied 0001_init.sql`.

---

## ۷) ایمپورت در Vercel و env

1. مخزن GitHub را در Vercel **Import** کنید.
2. Framework: Next.js (خودش تشخیص می‌دهد).
3. در Project Settings → Environment Variables همه این‌ها را برای Production (و Preview اگر می‌خواهید) پر کنید:

| متغیر | توضیح |
| --- | --- |
| `DATABASE_URL` | آدرس Neon |
| `IG_APP_ID` | شناسه اپ متا |
| `IG_APP_SECRET` | App Secret (برای امضای وبهوک) |
| `IG_VERIFY_TOKEN` | همان Verify Token وبهوک |
| `IG_ACCESS_TOKEN` | توکن بلندمدت |
| `IG_USER_ID` | `user_id` حساب حرفه‌ای |
| `ADMIN_PASSWORD` | رمز صفحه `/admin` |
| `AUTOREPLY_ENABLED` | `true` یا `false` |
| `TELEGRAM_BOT_TOKEN` | خالی = بدون گزارش |
| `TELEGRAM_REPORT_CHAT_ID` | آیدی چت گزارش |
| `CRON_SECRET` | پیشنهادی؛ اگر بگذارید، کرون باید همین را بفرستد |

4. Deploy بزنید. دیپلوی را این ربات انجام نمی‌دهد؛ خودتان از داشبورد Vercel این کار را بکنید.
5. باز کنید: `https://YOUR_DOMAIN/api/health` باید `ok` باشد.
6. بروید به `https://YOUR_DOMAIN/admin` و یک قانون بسازید (کلیدواژه، متن دایرکت، لینک اختیاری).

کرون تمدید توکن هر روز ساعت 04:00 UTC به `/api/cron/refresh-token` می‌زند. این در `vercel.json` آمده است.

---

## ۸) خاموش‌کردن اضطراری

در Vercel مقدار `AUTOREPLY_ENABLED` را `false` کنید و Redeploy (یا فقط env را ذخیره کنید اگر بدون بیلد اعمال می‌شود).  
ReplyBird همچنان لاگ می‌نویسد ولی هیچ دایرکت یا ریپلای عمومی نمی‌فرستد.

---

## اگر چیزی کار نکرد

- کامنت می‌گذارید و هیچ لاگی نیست: اپ Live نیست، یا فیلد `comments` سابسکرایب نشده، یا HMAC با `IG_APP_SECRET` یکی نیست.
- لاگ هست ولی دایرکت نیست: `AUTOREPLY_ENABLED=false`، قانون کلیدواژه نمی‌خورد، یا کامنت مال خودتان است.
- خطای «outside of allowed window»: برای کامنت باید از **private reply** با `comment_id` استفاده شود (ReplyBird همین را می‌فرستد) و کامنت باید کمتر از ۷ روز باشد.
- دایرکت تکراری: نباید اتفاق بیفتد. `comment_id` قبل از ارسال در جدول قفل می‌شود.

صفحه ادمین → تب Events را نگاه کنید. همان‌جا علت skip یا error نوشته می‌شود.
