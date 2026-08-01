import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import Modal from 'react-modal';
import { whoStats } from '../who-stats';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import { getChildDisplayName } from '../utils/childName';
import './GrowthChartPage.css';
import './DatePickerOverride.css'; // Import the override styles

Modal.setAppElement('#root');

const legendTooltips = {
    'صدک ۳': '۳٪ از کودکان هم‌سن و هم‌جنس، مقداری کمتر از این خط دارند.',
    'صدک ۵۰ (میانه)': 'نقطه میانی رشد؛ ۵۰٪ از کودکان مقداری کمتر و ۵۰٪ مقداری بیشتر از این خط دارند.',
    'صدک ۹۷': '۹۷٪ از کودکان هم‌سن و هم‌جنس، مقداری کمتر از این خط دارند.'
};

const CustomLegend = (props) => {
    const { payload } = props;
    return (
        <ul className="custom-legend">
            {payload.map((entry, index) => {
                const childNameEntry = entry.value === props.childName;
                if (childNameEntry) {
                    return (
                        <li key={`item-${index}`} style={{ color: entry.color }}>
                           {entry.value} (داده‌های شما)
                        </li>
                    );
                }
                return (
                    <li key={`item-${index}`} style={{ color: entry.color }} title={legendTooltips[entry.value] || ''}>
                        {entry.value}
                    </li>
                );
            })}
        </ul>
    );
};


const GrowthChart = ({ data, standardData, childName, yAxisLabel, childAgeInMonths }) => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                type="number"
                dataKey="month"
                domain={[0, 60]}
                ticks={[0, 6, 12, 18, 24, 36, 48, 60]}
                label={{ value: "سن (ماه)", position: "insideBottom", offset: -15 }}
            />
            <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip
                formatter={(value, name) => {
                    if (name === childName) return [value, childName];
                    return [value, name];
                }}
            />
            <Legend content={<CustomLegend childName={childName} />} wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey="P3" data={standardData} stroke="#ff7300" name="صدک ۳" dot={false} />
            <Line type="monotone" dataKey="P50" data={standardData} stroke="#387908" name="صدک ۵۰ (میانه)" dot={false} />
            <Line type="monotone" dataKey="P97" data={standardData} stroke="#0095ff" name="صدک ۹۷" dot={false} />
            <Line type="monotone" dataKey="value" data={data} stroke="#e60000" name={childName} strokeWidth={2} />
            <ReferenceLine x={childAgeInMonths} stroke="red" label={{ value: "سن فعلی", position: "insideTopRight" }} />
        </LineChart>
    </ResponsiveContainer>
);

