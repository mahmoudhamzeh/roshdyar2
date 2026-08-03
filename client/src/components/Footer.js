import React from 'react';
import BrandLogo from './BrandLogo';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <div className="footer-brand-row">
                        <BrandLogo size={40} alt="" />
                        <div>
                            <p className="footer-brand">تات کیدز</p>
                            <p className="footer-brand-en">TatKids</p>
                        </div>
                    </div>
                    <p className="footer-tagline">همراه هوشمند رشد و سلامت کودک شما</p>
                </div>
                <div className="footer-section">
                    <h4>دسترسی سریع</h4>
                    <ul>
                        <li><a href="/faq">سوالات متداول</a></li>
                        <li><a href="/terms">قوانین و مقررات</a></li>
                        <li><a href="/privacy">حریم خصوصی</a></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h4>تماس با ما</h4>
                    <p>تهران، خیابان نوآوری، پلاک ۱۲۳</p>
                    <p>۰۲۱-۱۲۳۴۵۶۷۸</p>
                </div>
            </div>
            <div className="footer-bottom">
                <p>تمامی حقوق برای تات کیدز (TatKids) محفوظ است. © ۱۴۰۴</p>
            </div>
        </footer>
    );
};

export default Footer;
