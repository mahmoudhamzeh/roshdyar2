import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import UserInfo from './UserInfo';
import ChangePassword from './ChangePassword';
import MessagesPage from './MessagesPage';
import Placeholder from './Placeholder';
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
            alert('یادآورها با موفقیت تولید شدند. لطفاً بخش پیام‌ها یا یادآورها را چک کنید.');
            setActiveTab('messages');
        } catch (error) {
            alert(error.message);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'userInfo':
                return <UserInfo />;
            case 'messages':
                return <MessagesPage />;
            case 'changePassword':
                return <ChangePassword />;
            case 'appointments':
                return <Placeholder title="نوبت‌های من" />;
            case 'consultations':
                return <Placeholder title="مشاوره‌های متنی" />;
            case 'support':
                return <Placeholder title="پشتیبانی" />;
            default:
                return <UserInfo />;
        }
    };

    return (
        <div className="profile-page">
            <nav className="page-nav-final">
                <button onClick={() => history.push('/dashboard')} className="back-btn">
                    &rarr; <span>صفحه اصلی</span>
                </button>
                <h1>پروفایل کاربری</h1>
                <div className="nav-placeholder"></div>
            </nav>
            <div className="profile-layout">
                <aside className="profile-sidebar">
                    <button onClick={() => setActiveTab('userInfo')} className={activeTab === 'userInfo' ? 'active' : ''}>اطلاعات کاربری</button>
                    <button onClick={() => setActiveTab('messages')} className={activeTab === 'messages' ? 'active' : ''}>پیام ها</button>
                    <button onClick={() => setActiveTab('appointments')} className={activeTab === 'appointments' ? 'active' : ''}>نوبت های من</button>
                    <button onClick={() => setActiveTab('consultations')} className={activeTab === 'consultations' ? 'active' : ''}>مشاوره های متنی</button>
                    <button onClick={() => setActiveTab('support')} className={activeTab === 'support' ? 'active' : ''}>پشتبانی</button>
                    <button onClick={() => setActiveTab('changePassword')} className={activeTab === 'changePassword' ? 'active' : ''}>تغییر رمز</button>
                    <button onClick={handleGenerateReminders} className="generate-reminders-btn">تولید یادآورها</button>
                    <button onClick={handleLogout} className="logout-btn">خروج از حساب</button>
                </aside>
                <main className="profile-content">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default ProfilePage;
