import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <p className="footer-brand">رشدیار</p>
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
                <p>تمامی حقوق برای رشدیار محفوظ است. © ۱۴۰۴</p>
            </div>
        </footer>
    );
};

export default Footer;
