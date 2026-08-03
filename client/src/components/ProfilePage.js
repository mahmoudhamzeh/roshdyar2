import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import UserInfo from './UserInfo';
import ChangePassword from './ChangePassword';
import MessagesPage from './MessagesPage';
import MainNavbar from './MainNavbar';
import './ProfilePage.css';

const ProfilePage = () => {
    const history = useHistory();
    const [activeTab, setActiveTab] = useState('userInfo');

    const handleLogout = () => {
        localStorage.removeItem('loggedInUser');
        history.push('/login');
    };

    const handleGenerateReminders = async () => {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!user) return;

        try {
            const res = await fetch(`http://localhost:5000/api/generate-reminders/${user.id}`, {
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
        { id: 'messages', label: 'پیام‌ها' },
        { id: 'changePassword', label: 'رمز عبور' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'userInfo':
                return <UserInfo />;
            case 'messages':
                return <MessagesPage />;
            case 'changePassword':
                return <ChangePassword />;
            default:
                return <UserInfo />;
        }
    };

    return (
        <div className="profile-page">
            <MainNavbar />
            <nav className="page-nav-final">
                <button type="button" onClick={() => history.push('/dashboard')} className="back-btn">
                    &rarr; <span>خانه</span>
                </button>
                <h1>پروفایل</h1>
                <button type="button" onClick={handleLogout} className="logout-btn">خروج</button>
            </nav>
            <div className="profile-layout">
                <aside className="profile-sidebar" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={activeTab === tab.id ? 'active' : ''}
                        >
                            {tab.label}
                        </button>
                    ))}
                    <button type="button" onClick={handleGenerateReminders} className="generate-reminders-btn">
                        تولید یادآورها
                    </button>
                </aside>
                <main className="profile-content">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default ProfilePage;
