import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { getChildDisplayName } from '../utils/childName';
import './VaccinationPage.css'; // Re-using existing styles

const VaccinationStatusPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [schedule, setSchedule] = useState([]);
    const [child, setChild] = useState(null);
    const [vaccinationRecords, setVaccinationRecords] = useState({});

    const fetchData = useCallback(async () => {
        try {
            // Fetch child data to get name and existing records
            const childRes = await fetch(`http://localhost:5000/api/children/${childId}`);
            const childData = await childRes.json();
            setChild(childData);
            setVaccinationRecords(childData.vaccinationRecords || {});

            // Fetch the general vaccination schedule
            const scheduleRes = await fetch('http://localhost:5000/api/vaccination-schedule');
            const scheduleData = await scheduleRes.json();
            setSchedule(scheduleData);
        } catch (error) {
            console.error("Failed to fetch vaccination data:", error);
        }
    }, [childId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVaccineRecordChange = async (age, vaccineName, isDone) => {
        const updatedRecords = {
            ...vaccinationRecords,
            [age]: {
                ...vaccinationRecords[age],
                [vaccineName]: isDone,
            },
        };

        try {
            const response = await fetch(`http://localhost:5000/api/children/${childId}/vaccination-records`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vaccinationRecords: updatedRecords }),
            });

            if (response.ok) {
                setVaccinationRecords(updatedRecords);
            } else {
                alert('خطا در ثبت اطلاعات واکسن.');
            }
        } catch (error) {
            alert('خطای ارتباط با سرور.');
        }
    };

    return (
        <div className="vaccination-page">
            <nav className="page-nav-final">
                 <button onClick={() => history.goBack()} className="back-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    <span>بازگشت</span>
                </button>
                <h1>وضعیت واکسیناسیون {child ? `برای ${getChildDisplayName(child)}` : ''}</h1>
                <div className="nav-placeholder"></div>
            </nav>

            <div className="vaccine-schedule-container">
                {schedule.map(group => (
                    <div key={group.age} className="vaccine-group">
                        <h3 className="vaccine-group-title">{group.label}</h3>
                        <ul className="vaccine-list">
                            {group.vaccines.map(vaccine => (
                                <li key={vaccine.name} className="vaccine-item">
                                    <div className="vaccine-info">
                                        <strong>{vaccine.name}</strong>
                                        <span>{vaccine.details}</span>
                                    </div>
                                    <div className="vaccine-status">
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={!!(vaccinationRecords[group.age] && vaccinationRecords[group.age][vaccine.name])}
                                                onChange={(e) => handleVaccineRecordChange(group.age, vaccine.name, e.target.checked)}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VaccinationStatusPage;
