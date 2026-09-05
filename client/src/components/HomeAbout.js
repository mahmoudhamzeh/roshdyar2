import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBookOpen,
    faChartLine,
    faSeedling,
    faStore,
    faSyringe,
    faUserMd
} from '@fortawesome/free-solid-svg-icons';
import BrandLogo from './BrandLogo';
import { isLoggedIn } from '../api';
import './HomeAbout.css';

const FEATURES = [
    {
        icon: faSeedling,
        title: 'رشد کودک',
        text: 'وضعیت رشد، راهنمای سنی و دستیار را برای کودک خود ببینید.',
        tone: 'mint'
    },
    {
        icon: faChartLine,
        title: 'نمودار رشد',
        text: 'قد، وزن و دور سر را ثبت کنید و با منحنی استاندارد مقایسه کنید.',
        tone: 'amber'
    },
    {
        icon: faSyringe,
        title: 'واکسیناسیون',
        text: 'تقویم واکسن و یادآوری نوبت‌ها همیشه دم دستتان باشد.',
        tone: 'teal'
    },
    {
        icon: faBookOpen,
        title: 'مجله سلامت',
        text: 'مقاله و ویدیو آموزشی را بدون ورود بخوانید.',
        tone: 'mint'
    },
    {
        icon: faStore,
        title: 'فروشگاه',
        text: 'کالای رشدی را ببینید؛ برای ثبت سفارش وارد شوید.',
        tone: 'teal'
    },
    {
        icon: faUserMd,
        title: 'مشاوره',
        text: 'مشاوره متخصص و روانشناسی به‌زودی فعال می‌شود.',
        tone: 'amber'
    }
];

const HomeAbout = () => {
    const signedIn = isLoggedIn();

    return (
        <section className="home-about" id="about" aria-labelledby="home-about-title">
            <div className="home-about-glow" aria-hidden="true" />
            <div className="home-about-inner">
                <div className="home-about-intro">
                    <div className="home-about-brand">
                        <BrandLogo size={56} alt="" />
                        <span>درباره تات کیدز</span>
                    </div>
                    <h2 id="home-about-title">همراه رشد و سلامت کودک شما</h2>
                    <p>
                        تات کیدز جای والدین است برای دیدن مسیر رشد، واکسن، آموزش و خرید کالای مناسب سن کودک.
                        فروشگاه و مجله برای همه باز است؛ سرویس‌های شخصی بعد از ورود فعال می‌شوند.
                    </p>
                    <div className="home-about-actions">
                        {signedIn ? (
                            <Link to="/my-children" className="home-about-btn home-about-btn-primary">
                                سرویس‌های من
                            </Link>
                        ) : (
                            <Link to="/register" className="home-about-btn home-about-btn-primary">
                                ورود و شروع سرویس
                            </Link>
                        )}
                        <Link to="/shop" className="home-about-btn home-about-btn-ghost">مشاهده فروشگاه</Link>
                        <Link to="/news" className="home-about-btn home-about-btn-ghost">خواندن مجله</Link>
                    </div>
                </div>
                <ul className="home-about-grid">
                    {FEATURES.map((item) => (
                        <li key={item.title} className={`home-about-card is-${item.tone}`}>
                            <span className="home-about-icon" aria-hidden="true">
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default HomeAbout;
