import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChild,
    faChartLine,
    faSyringe,
    faUserMd,
    faBrain,
    faFlask,
    faStore,
    faGamepad,
} from '@fortawesome/free-solid-svg-icons';
import { getChildDisplayName } from '../utils/childName';
import './ServiceTiles.css';

const services = [
    { name: 'کودکان من', icon: faChild, link: '/my-children', id: 'my-children', tone: 'teal' },
    { name: 'نمودار رشد', icon: faChartLine, link: '#', id: 'growth-chart', tone: 'amber' },
    { name: 'واکسیناسیون', icon: faSyringe, link: '#', id: 'vaccination', tone: 'mint' },
    { name: 'مشاوره با متخصص', icon: faUserMd, link: '#', id: 'consultant', tone: 'teal' },
    { name: 'مشاوره روانشناسی', icon: faBrain, link: '#', id: 'psychology', tone: 'amber' },
    { name: 'آزمایش در محل', icon: faFlask, link: '#', id: 'lab-test', tone: 'mint' },
    { name: 'فروشگاه', icon: faStore, link: '/shop', id: 'store', tone: 'teal' },
    { name: 'سرگرمی', icon: faGamepad, link: '#', id: 'entertainment', tone: 'amber' },
];

Modal.setAppElement('#root');

const ServiceTiles = () => {
    const history = useHistory();
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState('');
    const [selectedService, setSelectedService] = useState('');

    const handleServiceClick = async (serviceId) => {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const userId = loggedInUser ? loggedInUser.id : null;

            if (!userId) {
                alert('لطفا برای مشاهده این بخش ابتدا وارد شوید.');
                history.push('/login');
                return;
            }

            const response = await fetch('http://localhost:5000/api/children', {
                headers: {
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Could not read error body');
                throw new Error(`خطا در دریافت اطلاعات کودکان. سرور پاسخ داد: ${errorText || response.statusText}`);
            }

            const data = await response.json();

            if (data.length === 0) {
                alert('ابتدا باید حداقل یک کودک اضافه کنید.');
                history.push('/add-child');
            } else {
                setChildren(data);
                setSelectedService(serviceId);
                setModalIsOpen(true);
            }
        } catch (error) {
            console.error('Failed to fetch children:', error);
            alert(error.message || 'خطا در دریافت اطلاعات کودکان.');
        }
    };

    const handleModalSubmit = () => {
        if (selectedChild && selectedService) {
            history.push(`/${selectedService}/${selectedChild}`);
        }
    };

    const renderTile = (service) => (
        <div className={`tile tile-${service.tone}`}>
            <div className="tile-icon" aria-hidden="true">
                <FontAwesomeIcon icon={service.icon} />
            </div>
            <div className="tile-name">{service.name}</div>
        </div>
    );

    return (
        <>
            <section className="tiles-section">
                <div className="tiles-header animate-fade-up">
                    <h2>خدمات تات کیدز</h2>
                    <p>از پیگیری رشد تا مراقبت روزانه — همه در یک نگاه</p>
                </div>
                <div className="tiles-container">
                    {services.map((service, index) => {
                        const requiresChild = service.id === 'growth-chart' || service.id === 'vaccination';
                        const style = { animationDelay: `${0.05 * index}s` };
                        if (requiresChild) {
                            return (
                                <Link
                                    to="#"
                                    key={service.id}
                                    className="tile-link animate-fade-up"
                                    style={style}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleServiceClick(service.id);
                                    }}
                                >
                                    {renderTile(service)}
                                </Link>
                            );
                        }
                        return (
                            <Link
                                to={service.link}
                                key={service.id}
                                className="tile-link animate-fade-up"
                                style={style}
                            >
                                {renderTile(service)}
                            </Link>
                        );
                    })}
                </div>
            </section>
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                contentLabel="Select Child Modal"
                className="child-select-modal"
                overlayClassName="modal-overlay"
            >
                <h2>انتخاب کودک</h2>
                <div className="children-list-modal">
                    {children.map(child => (
                        <div
                            key={child.id}
                            className={`child-item-modal ${selectedChild === child.id ? 'selected' : ''}`}
                            onClick={() => setSelectedChild(child.id)}
                        >
                            <img
                                src={child.avatar && child.avatar.startsWith('/uploads')
                                    ? `http://localhost:5000${child.avatar}`
                                    : (child.avatar || 'https://i.pravatar.cc/50')}
                                alt={getChildDisplayName(child)}
                            />
                            <div className="child-name">{getChildDisplayName(child)}</div>
                        </div>
                    ))}
                </div>
                <div className="modal-actions">
                    <button onClick={handleModalSubmit} disabled={!selectedChild}>
                        تایید و ادامه
                    </button>
                    <button onClick={() => setModalIsOpen(false)}>انصراف</button>
                </div>
            </Modal>
        </>
    );
};

export default ServiceTiles;
