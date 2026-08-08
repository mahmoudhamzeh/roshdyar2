import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('loggedInUser'));
                const response = await fetch('/api/admin/stats', {
                    headers: {
                        'x-user-id': user.id
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch stats');
                }
                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <p>در حال بارگذاری آمار...</p>;
    if (error) return <p>خطا در دریافت آمار: {error}</p>;

    return (
        <div className="admin-dashboard">
            <h2>داشبورد</h2>
            <div className="stats-container">
                <div className="stat-card">
                    <h3>کاربران کل</h3>
                    <p>{stats.totalUsers}</p>
                </div>
                <div className="stat-card">
                    <h3>کودکان کل</h3>
                    <p>{stats.totalChildren}</p>
                </div>
                <div className="stat-card">
                    <h3>مقالات</h3>
                    <p>{stats.totalArticles}</p>
                </div>
                <div className="stat-card">
                    <h3>تیکت‌های باز</h3>
                    <p>{stats.openTickets} / {stats.totalTickets}</p>
                </div>
                <div className="stat-card">
                    <h3>محصولات فروشگاه</h3>
                    <p>{stats.totalProducts ?? 0}</p>
                </div>
                <div className="stat-card">
                    <h3>سفارش‌های در انتظار</h3>
                    <p>{stats.pendingOrders ?? 0} / {stats.totalOrders ?? 0}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
