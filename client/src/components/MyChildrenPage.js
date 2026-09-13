import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faPen, faPlus, faTrash, faChevronLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getChildDisplayName } from '../utils/childName';
import ChildAvatar from './ChildAvatar';
import './MyChildrenPage.css';

const MyChildrenPage = () => {
    const history = useHistory();
    const [children, setChildren] = useState([]);

    const fetchChildren = useCallback(async () => {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (!loggedInUser) {
                history.push('/register');
                return;
            }

            const response = await fetch('/api/children', {
                headers: {
                    'x-user-id': loggedInUser.id
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch children data.');
            }

            const data = await response.json();
            setChildren(data);
        } catch (error) {
            console.error('Failed to fetch children:', error);
        }
    }, [history]);

    useEffect(() => {
        fetchChildren();
    }, [fetchChildren]);

    const handleDelete = async (event, childId) => {
        event.stopPropagation();
        if (window.confirm('آیا از حذف این کودک مطمئن هستید؟')) {
            try {
                await fetch(`/api/children/${childId}`, { method: 'DELETE' });
                fetchChildren();
            } catch (error) {
                alert('خطا در حذف کودک');
            }
        }
    };

    const calculateAge = (birthDateStr) => {
        if (!birthDateStr) return 'نامشخص';
        const birthDate = new Date(birthDateStr.replace(/\//g, '-'));
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months += 12;
        }
        if (years === 0 && months === 0) return 'نوزاد';
        if (years === 0) return `${months} ماهه`;
        if (months === 0) return `${years} ساله`;
        return `${years} سال و ${months} ماه`;
    };

    return (
        <div className="children-page-final">
            <nav className="page-nav-final">
                <button type="button" onClick={() => history.push('/dashboard')} className="home-btn-final" aria-label="بازگشت به خانه">
                    <FontAwesomeIcon icon={faArrowRight} />
                    <span>خانه</span>
                </button>
                <h1>کودکان من</h1>
                <span className="page-nav-final-spacer" aria-hidden="true" />
            </nav>
            <div className="children-content-final">
                <button type="button" onClick={() => history.push('/add-child')} className="add-child-btn-final">
                    <FontAwesomeIcon icon={faPlus} />
                    افزودن کودک جدید
                </button>
                <div className="children-list-final">
                    {children.length === 0 ? (
                        <p className="no-children-message">هنوز کودکی اضافه نشده است.</p>
                    ) : (
                        children.map((child) => {
                            const displayName = getChildDisplayName(child);
                            const genderLabel = child.gender === 'girl' ? 'دختر' : child.gender === 'boy' ? 'پسر' : '';
                            return (
                                <article
                                    key={child.id}
                                    className={`child-card-final ${child.gender === 'girl' ? 'is-girl' : 'is-boy'}`}
                                    onClick={() => history.push(`/health-profile/${child.id}`)}
                                >
                                    <ChildAvatar child={child} size="md" />
                                    <div className="child-info-final">
                                        <div className="child-info-heading">
                                            <h3>{displayName}</h3>
                                            <FontAwesomeIcon icon={faChevronLeft} className="child-card-chevron" />
                                        </div>
                                        <p>
                                            {calculateAge(child.birthDate)}
                                            {genderLabel ? ` · ${genderLabel}` : ''}
                                        </p>
                                        <div className="child-card-actions">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    history.push(`/health-profile/${child.id}`);
                                                }}
                                                className="view-profile-btn-final"
                                            >
                                                <FontAwesomeIcon icon={faFolderOpen} />
                                                پرونده
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    history.push(`/edit-child/${child.id}`);
                                                }}
                                                className="edit-btn-final"
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                                ویرایش
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => handleDelete(event, child.id)}
                                                className="delete-btn-final"
                                                aria-label={`حذف ${displayName}`}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                                حذف
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyChildrenPage;
