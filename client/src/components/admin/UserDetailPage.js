import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './UserDetailPage.css';

const UserDetailPage = () => {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));

                // Fetch user details
                const userResponse = await fetch(`http://localhost:5000/api/users/${userId}`);
                if (!userResponse.ok) throw new Error('Failed to fetch user details');
                const userData = await userResponse.json();
                setUser(userData);

                // Fetch user's children
                const childrenResponse = await fetch(`http://localhost:5000/api/admin/users/${userId}/children`, {
                    headers: { 'x-user-id': adminUser.id }
                });
                if (!childrenResponse.ok) throw new Error("Failed to fetch user's children");
                const childrenData = await childrenResponse.json();
                setChildren(childrenData);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (loading) return <p>در حال بارگذاری اطلاعات کاربر...</p>;
    if (error) return <p>خطا: {error}</p>;
    if (!user) return <p>کاربر یافت نشد.</p>;

    return (
        <div className="user-detail-page">
            <h2>جزئیات کاربر: {user.username}</h2>
            <div className="user-info-card">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>ایمیل:</strong> {user.email}</p>
                <p><strong>ادمین:</strong> {user.isAdmin ? 'بله' : 'خیر'}</p>
            </div>

            <h3>فرزندان ثبت‌شده</h3>
            <div className="children-list">
                {children.length > 0 ? (
                    children.map(child => (
                        <div key={child.id} className="child-card">
                            <img src={child.avatar.startsWith('http') ? child.avatar : `http://localhost:5000${child.avatar}`} alt={child.name || `${child.firstName || ''} ${child.lastName || ''}`.trim()} />
                            <p>{child.name || `${child.firstName || ''} ${child.lastName || ''}`.trim()}</p>
                            <Link to={`/health-profile/${child.id}`} className="btn-view-profile">
                                مشاهده پروفایل سلامت
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>این کاربر فرزندی ثبت نکرده است.</p>
                )}
            </div>
        </div>
    );
};

export default UserDetailPage;
