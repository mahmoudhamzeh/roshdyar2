import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Modal from 'react-modal';
import DatePicker from 'react-datepicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVial, faPlus, faChevronDown, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons';
import { getTestStatus, labTestRanges } from '../utils/lab-test-ranges';
import TestRecommendations from './TestRecommendations';
import './LabTestsPage.css';

Modal.setAppElement('#root');

const CheckupItem = ({ checkup, child }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <li className="checkup-item">
            <div className="checkup-header" onClick={() => setIsExpanded(!isExpanded)}>
                <span className="checkup-title">{checkup.title}</span>
                <span className="checkup-date">{new Date(checkup.date).toLocaleDateString('fa-IR')}</span>
                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
            </div>
            {isExpanded && (
                <div className="checkup-details">
                    {checkup.fileUrl && (
                        <div className="checkup-file-link">
                            <a href={`${checkup.fileUrl}`} target="_blank" rel="noopener noreferrer">مشاهده فایل گزارش کامل</a>
                        </div>
                    )}
                    <table>
                        <thead>
                            <tr>
                                <th>پارامتر</th>
                                <th>نتیجه</th>
                                <th>واحد</th>
                                <th>محدوده مرجع</th>
                                <th>وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checkup.parameters.map((param, index) => {
                                const ageInMonths = child ? (new Date(checkup.date) - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.4375) : 0;
                                const testInfo = labTestRanges[param.name];
                                const applicableRange = testInfo ? testInfo.ranges.find(r => ageInMonths >= r.age_months[0] && ageInMonths < r.age_months[1]) : null;
                                const status = getTestStatus(param.name, ageInMonths, param.value);
                                return (
                                    <tr key={index}>
                                        <td>{param.name}</td>
                                        <td>{param.value}</td>
                                        <td>{param.unit}</td>
                                        <td>{applicableRange ? `${applicableRange.ref_low} - ${applicableRange.ref_high}` : 'N/A'}</td>
                                        <td><span className={`status-badge ${status.className}`}>{status.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </li>
    );
};


const LabTestsPage = () => {
    const history = useHistory();
    const { childId } = useParams();
    const [child, setChild] = useState(null);
    const [checkups, setCheckups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const initialFormState = {
        title: '',
        date: new Date(),
        parameters: [{ name: '', value: '', unit: '' }],
        checkupFile: null,
    };
    const [newCheckup, setNewCheckup] = useState(initialFormState);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [checkupsRes, childRes] = await Promise.all([
                fetch(`/api/checkups/${childId}`),
                fetch(`/api/children/${childId}`)
            ]);
            if (!childRes.ok) throw new Error('Child not found');
            const checkupsData = checkupsRes.ok ? await checkupsRes.json() : [];
            const childData = await childRes.json();
            setCheckups(Array.isArray(checkupsData) ? checkupsData : []);
            setChild(childData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleParamChange = (index, event) => {
        const values = [...newCheckup.parameters];
        values[index][event.target.name] = event.target.value;
        setNewCheckup(prev => ({ ...prev, parameters: values }));
    };

    const handleAddParam = () => {
        setNewCheckup(prev => ({ ...prev, parameters: [...prev.parameters, { name: '', value: '', unit: '' }] }));
    };

    const handleRemoveParam = (index) => {
        const values = [...newCheckup.parameters];
        values.splice(index, 1);
        setNewCheckup(prev => ({ ...prev, parameters: values }));
    };

    const handleFileChange = (e) => {
        setNewCheckup(prev => ({ ...prev, checkupFile: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', newCheckup.title);
        formData.append('date', newCheckup.date.toISOString().split('T')[0]);
        formData.append('parameters', JSON.stringify(newCheckup.parameters.filter(p => p.name)));
        if (newCheckup.checkupFile) {
            formData.append('checkupFile', newCheckup.checkupFile);
        }

        try {
            const res = await fetch(`/api/checkups/${childId}`, {
                method: 'POST',
                body: formData, // No Content-Type header needed, browser sets it for FormData
            });
            if (!res.ok) throw new Error('Failed to save checkup');

            fetchData(); // Refresh list
            setIsModalOpen(false); // Close modal
            setNewCheckup(initialFormState); // Reset form
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="lab-tests-page">
            <nav className="page-nav-final lab-tests-nav">
                <button onClick={() => history.goBack()} className="back-btn">
                    &larr; بازگشت
                </button>
                <h1 className="page-title"><FontAwesomeIcon icon={faVial} /> چکاپ و آزمایش‌ها</h1>
                <div className="nav-placeholder"></div>
            </nav>

            <main>
                <div className="add-checkup-container">
                    <button className="add-test-btn" onClick={() => setIsModalOpen(true)}>
                        <FontAwesomeIcon icon={faPlus} /> افزودن چکاپ جدید
                    </button>
                </div>
                <TestRecommendations />
                <div className="checkups-list-container">
                    {isLoading ? (
                        <p>در حال بارگذاری...</p>
                    ) : checkups.length === 0 ? (
                        <div className="no-tests-message">
                            <p>هیچ چکاپ یا آزمایشی ثبت نشده است.</p>
                        </div>
                    ) : (
                        <ul className="checkups-list">
                            {checkups.map(checkup => (
                                <CheckupItem key={checkup.id} checkup={checkup} child={child} />
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} className="add-data-modal" overlayClassName="modal-overlay">
                <form onSubmit={handleSubmit} className="add-data-form">
                    <h2>افزودن چکاپ جدید</h2>
                    <input type="text" value={newCheckup.title} onChange={e => setNewCheckup(prev => ({...prev, title: e.target.value}))} placeholder="عنوان چکاپ (مثلاً آزمایش خون سالانه)" required />
                    <DatePicker selected={newCheckup.date} onChange={date => setNewCheckup(prev => ({ ...prev, date }))} dateFormat="yyyy/MM/dd" />

                    <div className="parameters-section">
                        <h3>پارامترها</h3>
                        <datalist id="common-tests">
                            {Object.keys(labTestRanges).map(testName => <option key={testName} value={testName} />)}
                        </datalist>
                        {newCheckup.parameters.map((param, index) => (
                            <div key={index} className="parameter-row">
                                <input type="text" name="name" value={param.name} onChange={e => handleParamChange(index, e)} placeholder="نام پارامتر" list="common-tests" />
                                <input type="text" name="value" value={param.value} onChange={e => handleParamChange(index, e)} placeholder="مقدار" />
                                <input type="text" name="unit" value={param.unit} onChange={e => handleParamChange(index, e)} placeholder="واحد" />
                                <button type="button" className="remove-param-btn" onClick={() => handleRemoveParam(index)}><FontAwesomeIcon icon={faTrash} /></button>
                            </div>
                        ))}
                        <button type="button" className="add-param-btn" onClick={handleAddParam}>+ افزودن پارامتر</button>
                    </div>

                    <div className="file-upload-section">
                        <label>فایل گزارش کامل (اختیاری)</label>
                        <input type="file" name="checkupFile" onChange={handleFileChange} />
                    </div>

                    <div className="modal-actions">
                        <button type="submit">ذخیره چکاپ</button>
                        <button type="button" onClick={() => setIsModalOpen(false)}>انصراف</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LabTestsPage;
