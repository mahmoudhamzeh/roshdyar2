/**
 * Child Growth module — age-banded content for «رشد کودک من».
 * Age bands align with common 0–72 month development ranges.
 * Educational guidance only — not medical diagnosis.
 */

import { formatAgeLabel, getAgeInMonths } from './age-guidance';

export { formatAgeLabel, getAgeInMonths };

export const MILESTONE_STATUS = {
    NOT_CHECKED: 'NOT_CHECKED',
    OBSERVED: 'OBSERVED',
    NOT_YET_OBSERVED: 'NOT_YET_OBSERVED',
    UNSURE: 'UNSURE',
};

export const DOMAINS = {
    LANGUAGE: { id: 'LANGUAGE', label: 'زبان', icon: '🗣' },
    SOCIAL: { id: 'SOCIAL', label: 'اجتماعی', icon: '❤️' },
    COGNITIVE: { id: 'COGNITIVE', label: 'شناخت', icon: '🧠' },
    MOTOR: { id: 'MOTOR', label: 'حرکتی', icon: '🏃' },
    INDEPENDENCE: { id: 'INDEPENDENCE', label: 'استقلال', icon: '✋' },
};

const BANDS = [
    {
        id: '0-2',
        minMonths: 0,
        maxMonths: 1,
        title: '۰ تا ۲ ماهگی',
        monthlyFocus: [
            { domain: 'SOCIAL', title: 'پیوند و آرامش', summary: 'تماس پوستی، لبخند و پاسخ به گریه' },
            { domain: 'MOTOR', title: 'حرکت اولیه', summary: 'زمان کوتاه روی شکم زیر نظارت' },
            { domain: 'LANGUAGE', title: 'شنیدن صدا', summary: 'حرف زدن آرام و آواز خواندن برای کودک' },
            { domain: 'COGNITIVE', title: 'تشخیص چهره', summary: 'نگاه کردن به چهره والد از فاصله نزدیک' },
        ],
        milestones: [
            { id: 'm0-eye', domain: 'SOCIAL', title: 'تماس چشمی کوتاه' },
            { id: 'm0-calm', domain: 'SOCIAL', title: 'آرام شدن با صدای والد' },
            { id: 'm0-lift', domain: 'MOTOR', title: 'بلند کردن مختصر سر روی شکم' },
            { id: 'm0-sound', domain: 'LANGUAGE', title: 'واکنش به صدای بلند' },
            { id: 'm0-track', domain: 'COGNITIVE', title: 'دنبال کردن شیء با چشم در محدوده نزدیک' },
            { id: 'm0-hands', domain: 'MOTOR', title: 'حرکت دست‌ها به سمت صورت' },
        ],
        activities: [
            {
                id: 'a0-face',
                title: 'بازی چهره به چهره',
                duration: 5,
                domains: ['SOCIAL', 'LANGUAGE'],
                goal: 'تقویت پیوند و توجه اجتماعی',
                materials: 'نیازی به وسیله نیست',
                instructions: [
                    'کودک را در فاصله امن روبروی خود بگیرید.',
                    'لبخند بزنید و با صدای آرام حرف بزنید.',
                    'وقتی به شما نگاه کرد، همان نگاه را ادامه دهید.',
                ],
                tip: 'اگر خسته شد، بازی را کوتاه کنید.',
                safety: 'گردن نوزاد را همیشه حمایت کنید.',
            },
            {
                id: 'a0-tummy',
                title: 'زمان کوتاه روی شکم',
                duration: 3,
                domains: ['MOTOR'],
                goal: 'تقویت گردن و شانه‌ها',
                materials: 'سطح سفت و تمیز',
                instructions: [
                    'در بیداری و زیر نظارت، کودک را روی شکم بگذارید.',
                    'صورت خود را نزدیک او قرار دهید تا تشویق شود سر را بالا بیاورد.',
                    'بعد از ۱–۳ دقیقه به پشت برگردانید.',
                ],
                tip: 'چند نوبت کوتاه در روز بهتر از یک نوبت طولانی است.',
                safety: 'هرگز روی شکم تنها نگذارید؛ فقط در بیداری و نظارت کامل.',
            },
        ],
        sleep: ['خواب ایمن: به پشت، سطح سفت، بدون بالش و اسباب نرم', 'پاسخ به نیازهای شبانه طبیعی است'],
        nutrition: ['تغذیه اصلی شیر مادر یا شیر خشک', 'معمولاً نیاز به آب اضافه نیست مگر توصیه پزشک'],
        behavior: ['گریه راه ارتباط است؛ پاسخ آرام حس امنیت می‌سازد'],
        safety: ['خواب مشترک ناایمن را اجتناب کنید', 'از دود و بخارات تند دور نگه دارید'],
    },
    {
        id: '2-6',
        minMonths: 2,
        maxMonths: 5,
        title: '۲ تا ۶ ماهگی',
        monthlyFocus: [
            { domain: 'SOCIAL', title: 'لبخند اجتماعی', summary: 'پاسخ به چهره و صدای آشنا' },
            { domain: 'MOTOR', title: 'کنترل سر و دست', summary: 'گرفتن اشیای ایمن و tummy time' },
            { domain: 'LANGUAGE', title: 'ققن و صداسازی', summary: 'تقلید صداهای ساده' },
            { domain: 'COGNITIVE', title: 'کشف محیط', summary: 'دنبال کردن اشیاء و کنجکاوی' },
        ],
        milestones: [
            { id: 'm2-smile', domain: 'SOCIAL', title: 'لبخند اجتماعی' },
            { id: 'm2-coo', domain: 'LANGUAGE', title: 'ققن و صداسازی' },
            { id: 'm2-reach', domain: 'MOTOR', title: 'دراز کردن دست به سمت اسباب‌بازی' },
            { id: 'm2-head', domain: 'MOTOR', title: 'نگه داشتن پایدارتر سر' },
            { id: 'm2-track', domain: 'COGNITIVE', title: 'دنبال کردن شیء متحرک' },
            { id: 'm2-laugh', domain: 'SOCIAL', title: 'خندیدن با بازی' },
            { id: 'm2-hands', domain: 'COGNITIVE', title: 'آوردن دست‌ها به خط وسط بدن' },
            { id: 'm2-turn', domain: 'LANGUAGE', title: 'چرخاندن سر به سمت صدا' },
        ],
        activities: [
            {
                id: 'a2-rattle',
                title: 'بازی جغجغه نرم',
                duration: 8,
                domains: ['MOTOR', 'COGNITIVE'],
                goal: 'تقویت رسیدن و توجه',
                materials: 'یک جغجغه سبک و ایمن',
                instructions: [
                    'جغجغه را در دید کودک تکان دهید.',
                    'صبر کنید تا دست دراز کند.',
                    'بعد از گرفتن، تشویق کلامی کنید.',
                ],
                tip: 'اگر علاقه‌ای نبود، رنگ یا صدای دیگری امتحان کنید.',
                safety: 'از اشیای کوچک که خطر بلع دارند استفاده نکنید.',
            },
            {
                id: 'a2-talk',
                title: 'گفت‌وگوی ققن',
                duration: 5,
                domains: ['LANGUAGE', 'SOCIAL'],
                goal: 'تقویت نوبت در ارتباط',
                materials: 'نیازی نیست',
                instructions: [
                    'وقتی کودک صدا درآورد، مکث کنید و پاسخ دهید.',
                    'صداهای او را با لحن شاد تکرار کنید.',
                    'این رفت‌وبرگشت را چند دور ادامه دهید.',
                ],
                tip: 'ارتباط چشمی مهم‌تر از کامل بودن کلمات است.',
                safety: 'محیط را آرام نگه دارید تا کودک خسته نشود.',
            },
        ],
        sleep: ['روال ساده قبل خواب (تغذیه، تاریکی ملایم، صدای آرام)', 'خواب ایمن به پشت را ادامه دهید'],
        nutrition: ['تا حدود ۶ ماهگی تغذیه اصلی شیر است', 'شروع غذای کمکی را با پزشک هماهنگ کنید'],
        behavior: ['نوسان خواب و گریه در جهش‌های رشدی شایع است'],
        safety: ['وسایل کوچک را از دسترس دور کنید', 'هرگز کودک را روی سطح بلند بدون نظارت نگذارید'],
    },
    {
        id: '6-12',
        minMonths: 6,
        maxMonths: 11,
        title: '۶ تا ۱۲ ماهگی',
        monthlyFocus: [
            { domain: 'MOTOR', title: 'نشستن و خزیدن', summary: 'حرکت مستقل در فضای ایمن' },
            { domain: 'LANGUAGE', title: 'کلمات اولیه', summary: 'نام‌بردن اشیاء و پاسخ به اسم' },
            { domain: 'COGNITIVE', title: 'کشف علت و معلول', summary: 'بازی پنهان‌کردن و پیدا کردن' },
            { domain: 'SOCIAL', title: 'اضطراب جدایی', summary: 'آرامش‌بخشی و روال خداحافظی کوتاه' },
        ],
        milestones: [
            { id: 'm6-sit', domain: 'MOTOR', title: 'نشستن با کمک یا بدون کمک' },
            { id: 'm6-crawl', domain: 'MOTOR', title: 'خزیدن یا جابه‌جایی' },
            { id: 'm6-name', domain: 'LANGUAGE', title: 'واکنش به اسم خود' },
            { id: 'm6-baba', domain: 'LANGUAGE', title: 'گفتن صداهای شبیه ماما/بابا' },
            { id: 'm6-pincer', domain: 'MOTOR', title: 'گرفتن با انگشت شست و اشاره' },
            { id: 'm6-find', domain: 'COGNITIVE', title: 'پیدا کردن شیء نیمه‌پنهان' },
            { id: 'm6-wave', domain: 'SOCIAL', title: 'دست تکان دادن یا بازی دالی' },
            { id: 'm6-feed', domain: 'INDEPENDENCE', title: 'گرفتن غذا با دست' },
        ],
        activities: [
            {
                id: 'a6-peek',
                title: 'بازی دالی‌موشه',
                duration: 5,
                domains: ['SOCIAL', 'COGNITIVE'],
                goal: 'درک حضور مداوم والد',
                materials: 'یک پارچه نرم',
                instructions: [
                    'صورت خود را با پارچه بپوشانید.',
                    'بگویید «کجا رفت؟» و دوباره ظاهر شوید.',
                    'با خنده و تشویق بازی را تکرار کنید.',
                ],
                tip: 'اگر کودک مضطرب شد، سریع‌تر ظاهر شوید.',
                safety: 'پارچه را روی صورت کودک نگه ندارید.',
            },
            {
                id: 'a6-name',
                title: 'نام‌بردن اشیاء روزانه',
                duration: 10,
                domains: ['LANGUAGE'],
                goal: 'گسترش درک واژه‌ها',
                materials: 'وسایل روزمره ایمن',
                instructions: [
                    'هر وسیله‌ای که نشان می‌دهید نامش را بگویید.',
                    'صبر کنید تا کودک اشاره یا صدا کند.',
                    'واژه را دوباره تکرار کنید.',
                ],
                tip: 'روزانه چند واژه کافی است؛ عجله نکنید.',
                safety: 'وسایل تیز یا شکستنی را کنار بگذارید.',
            },
        ],
        sleep: ['روال ثابت خواب کمک‌کننده است', 'بیداری‌های شبانه ممکن است با دندان‌درآوردن بیشتر شود'],
        nutrition: ['شروع غذای کمکی با بافت نرم', 'ادامه شیر کنار غذای کمکی'],
        behavior: ['اضطراب جدایی طبیعی است؛ خداحافظی کوتاه و مطمئن کمک می‌کند'],
        safety: ['خانه را برای خزیدن ایمن کنید', 'مواد شوینده و داروها را قفل کنید'],
    },
    {
        id: '12-24',
        minMonths: 12,
        maxMonths: 23,
        title: '۱ تا ۲ سالگی',
        monthlyFocus: [
            { domain: 'MOTOR', title: 'راه رفتن و تعادل', summary: 'تمرین راه رفتن و بالا رفتن ایمن' },
            { domain: 'LANGUAGE', title: 'کلمات و اشاره', summary: 'درخواست با کلمه یا اشاره' },
            { domain: 'INDEPENDENCE', title: 'خودم می‌خواهم', summary: 'انتخاب‌های کوچک و مشارکت' },
            { domain: 'COGNITIVE', title: 'بازی وانمودی', summary: 'خوراک‌دادن به عروسک و نقش‌بازی ساده' },
        ],
        milestones: [
            { id: 'm12-walk', domain: 'MOTOR', title: 'چند قدم راه رفتن مستقل' },
            { id: 'm12-words', domain: 'LANGUAGE', title: 'چند کلمه معنی‌دار' },
            { id: 'm12-point', domain: 'LANGUAGE', title: 'اشاره برای نشان دادن خواسته' },
            { id: 'm12-stack', domain: 'COGNITIVE', title: 'چیدن ۲–۳ مکعب روی هم' },
            { id: 'm12-pretend', domain: 'COGNITIVE', title: 'بازی وانمودی ساده' },
            { id: 'm12-spoon', domain: 'INDEPENDENCE', title: 'تلاش برای غذا خوردن با قاشق' },
            { id: 'm12-follow', domain: 'LANGUAGE', title: 'اجرای دستور ساده یک‌مرحله‌ای' },
            { id: 'm12-play', domain: 'SOCIAL', title: 'بازی کنار کودک دیگر' },
        ],
        activities: [
            {
                id: 'a12-ball',
                title: 'توپ‌بازی نشسته یا ایستاده',
                duration: 10,
                domains: ['MOTOR', 'SOCIAL'],
                goal: 'تعادل و نوبت‌گیری',
                materials: 'یک توپ نرم بزرگ',
                instructions: [
                    'توپ را به آرامی به سمت کودک بغلتانید.',
                    'از او بخواهید برگرداند.',
                    'هر موفقیت را تشویق کنید.',
                ],
                tip: 'فاصله را کوتاه شروع کنید.',
                safety: 'فضای بدون گوشه تیز انتخاب کنید.',
            },
            {
                id: 'a12-book',
                title: 'کتاب تصویری کوتاه',
                duration: 5,
                domains: ['LANGUAGE', 'COGNITIVE'],
                goal: 'توجه مشترک و واژه‌آموزی',
                materials: 'کتاب ضخیم تصویری',
                instructions: [
                    'صفحه را باز کنید و یک تصویر را نام ببرید.',
                    'از کودک بخواهید اشاره کند.',
                    'داستان را خیلی کوتاه نگه دارید.',
                ],
                tip: 'اگر صفحه را بست، او را دنبال کنید و بعداً برگردید.',
                safety: 'کتاب‌های خیلی کوچک یا پاره را کنار بگذارید.',
            },
        ],
        sleep: ['روال ثابت قبل خواب (قصه، مسواک، تاریکی)', 'خواب روزانه هنوز برای بسیاری لازم است'],
        nutrition: ['غذای خانواده با بافت مناسب', 'میان‌وعده سالم به‌جای تنقلات شیرین'],
        behavior: ['نه گفتن و استقلال طبیعی است؛ انتخاب محدود بدهید'],
        safety: ['پله و پنجره را ایمن کنید', 'خطر خفگی با اشیای کوچک را جدی بگیرید'],
    },
    {
        id: '24-36',
        minMonths: 24,
        maxMonths: 35,
        title: '۲ تا ۳ سالگی',
        monthlyFocus: [
            { domain: 'LANGUAGE', title: 'جمله‌سازی', summary: 'جمله‌های کوتاه و پرسیدن سؤال' },
            { domain: 'SOCIAL', title: 'احساسات و نوبت', summary: 'نام‌گذاری هیجان و بازی مشترک' },
            { domain: 'INDEPENDENCE', title: 'کارهای روزمره', summary: 'لباس، شستن دست، جمع کردن اسباب' },
            { domain: 'MOTOR', title: 'دویدن و پریدن', summary: 'بازی حرکتی در فضای امن' },
        ],
        milestones: [
            { id: 'm24-sentences', domain: 'LANGUAGE', title: 'جمله‌های ۲–۳ کلمه‌ای' },
            { id: 'm24-jump', domain: 'MOTOR', title: 'پریدن با دو پا' },
            { id: 'm24-run', domain: 'MOTOR', title: 'دویدن بدون افتادن مکرر' },
            { id: 'm24-play', domain: 'SOCIAL', title: 'بازی موازی یا کوتاه با همسالان' },
            { id: 'm24-emotion', domain: 'SOCIAL', title: 'نشان دادن هیجان با کلمه یا اشاره' },
            { id: 'm24-sort', domain: 'COGNITIVE', title: 'جدا کردن رنگ یا شکل ساده' },
            { id: 'm24-dress', domain: 'INDEPENDENCE', title: 'کمک در پوشیدن لباس' },
            { id: 'm24-scribble', domain: 'COGNITIVE', title: 'خط‌خطی کردن با مدادشمعی' },
        ],
        activities: [
            {
                id: 'a24-color',
                title: 'بازی پیدا کردن رنگ‌ها',
                duration: 10,
                domains: ['LANGUAGE', 'COGNITIVE'],
                goal: 'تقویت زبان و شناخت',
                materials: '۳ وسیله رنگی',
                instructions: [
                    'سه وسیله را مقابل کودک قرار دهید.',
                    'یک رنگ را نام ببرید.',
                    'از کودک بخواهید آن را پیدا کند.',
                    'سپس از او بخواهید رنگ را نام ببرد.',
                ],
                tip: 'اگر علاقه نداشت، بازی را کوتاه‌تر کنید.',
                safety: 'از اشیای کوچک که خطر بلع دارند استفاده نکنید.',
            },
            {
                id: 'a24-story',
                title: 'داستان سه‌تصویری',
                duration: 5,
                domains: ['LANGUAGE', 'SOCIAL'],
                goal: 'روایت و نوبت گفت‌وگو',
                materials: '۳ کارت یا عکس',
                instructions: [
                    'تصاویر را به ترتیب نشان دهید.',
                    'از کودک بپرسید «بعدش چی شد؟»',
                    'پاسخ او را گسترش دهید.',
                ],
                tip: 'پاسخ‌های خیالی را هم تشویق کنید.',
                safety: 'کارت‌ها را از دسترس دهان کودک دور نگه دارید اگر خیلی کوچک‌اند.',
            },
        ],
        sleep: ['خواب شبانه منظم و روال آرام قبل خواب', 'کاهش صفحه نمایش نزدیک خواب'],
        nutrition: ['وعده خانوادگی منظم', 'تنوع غذایی بدون اجبار'],
        behavior: ['قشقرق شایع است؛ آرامش والد و مرز ثابت کمک می‌کند'],
        safety: ['پنجره، بالکن و مواد شوینده را دوباره ایمن‌سازی کنید'],
    },
    {
        id: '36-48',
        minMonths: 36,
        maxMonths: 47,
        title: '۳ تا ۴ سالگی',
        monthlyFocus: [
            { domain: 'LANGUAGE', title: 'گفت‌وگوی دوطرفه', summary: 'پرسیدن سؤال و تعریف تجربه' },
            { domain: 'SOCIAL', title: 'نوبت و دوستی', summary: 'بازی با دیگران و رعایت نوبت' },
            { domain: 'INDEPENDENCE', title: 'لباس پوشیدن', summary: 'تمرین پوشیدن و درآوردن لباس' },
            { domain: 'COGNITIVE', title: 'حل مسئله', summary: 'پازل ساده و بازی‌های فکری کوتاه' },
        ],
        milestones: [
            { id: 'm36-conversation', domain: 'LANGUAGE', title: 'گفت‌وگوی رفت‌وبرگشتی' },
            { id: 'm36-question', domain: 'LANGUAGE', title: 'پرسیدن سؤال' },
            { id: 'm36-run', domain: 'MOTOR', title: 'دویدن روان' },
            { id: 'm36-jump', domain: 'MOTOR', title: 'پریدن و حفظ تعادل کوتاه' },
            { id: 'm36-problem', domain: 'COGNITIVE', title: 'حل مسئله ساده' },
            { id: 'm36-play', domain: 'SOCIAL', title: 'بازی با دیگران' },
            { id: 'm36-dress', domain: 'INDEPENDENCE', title: 'پوشیدن بخشی از لباس به‌تنهایی' },
            { id: 'm36-count', domain: 'COGNITIVE', title: 'شمارش ساده تا چند عدد' },
            { id: 'm36-share', domain: 'SOCIAL', title: 'تلاش برای شریک شدن اسباب‌بازی' },
            { id: 'm36-story', domain: 'LANGUAGE', title: 'تعریف کوتاه یک اتفاق' },
        ],
        activities: [
            {
                id: 'a36-color',
                title: 'بازی پیدا کردن رنگ‌ها',
                duration: 10,
                domains: ['LANGUAGE', 'COGNITIVE'],
                goal: 'تقویت زبان و شناخت',
                materials: '۳ وسیله رنگی',
                instructions: [
                    'سه وسیله را مقابل کودک قرار دهید.',
                    'یک رنگ را نام ببرید.',
                    'از کودک بخواهید آن را پیدا کند.',
                    'سپس از او بخواهید رنگ را نام ببرد.',
                ],
                tip: 'اگر کودک علاقه نداشت، بازی را کوتاه‌تر کنید.',
                safety: 'از اشیای کوچک که خطر بلع دارند استفاده نکنید.',
            },
            {
                id: 'a36-story',
                title: 'داستان تصویری',
                duration: 5,
                domains: ['LANGUAGE'],
                goal: 'گسترش واژگان و روایت',
                materials: 'یک کتاب تصویری',
                instructions: [
                    'صفحه را با هم ببینید.',
                    'بپرسید شخصیت چه احساسی دارد.',
                    'از کودک بخواهید ادامه داستان را بگوید.',
                ],
                tip: 'اشتباه تلفظ را بلافاصله اصلاح سخت نکنید؛ مدل درست را تکرار کنید.',
                safety: 'زمان صفحه نمایش را جایگزین این بازی نکنید.',
            },
            {
                id: 'a36-ball',
                title: 'توپ‌بازی',
                duration: 10,
                domains: ['MOTOR'],
                goal: 'هماهنگی و حرکت',
                materials: 'توپ سبک',
                instructions: [
                    'توپ را به سمت هم پرتاب یا شوت کنید.',
                    'قوانین ساده مثل نوبت را بگویید.',
                    'بعد از چند دقیقه بازی آزاد بگذارید.',
                ],
                tip: 'در فضای باز یا اتاق خلوت بازی کنید.',
                safety: 'از توپ خیلی سفت استفاده نکنید.',
            },
        ],
        sleep: ['روال: آماده شدن، قصه، کاهش محرک‌ها، خواب', 'خواب کافی شبانه برای خلق و تمرکز مهم است'],
        nutrition: ['تنوع غذایی و عادت نوشیدن آب', 'رفتار آرام هنگام غذا بدون اجبار'],
        behavior: ['استقلال و گاهی لجبازی طبیعی است؛ انتخاب محدود کمک می‌کند'],
        safety: ['ایمنی خودرو، خیابان و داروها را مرور کنید'],
    },
    {
        id: '48-60',
        minMonths: 48,
        maxMonths: 59,
        title: '۴ تا ۵ سالگی',
        monthlyFocus: [
            { domain: 'COGNITIVE', title: 'آمادگی یادگیری', summary: 'قصه، شمارش و توجه طولانی‌تر' },
            { domain: 'SOCIAL', title: 'دوستی و همدلی', summary: 'بازی گروهی و درک احساس دیگران' },
            { domain: 'LANGUAGE', title: 'داستان‌گویی', summary: 'تعریف رویداد با جزئیات بیشتر' },
            { domain: 'MOTOR', title: 'مهارت ظریف', summary: 'قیچی ایمن، نقاشی و ساختنی' },
        ],
        milestones: [
            { id: 'm48-story', domain: 'LANGUAGE', title: 'تعریف داستان با ابتدا و انتها' },
            { id: 'm48-friend', domain: 'SOCIAL', title: 'بازی مشارکتی با دوست' },
            { id: 'm48-draw', domain: 'COGNITIVE', title: 'کشیدن شکل‌های قابل تشخیص' },
            { id: 'm48-balance', domain: 'MOTOR', title: 'ایستادن روی یک پا برای چند ثانیه' },
            { id: 'm48-help', domain: 'INDEPENDENCE', title: 'کمک در کارهای ساده خانه' },
            { id: 'm48-rules', domain: 'SOCIAL', title: 'رعایت قانون ساده بازی' },
            { id: 'm48-letters', domain: 'COGNITIVE', title: 'تشخیص بعضی حروف یا اعداد' },
            { id: 'm48-scissors', domain: 'MOTOR', title: 'بریدن کاغذ با قیچی کودکانه تحت نظارت' },
        ],
        activities: [
            {
                id: 'a48-puzzle',
                title: 'پازل ساده',
                duration: 10,
                domains: ['COGNITIVE', 'MOTOR'],
                goal: 'حل مسئله و پشتکار',
                materials: 'پازل ۴ تا ۱۲ تکه',
                instructions: [
                    'گوشه‌ها را با هم پیدا کنید.',
                    'از کودک بخواهید یک تکه را امتحان کند.',
                    'در صورت گیر کردن راهنمایی کوتاه بدهید نه حل کامل.',
                ],
                tip: 'موفقیت تلاش را بیشتر از سرعت تشویق کنید.',
                safety: 'قطعه‌های خیلی کوچک برای سن پایین‌تر مناسب نیست.',
            },
            {
                id: 'a48-role',
                title: 'بازی نقش‌آفرینی مغازه',
                duration: 15,
                domains: ['SOCIAL', 'LANGUAGE'],
                goal: 'گفت‌وگو و همدلی',
                materials: 'چند وسیله خانگی به‌عنوان کالا',
                instructions: [
                    'نقش فروشنده و خریدار را عوض کنید.',
                    'از کودک بخواهید قیمت یا خواسته‌اش را بگوید.',
                    'یک موقعیت کوچک مشکل (مثلاً کالا تمام شده) بسازید.',
                ],
                tip: 'اجازه دهید قوانین بازی را کمی خودش بسازد.',
                safety: 'پول واقعی یا اشیای شکستنی وارد بازی نکنید.',
            },
        ],
        sleep: ['خواب شبانه منظم؛ کاهش محرک قبل خواب', 'اگر خواب روزانه کم شد، ساعت خواب شب را جلو بیاورید'],
        nutrition: ['صبحانه منظم', 'میان‌وعده سالم و آب به‌جای نوشیدنی شیرین'],
        behavior: ['ترس‌های خیالی ممکن است ظاهر شوند؛ گوش دادن مهم‌تر از انکار ترس است'],
        safety: ['ایمنی بیرون از خانه، دوچرخه و خیابان را تمرین کنید'],
    },
    {
        id: '60-72',
        minMonths: 60,
        maxMonths: 72,
        title: '۵ تا ۶ سالگی',
        monthlyFocus: [
            { domain: 'COGNITIVE', title: 'تمرکز و مسئولیت', summary: 'روال‌های کوتاه یادگیری و انجام کار' },
            { domain: 'SOCIAL', title: 'مهارت مدرسه', summary: 'همکاری، صبر و حل اختلاف ساده' },
            { domain: 'LANGUAGE', title: 'بیان احساس و نظر', summary: 'صحبت درباره روز و نگرانی‌ها' },
            { domain: 'MOTOR', title: 'هماهنگی بدنی', summary: 'بازی ورزشی سبک و مهارت ظریف' },
        ],
        milestones: [
            { id: 'm60-listen', domain: 'LANGUAGE', title: 'گوش دادن به دستور چندمرحله‌ای ساده' },
            { id: 'm60-write', domain: 'COGNITIVE', title: 'نوشتن بعضی حروف یا اسم' },
            { id: 'm60-coop', domain: 'SOCIAL', title: 'همکاری در بازی گروهی' },
            { id: 'm60-hop', domain: 'MOTOR', title: 'لی‌لی یا پرش متناوب' },
            { id: 'm60-routine', domain: 'INDEPENDENCE', title: 'انجام روال صبحگاهی با یادآوری کم' },
            { id: 'm60-emotion', domain: 'SOCIAL', title: 'نام بردن احساس و دلیل تقریبی آن' },
            { id: 'm60-count', domain: 'COGNITIVE', title: 'شمارش و مقایسه ساده' },
            { id: 'm60-sport', domain: 'MOTOR', title: 'پرتاب و گرفتن توپ با دقت بیشتر' },
        ],
        activities: [
            {
                id: 'a60-day',
                title: 'مرور روز با سه جمله',
                duration: 8,
                domains: ['LANGUAGE', 'SOCIAL'],
                goal: 'بیان تجربه و احساس',
                materials: 'نیازی نیست',
                instructions: [
                    'بپرسید امروز چه چیزی خوب بود.',
                    'بپرسید چه چیزی سخت بود.',
                    'با هم یک کار کوچک برای فردا انتخاب کنید.',
                ],
                tip: 'قضاوت نکنید؛ اول گوش دهید.',
                safety: 'اگر نگرانی جدی مطرح شد، با آرامش پیگیری کنید و در صورت نیاز با متخصص مشورت کنید.',
            },
            {
                id: 'a60-obstacle',
                title: 'مسیر حرکتی خانگی',
                duration: 10,
                domains: ['MOTOR', 'COGNITIVE'],
                goal: 'هماهنگی و دنبال کردن ترتیب',
                materials: 'بالش و وسایل نرم',
                instructions: [
                    'یک مسیر ساده بسازید: بپر، راه برو، تعادل.',
                    'ترتیب را با هم بگویید.',
                    'از کودک بخواهید یک ایستگاه جدید اضافه کند.',
                ],
                tip: 'مسابقه سرعت نگذارید؛ تمرکز روی انجام درست باشد.',
                safety: 'سطوح لغزنده و گوشه‌های تیز را حذف کنید.',
            },
        ],
        sleep: ['خواب کافی برای تمرکز مدرسه حیاتی است', 'موبایل/تبلت را از اتاق خواب دور کنید'],
        nutrition: ['وعده صبحانه قبل از مهد/مدرسه', 'میان‌وعده آماده از خانه'],
        behavior: ['اضطراب جدایی یا مدرسه را جدی اما آرام پیگیری کنید'],
        safety: ['قوانین خیابان و صحبت با غریبه را مرور کنید'],
    },
];