const GrowthChartPage = () => {
    const history = useHistory();
    const { childId } = useParams();
    const [child, setChild] = useState(null);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [newRecord, setNewRecord] = useState({ date: null, height: '', weight: '', headCircumference: '' });

    const fetchChildData = useCallback(async () => {
        try {
            const [childRes, growthRes] = await Promise.all([
                fetch(`http://localhost:5000/api/children/${childId}`),
                fetch(`http://localhost:5000/api/growth/${childId}`)
            ]);
            if (!childRes.ok) throw new Error('Child not found');
            const data = await childRes.json();
            const growth = growthRes.ok ? await growthRes.json() : (data.growthData || []);
            setChild({ ...data, growthData: growth });
        } catch (error) {
            history.push('/my-children');
        }
    }, [childId, history]);

    useEffect(() => {
        fetchChildData();
    }, [fetchChildData]);

    const handleAddData = async () => {
        if (!newRecord.height && !newRecord.weight && !newRecord.headCircumference) {
            alert('حداقل یکی از موارد قد، وزن یا دور سر را وارد کنید.');
            return;
        }

        if (!newRecord.date) {
            alert('لطفا تاریخ را انتخاب کنید.');
            return;
        }
        const gregorianDate = newRecord.date.toDate();
        const formattedDate = gregorianDate.toISOString().split('T')[0];

        const recordToAdd = {
            date: formattedDate,
            height: newRecord.height ? parseFloat(newRecord.height) : undefined,
            weight: newRecord.weight ? parseFloat(newRecord.weight) : undefined,
            headCircumference: newRecord.headCircumference ? parseFloat(newRecord.headCircumference) : undefined,
        };

        try {
            const response = await fetch(`http://localhost:5000/api/growth/${childId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recordToAdd),
            });
            if (!response.ok) throw new Error('ثبت داده رشد ناموفق بود');

            await fetchChildData();
            setModalIsOpen(false);
            setNewRecord({ date: null, height: '', weight: '', headCircumference: '' });
        } catch (error) {
            alert(error.message);
        }
    };

    if (!child) return <p>در حال بارگذاری...</p>;

    const childName = getChildDisplayName(child);

    const getStatusClassName = (status) => {
        if (status === 'کمبود') return 'status-low';
        if (status === 'اضافه') return 'status-high';
        if (status === 'نرمال') return 'status-normal';
        return 'status-unknown';
    };

    const heightAnalysis = analyzeGrowthMetric('height', child);
    const weightAnalysis = analyzeGrowthMetric('weight', child);
    const headAnalysis = analyzeGrowthMetric('headCircumference', child);

    const childAgeInMonths = child.birthDate ? (new Date() - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.4375) : 0;

    const formattedHeightData = child.birthDate ? (child.growthData || []).map(d => ({
        month: (new Date(d.date) - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.4375),
        value: d.height,
    })).filter(d => d.value !== undefined).sort((a, b) => a.month - b.month) : [];
    
    const formattedWeightData = child.birthDate ? (child.growthData || []).map(d => ({
        month: (new Date(d.date) - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.4375),
        value: d.weight,
    })).filter(d => d.value !== undefined).sort((a, b) => a.month - b.month) : [];

    const formattedHeadCircumferenceData = child.birthDate ? (child.growthData || []).map(d => ({
        month: (new Date(d.date) - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.4375),
        value: d.headCircumference,
    })).filter(d => d.value !== undefined).sort((a, b) => a.month - b.month) : [];

    return (
        <div className="growth-chart-page">
            <nav className="page-nav-final">
                <button onClick={() => history.goBack()} className="back-btn">
                    &larr; بازگشت به پرونده
                </button>
                <h1 className="page-title">نمودار رشد {childName}</h1>
                <div className="nav-placeholder"></div>
            </nav>

            <div className="page-actions">
                <button onClick={() => setModalIsOpen(true)} className="add-data-btn">
                    + افزودن داده جدید
                </button>
            </div>

            <div className="chart-info-boxes">
                <div className={`info-box ${getStatusClassName(heightAnalysis.status)}`}>
                    <h4>آخرین قد ثبت شده</h4>
                    <p>{heightAnalysis.value || 'N/A'} cm</p>
                    <span>وضعیت: {heightAnalysis.status}</span>
                </div>
                <div className={`info-box ${getStatusClassName(weightAnalysis.status)}`}>
                    <h4>آخرین وزن ثبت شده</h4>
                    <p>{weightAnalysis.value || 'N/A'} kg</p>
                    <span>وضعیت: {weightAnalysis.status}</span>
                </div>
                <div className={`info-box ${getStatusClassName(headAnalysis.status)}`}>
                    <h4>آخرین دور سر ثبت شده</h4>
                    <p>{headAnalysis.value || 'N/A'} cm</p>
                    <span>وضعیت: {headAnalysis.status}</span>
                </div>
            </div>
            
            <div className="chart-section">
                <h3>نمودار قد به سن</h3>
                <GrowthChart 
                    data={formattedHeightData}
                    standardData={child.gender === 'boy' ? whoStats.heightForAgeBoys : whoStats.heightForAgeGirls}
                    childName={childName}
                    yAxisLabel="قد (cm)"
                    childAgeInMonths={childAgeInMonths}
                />
            </div>
            
            <div className="chart-section">
                <h3>نمودار وزن به سن</h3>
                <GrowthChart 
                    data={formattedWeightData}
                    standardData={child.gender === 'boy' ? whoStats.weightForAgeBoys : whoStats.weightForAgeGirls}
                    childName={childName}
                    yAxisLabel="وزن (kg)"
                    childAgeInMonths={childAgeInMonths}
                />
            </div>

            <div className="chart-section">
                <h3>نمودار دور سر به سن</h3>
                <GrowthChart
                    data={formattedHeadCircumferenceData}
                    standardData={child.gender === 'boy' ? whoStats.headCircumferenceForAgeBoys : whoStats.headCircumferenceForAgeGirls}
                    childName={childName}
                    yAxisLabel="دور سر (cm)"
                    childAgeInMonths={childAgeInMonths}
                />
            </div>

            <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                contentLabel="Add Data Modal"
                className="add-data-modal"
                overlayClassName="modal-overlay"
            >
                <h2>افزودن داده جدید</h2>
                <div className="add-data-form">
                    <DatePicker
                        value={newRecord.date}
                        onChange={(date) => setNewRecord(prev => ({ ...prev, date }))}
                        calendar={persian}
                        locale={persian_fa}
                        format="YYYY/MM/DD"
                        placeholder="تاریخ را انتخاب کنید"
                        inputClass="form-control"
                        style={{ textAlign: 'center' }}
                    />
                    <input
                        type="number"
                        value={newRecord.height}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, height: e.target.value }))}
                        placeholder="قد (cm)"
                    />
                    <input
                        type="number"
                        value={newRecord.weight}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="وزن (kg)"
                    />
                    <input
                        type="number"
                        value={newRecord.headCircumference}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, headCircumference: e.target.value }))}
                        placeholder="دور سر (cm)"
                    />
                </div>
                <div className="modal-actions">
                    <button onClick={handleAddData}>ذخیره</button>
                    <button onClick={() => setModalIsOpen(false)}>انصراف</button>
                </div>
            </Modal>
        </div>
    );
};

export default GrowthChartPage;
