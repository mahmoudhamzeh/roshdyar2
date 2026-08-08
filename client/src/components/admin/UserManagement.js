import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './UserManagement.css';
import EditUserModal from './EditUserModal';
import SetPasswordModal from './SetPasswordModal';

// A new sub-component for the actions dropdown
const ActionsMenu = ({ user, onEdit, onDelete, onSetPassword }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close the dropdown if clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    return (
        <div className="actions" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="actions-menu-btn">
                ...
            </button>
            {isOpen && (
                <div className="actions-dropdown">
                    <button onClick={() => { onSetPassword(user); setIsOpen(false); }}>تنظیم رمز</button>
                    <button onClick={() => { onEdit(user); setIsOpen(false); }}>ویرایش</button>
                    <button onClick={() => { onDelete(user.id); setIsOpen(false); }}>حذف</button>
                </div>
            )}
        </div>
    );
};


const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordEditingUser, setPasswordEditingUser] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/users', {
                headers: { 'x-user-id': adminUser.id }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    if (loading) return <p>در حال بارگذاری کاربران...</p>;
    if (error) return <p>خطا در دریافت کاربران: {error}</p>;

    const handleDelete = async (userId) => {
        if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
            try {
                const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': adminUser.id }
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to delete user');
                }
                setUsers(users.filter(user => user.id !== userId));
                alert('کاربر با موفقیت حذف شد');
            } catch (err) {
                setError(err.message);
                alert(`خطا در حذف کاربر: ${err.message}`);
            }
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (updatedUser) => {
        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch(`/api/admin/users/${updatedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': adminUser.id
                },
                body: JSON.stringify(updatedUser)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update user');
            }
            setUsers(users.map(user => user.id === updatedUser.id ? data : user));
            handleCloseEditModal();
            alert('کاربر با موفقیت به‌روز شد');
        } catch (err) {
            setError(err.message);
            alert(`خطا در به‌روزرسانی کاربر: ${err.message}`);
        }
    };

    const handleSetPasswordClick = (user) => {
        setPasswordEditingUser(user);
        setIsPasswordModalOpen(true);
    };

    const handleClosePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setPasswordEditingUser(null);
    };

    const handleSetPassword = async (userId, newPassword) => {
        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch(`/api/admin/users/${userId}/set-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': adminUser.id
                },
                body: JSON.stringify({ newPassword })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to set password');
            }
            handleClosePasswordModal();
            alert(data.message);
        } catch (err) {
            setError(err.message);
            alert(`خطا در تنظیم رمز عبور: ${err.message}`);
        }
    };

    return (
        <div className="user-management">
            <h2>مدیریت کاربران</h2>
            {error && <p className="error-message">{error}</p>}
            <table className="users-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>نام کاربری</th>
                        <th>ایمیل</th>
                        <th>مدیر</th>
                        <th className="actions">عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>
                                <Link to={`/admin/users/${user.id}`}>{user.username}</Link>
                            </td>
                            <td>{user.email}</td>
                            <td>{user.isAdmin ? 'بله' : 'خیر'}</td>
                            <td className="actions">
                                <ActionsMenu
                                    user={user}
                                    onEdit={handleEditClick}
                                    onDelete={handleDelete}
                                    onSetPassword={handleSetPasswordClick}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isEditModalOpen && (
                <EditUserModal
                    user={editingUser}
                    onClose={handleCloseEditModal}
                    onSave={handleSaveUser}
                />
            )}

            {isPasswordModalOpen && (
                <SetPasswordModal
                    user={passwordEditingUser}
                    onClose={handleClosePasswordModal}
                    onSave={handleSetPassword}
                />
            )}
        </div>
    );
};

export default UserManagement;
