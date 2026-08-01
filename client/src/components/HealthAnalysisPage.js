import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faAllergies, faStethoscope, faChartLine, faCalendarCheck, faFileMedical, faArrowUp, faArrowDown, faSyringe, faBrain } from '@fortawesome/free-solid-svg-icons';
import VaccinationStatus from './VaccinationStatus';
import SmartRecommendations from './SmartRecommendations';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import { getChildDisplayName } from '../utils/childName';
import './HealthAnalysisPage.css';
import './SmartRecommendations.css';

const HealthAnalysisPage = () => {
    const history = useHistory();
    const { childId } = useParams();
    const [child, setChild] = useState(null);
    const [visits, setVisits] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [vaccinationStatus, setVaccinationStatus] = useState([]);
    const [growthTrend, setGrowthTrend] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const childRes = await fetch(`http://localhost:5000/api/children/${childId}`);
            if (!childRes.ok) throw new Error('Child not found');
            const childData = await childRes.json();
            setChild(childData);

            // Secondary data failures should not kick the user out of the page
            const [visitsRes, docsRes, vacRes] = await Promise.all([
                fetch(`http://localhost:5000/api/visits/${childId}`),
                fetch(`http://localhost:5000/api/documents/${childId}`),
                fetch(`http://localhost:5000/api/vaccination-status/${childId}`)
            ]);

            setVisits(visitsRes.ok ? await visitsRes.json() : []);
            setDocuments(docsRes.ok ? await docsRes.json() : []);
            setVaccinationStatus(vacRes.ok ? await vacRes.json() : []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            history.push('/my-children');
        } finally {
            setIsLoading(false);
        }
    }, [childId, history]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        if (child) {
            setGrowthTrend({
                height: analyzeGrowthMetric('height', child),
                weight: analyzeGrowthMetric('weight', child),
                headCircumference: analyzeGrowthMetric('headCircumference', child),
            });
        }
    }, [child]);

    if (isLoading) {
        return <p>در حال بارگذاری تحلیل...</p>;
    }

    if (!child) {
        return <p>اطلاعاتی برای نمایش وجود ندارد.</p>;
    }

    const TrendIndicator = ({ trend }) => {
        if (trend === 'stable') return <span className="trend-stable">روند ثابت</span>;
        if (trend === 'improving') return <span className="trend-improving">روند رو به بهبود <FontAwesomeIcon icon={faArrowUp} /></span>;
        if (trend === 'declining') return <span className="trend-declining">روند رو به کاهش <FontAwesomeIcon icon={faArrowDown} /></span>;
        return null;
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return { years: 0, months: 0 };
        const today = new Date();
        const birthDateObj = new Date(birthDate);
        let years = today.getFullYear() - birthDateObj.getFullYear();
        let months = today.getMonth() - birthDateObj.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDateObj.getDate())) {
            years--;
            months = (12 + months) % 12;
        }
        return { years, months };
    };

    const age = calculateAge(child.birthDate);

    const renderGrowthAnalysis = () => {
        if (Object.keys(growthTrend).length === 0) {
            return <p>اطلاعات رشدی برای تحلیل وجود ندارد.</p>;
        }
        return (
            <div>
                {growthTrend.height && <p><strong>قد:</strong> {growthTrend.height.value} cm (وضعیت: {growthTrend.height.status}, روند: <TrendIndicator trend={growthTrend.height.trend} />)</p>}
                {growthTrend.weight && <p><strong>وزن:</strong> {growthTrend.weight.value} kg (وضعیت: {growthTrend.weight.status}, روند: <TrendIndicator trend={growthTrend.weight.trend} />)</p>}
                {growthTrend.headCircumference && <p><strong>دور سر:</strong> {growthTrend.headCircumference.value} cm (وضعیت: {growthTrend.headCircumference.status}, روند: <TrendIndicator trend={growthTrend.headCircumference.trend} />)</p>}
            </div>
        );
    }

    return (
        <div className="health-analysis-page">
            <nav className="page-nav-final">
                <button onClick={() => history.goBack()} className="back-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    <span>بازگشت</span>
                </button>
                <h1>تحلیل پرونده سلامت - {getChildDisplayName(child)}</h1>
                <div className="nav-placeholder"></div>
            </nav>
            <main className="analysis-content">
                <div className="analysis-grid">
                     <div className="analysis-card full-width-card">
                        <h3><FontAwesomeIcon icon={faBrain} /> توصیه‌های هوشمند</h3>
                        <SmartRecommendations child={child} growthTrend={growthTrend} vaccinationStatus={vaccinationStatus} />
                    </div>
                    <div className="analysis-card">
                        <h3><FontAwesomeIcon icon={faIdCard} /> اطلاعات پایه</h3>
                        <p><strong>نام:</strong> {getChildDisplayName(child)}</p>
                        <p><strong>سن:</strong> {age.years} سال و {age.months} ماه</p>
                        <p><strong>جنسیت:</strong> {child.gender === 'boy' ? 'پسر' : 'دختر'}</p>
                        <p><strong>گروه خونی:</strong> {child.bloodType}</p>
                    </div>
                    <div className="analysis-card">
                        <h3><FontAwesomeIcon icon={faAllergies} /> آلرژی‌ها</h3>
                        {child.allergies && child.allergies.types && Object.entries(child.allergies.types).filter(([_, v]) => v).length > 0 ? (
                            <>
                                <div className="tags-container">
                                    {Object.entries(child.allergies.types).filter(([_, v]) => v).map(([k]) => <span key={k} className="tag allergy-tag">{k}</span>)}
                                </div>
                                {child.allergies.description && <p><strong>توضیحات:</strong> {child.allergies.description}</p>}
                            </>
                        ) : <p>هیچ آلرژی ثبت نشده است.</p>}
                    </div>
                    <div className="analysis-card">
                        <h3><FontAwesomeIcon icon={faStethoscope} /> بیماری‌های خاص</h3>
                        {child.special_illnesses && child.special_illnesses.types && Object.entries(child.special_illnesses.types).filter(([_, v]) => v).length > 0 ? (
                            <>
                                <div className="tags-container">
                                    {Object.entries(child.special_illnesses.types).filter(([_, v]) => v).map(([k]) => <span key={k} className="tag illness-tag">{k}</span>)}
                                </div>
                                {child.special_illnesses.description && <p><strong>توضیحات:</strong> {child.special_illnesses.description}</p>}
                            </>
                        ) : <p>هیچ بیماری خاصی ثبت نشده است.</p>}
                    </div>
                    <div className="analysis-card">
                        <h3><FontAwesomeIcon icon={faChartLine} /> تحلیل رشد</h3>
                        {renderGrowthAnalysis()}
                    </div>
                    <div className="analysis-card full-width-card">
                        <h3><FontAwesomeIcon icon={faCalendarCheck} /> تاریخچه مراجعات پزشکی</h3>
                        {visits.length > 0 ? (
                            <ul className="visits-list">
                                {visits.map(visit => (
                                    <li key={visit.id}>
                                        <span className="visit-date">{new Date(visit.date).toLocaleDateString('fa-IR')}</span>
                                        <span className="visit-reason">{visit.reason}</span>
                                        <p className="visit-description">{visit.description}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>هیچ مراجعه‌ای ثبت نشده است.</p>}
                    </div>
                    <div className="analysis-card full-width-card">
                        <h3><FontAwesomeIcon icon={faFileMedical} /> مدارک پزشکی</h3>
                        {documents.length > 0 ? (
                            <ul className="documents-list">
                                {documents.map(doc => (
                                    <li key={doc.id}>
                                        <a href={`http://localhost:5000${doc.url}`} target="_blank" rel="noopener noreferrer">{doc.title}</a>
                                        <span className="doc-date">{new Date(doc.date).toLocaleDateString('fa-IR')}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>هیچ مدرکی ثبت نشده است.</p>}
                    </div>
                    <div className="analysis-card full-width-card">
                        <h3><FontAwesomeIcon icon={faSyringe} /> وضعیت واکسیناسیون</h3>
                        <VaccinationStatus />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HealthAnalysisPage;
