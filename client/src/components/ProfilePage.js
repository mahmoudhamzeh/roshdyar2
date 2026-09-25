import React, { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import Modal from 'react-modal';
import UserInfo from './UserInfo';
import ChangePassword from './ChangePassword';
import MessagesPage from './MessagesPage';
import TicketsPage from './TicketsPage';
import MainNavbar from './MainNavbar';
import { clearAuthSession } from '../api';
import { getChildDisplayName } from '../utils/childName';
import './ProfilePage.css';

Modal.setAppElement('#root');

const PROFILE_TABS = ['userInfo', 'messages', 'tickets', 'changePassword'];

const ProfilePage = () => {
    const history = useHistory();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const needsComplete = searchParams.get('complete') === '1';
    const nextPath = searchParams.get('next') || '';
    const requestedTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(
        PROFILE_TABS.includes(requestedTab) ? requestedTab : 'userInfo'
    );

    useEffect(() => {
        if (PROFILE_TABS.includes(requestedTab)) {
            setActiveTab(requestedTab);
        }
    }, [requestedTab]);
    const [childrenOpen, setChildrenOpen] = useState(false);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState('');
    const [childrenError, setChildrenError] = useState('');

    const [openReminderForm, setOpenReminderForm] = useState(false);

    const handleLogout = () => {
        clearAuthSession();
        history.push('/register');
    };

    const handleRegisterReminder = () => {
        setOpenReminderForm(true);
        setActiveTab('messages');
    };

    const openChildrenPicker = async () => {
        setChildrenError('');
        try {
            const res = await fetch('/api/children');
            if (!res.ok) throw new Error('بارگذاری کودکان ناموفق بود');
            const data = await res.json();
            if (!data.length) {
                history.push('/add-child');
                return;
            }
            setChildren(data);
            setSelectedChild('');
            setChildrenOpen(true);
        } catch (err) {
            setChildrenError(err.message);
            setChildrenOpen(true);
        }
    };

    const goToChildrenPage = () => {
        setChildrenOpen(false);
        history.push(selectedChild ? `/health-profile/${selectedChild}` : '/my-children');
    };

    const tabs = [
        { id: 'userInfo', label: 'اطلاعات' },
        { id: 'myChildren', label: 'کودکان من', onClick: openChildrenPicker },
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
                            <button type="button" onClick={handleRegisterReminder} className="generate-reminders-btn">
                                ثبت یادآوری
                            </button>
                            <Link to="/reminders" className="generate-reminders-btn is-soft">
                                تقویم یادآوری‌ها
                            </Link>
                        </div>
                        <MessagesPage startOnReminders={openReminderForm} openForm={openReminderForm} />
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
            <p className="profile-corner-kicker">حساب کاربری</p>
            <header className="profile-topbar">
                <h1>پروفایل</h1>
            </header>

            {needsComplete && (
                <div className="profile-complete-banner" role="status">
                    {nextPath.includes('/cart') || nextPath.includes('/checkout')
                        ? 'برای ثبت سفارش، نام و نام خانوادگی را در پروفایل تکمیل کنید.'
                        : 'لطفاً اطلاعات کاربری خود را تکمیل کنید تا تجربه بهتری داشته باشید.'}
                </div>
            )}

            <nav className="profile-tabs" aria-label="بخش‌های پروفایل">
                <p className="profile-tabs-title">منوی حساب</p>
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
                            onClick={() => (tab.onClick ? tab.onClick() : setActiveTab(tab.id))}
                        >
                            {tab.label}
                        </button>
                    )
                ))}
                <button type="button" className="profile-tab profile-tab-logout" onClick={handleLogout}>
                    خروج
                </button>
            </nav>

            <main className="profile-content">
                {renderContent()}
            </main>

            <Modal
                isOpen={childrenOpen}
                onRequestClose={() => setChildrenOpen(false)}
                contentLabel="انتخاب کودک"
                className="profile-child-modal"
                overlayClassName="profile-child-overlay"
            >
                <h2>انتخاب کودک</h2>
                <p className="profile-child-lead">کودک را انتخاب کنید یا به فهرست کودکان من بروید.</p>
                {childrenError && <p className="profile-alert profile-alert-error">{childrenError}</p>}
                <div className="profile-child-list">
                    {children.map((child) => (
                        <button
                            key={child.id}
                            type="button"
                            className={`profile-child-item${String(selectedChild) === String(child.id) ? ' is-selected' : ''}`}
                            onClick={() => setSelectedChild(child.id)}
                        >
                            {getChildDisplayName(child)}
                        </button>
                    ))}
                </div>
                <div className="profile-child-actions">
                    <button type="button" className="user-info-save-btn" onClick={goToChildrenPage}>
                        {selectedChild ? 'مشاهده پرونده کودک' : 'رفتن به کودکان من'}
                    </button>
                    <button type="button" className="profile-child-cancel" onClick={() => setChildrenOpen(false)}>
                        انصراف
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ProfilePage;
