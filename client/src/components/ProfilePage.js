import React, { useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import UserInfo from './UserInfo';
import ChangePassword from './ChangePassword';
import MessagesPage from './MessagesPage';
import TicketsPage from './TicketsPage';
import MainNavbar from './MainNavbar';
import './ProfilePage.css';

const ProfilePage = () => {
    const history = useHistory();
    const location = useLocation();
    const needsComplete = new URLSearchParams(location.search).get('complete') === '1';
    const [activeTab, setActiveTab] = useState('userInfo');

    const handleLogout = () => {
        localStorage.removeItem('loggedInUser');
        history.push('/register');
    };

    const handleGenerateReminders = async () => {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!user) return;

        try {
            const res = await fetch(`/api/generate-reminders/${user.id}`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to generate reminders');
            alert('یادآورها با موفقیت تولید شدند.');
            setActiveTab('messages');
        } catch (error) {
            alert(error.message);
        }
    };

    const tabs = [
        { id: 'userInfo', label: 'اطلاعات' },
        { id: 'myChildren', label: 'کودکان من', href: '/my-children' },
        { id: 'messages', label: 'پیام‌ها' },
        { id: 'tickets', label: 'پشتیبانی' },
        { id: 'orders', label: 'سفارش‌ها', href: '/orders' },
        { id: 'changePassword', label: 'رمز عبور' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'userInfo':
                return <UserInfo />;
            case 'messages':
                return (
                    <div className="profile-messages-wrap">
                        <div className="profile-messages-actions">
                            <button type="button" onClick={handleGenerateReminders} className="generate-reminders-btn">
                                تولید یادآورها
                            </button>
                        </div>
                        <MessagesPage />
                    </div>
                );
            case 'tickets':
                return <TicketsPage />;
            case 'changePassword':
                return <ChangePassword />;
            default:
                return <UserInfo />;
        }
    };

    return (
        <div className="profile-page">
            <MainNavbar />
            <header className="profile-topbar">
                <div className="profile-topbar-text">
                    <p className="profile-topbar-kicker">حساب کاربری</p>
                    <h1>پروفایل</h1>
                </div>
                <button type="button" onClick={handleLogout} className="profile-logout-btn">
                    خروج
                </button>
            </header>

            {needsComplete && (
                <div className="profile-complete-banner" role="status">
                    لطفاً اطلاعات کاربری خود را تکمیل کنید تا تجربه بهتری داشته باشید.
                </div>
            )}

            <nav className="profile-tabs" aria-label="بخش‌های پروفایل">
                {tabs.map((tab) => (
                    tab.href ? (
                        <Link key={tab.id} to={tab.href} className="profile-tab">
                            {tab.label}
                        </Link>
                    ) : (
                        <button
                            key={tab.id}
                            type="button"
                            className={`profile-tab${activeTab === tab.id ? ' is-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    )
                ))}
            </nav>

            <main className="profile-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default ProfilePage;