export const getGrowthBandForAge = (ageInMonths) => {
    const months = Math.max(0, Number(ageInMonths) || 0);
    if (months > 72) {
        return BANDS[BANDS.length - 1];
    }
    return BANDS.find((b) => months >= b.minMonths && months <= b.maxMonths) || BANDS[0];
};

export const getCorrectedAgeMonths = (child) => {
    const chronological = getAgeInMonths(child?.birthDate);
    const gestational = Number(child?.gestationalAge);
    if (!gestational || gestational >= 37) {
        return { chronological, corrected: chronological, isPremature: false };
    }
    const adjustment = Math.max(0, 40 - gestational);
    // Corrected age is mainly used in early years; keep simple and transparent in UI.
    const corrected = Math.max(0, chronological - adjustment);
    return { chronological, corrected, isPremature: true, adjustmentWeeks: adjustment };
};

export const getMilestoneStorageKey = (childId) => `child-growth-milestones:${childId}`;

export const loadMilestoneStatuses = (childId) => {
    try {
        const raw = localStorage.getItem(getMilestoneStorageKey(childId));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export const saveMilestoneStatus = (childId, milestoneId, status) => {
    const current = loadMilestoneStatuses(childId);
    current[milestoneId] = {
        status,
        updatedAt: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(getMilestoneStorageKey(childId), JSON.stringify(current));
    return current;
};

export const getActivityCompletionKey = (childId) => `child-growth-activities:${childId}`;

export const loadActivityCompletions = (childId) => {
    try {
        const raw = localStorage.getItem(getActivityCompletionKey(childId));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export const saveActivityCompletion = (childId, activityId, payload) => {
    const current = loadActivityCompletions(childId);
    current[activityId] = {
        completed: true,
        duration: payload?.duration ?? null,
        completedAt: new Date().toISOString(),
    };
    localStorage.setItem(getActivityCompletionKey(childId), JSON.stringify(current));
    return current;
};

export const formatRelativeMeasurementDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(String(dateStr).replace(/\//g, '-'));
    if (Number.isNaN(date.getTime())) return String(dateStr);
    const diffDays = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'امروز';
    if (diffDays === 1) return 'دیروز';
    if (diffDays < 7) return `${diffDays} روز پیش`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} هفته پیش`;
    return `${Math.floor(diffDays / 30)} ماه پیش`;
};
