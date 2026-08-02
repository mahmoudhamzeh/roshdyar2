import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import Modal from 'react-modal';
import { whoStats } from '../who-stats';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import { ageInMonths, formatLocalDate, parseLocalDate, roundAgeMonths } from '../utils/growth-dates';
import { toShamsi } from '../utils/dateConverter';
import { getChildDisplayName } from '../utils/childName';
import './GrowthChartPage.css';
import './DatePickerOverride.css';

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

/** Merge WHO percentile curves with child measurements on one age axis. */
const buildChartData = (standardData, childPoints) => {
    const rows = (standardData || []).map((row) => ({
        month: row.month,
        P3: row.P3,
        P50: row.P50,
        P97: row.P97,
        value: null,
        recordDate: null,
    }));

    (childPoints || []).forEach((point) => {
        if (point.month == null || point.value == null || Number.isNaN(point.month)) return;
        const month = roundAgeMonths(point.month, 2);
        const existing = rows.find((row) => Math.abs(row.month - month) < 0.05);
        if (existing) {
            existing.value = point.value;
            existing.recordDate = point.date || existing.recordDate;
        } else {
            rows.push({
                month,
                P3: null,
                P50: null,
                P97: null,
                value: point.value,
                recordDate: point.date || null,
            });
        }
    });

    return rows.sort((a, b) => a.month - b.month);
};

const GrowthChart = ({ data, standardData, childName, yAxisLabel, childAgeInMonths }) => {
    const chartData = buildChartData(standardData, data);
    const ageMarker = Math.min(Math.max(childAgeInMonths || 0, 0), 60);
    const values = chartData
        .flatMap((row) => [row.P3, row.P50, row.P97, row.value])
        .filter((v) => v != null && !Number.isNaN(v));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const padding = Math.max((maxValue - minValue) * 0.08, 1);
    const yDomain = [
        Math.max(0, Math.floor(minValue - padding)),
        Math.ceil(maxValue + padding),
    ];

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e5e2" />
                <XAxis
                    type="number"
                    dataKey="month"
                    domain={[0, 60]}
                    ticks={[0, 6, 12, 18, 24, 36, 48, 60]}
                    allowDecimals
                    label={{ value: "سن (ماه)", position: "insideBottom", offset: -15 }}
                />
                <YAxis
                    domain={yDomain}
                    label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10 }}
                />
                <Tooltip
                    formatter={(value, name) => {
                        if (value == null) return null;
                        if (name === childName) return [value, `${childName} (داده‌های شما)`];
                        return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                        const point = payload && payload[0] && payload[0].payload;
                        const ageLabel = `سن: ${Number(label).toFixed(1)} ماه`;
                        if (point && point.recordDate) {
                            return `${ageLabel} | تاریخ: ${toShamsi(point.recordDate)}`;
                        }
                        return ageLabel;
                    }}
                />
                <Legend content={<CustomLegend childName={childName} />} wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="P3" stroke="#d97706" name="صدک ۳" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="P50" stroke="#0f766e" name="صدک ۵۰ (میانه)" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="P97" stroke="#0284c7" name="صدک ۹۷" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#dc2626"
                    name={childName}
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                />
                {childAgeInMonths > 0 && (
                    <ReferenceLine
                        x={ageMarker}
                        stroke="#115e59"
                        strokeDasharray="4 4"
                        label={{ value: "سن فعلی", position: "insideTopRight", fill: "#115e59", fontSize: 12 }}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
};

const MetricInfoCard = ({ title, analysis, unit, statusClassName }) => {
    const shamsiDate = analysis.date ? toShamsi(analysis.date) : '';
    const ageText = analysis.ageInMonths != null
        ? `${roundAgeMonths(analysis.ageInMonths, 1)} ماهگی`
        : '';

    return (
        <div className={`info-box ${statusClassName}`}>
            <h4>{title}</h4>
            <p>{analysis.value != null ? `\u200E${analysis.value} ${unit}` : 'ثبت نشده'}</p>
            {shamsiDate && (
                <div className="info-meta">
                    <span>تاریخ: {shamsiDate}</span>
                    {ageText && <span>سن: {ageText}</span>}
                </div>
            )}
            <span className="status-label">وضعیت: {analysis.status}</span>
        </div>
    );
};

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

        const gregorianDate = newRecord.date.toDate ? newRecord.date.toDate() : new Date(newRecord.date);
        const formattedDate = formatLocalDate(gregorianDate);
        if (!formattedDate) {
            alert('تاریخ نامعتبر است.');
            return;
        }

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
        if (status === 'کمبود') return 'growth-status-low';
        if (status === 'اضافه') return 'growth-status-high';
        if (status === 'نرمال') return 'growth-status-normal';
        return 'growth-status-unknown';
    };

    const heightAnalysis = analyzeGrowthMetric('height', child);
    const weightAnalysis = analyzeGrowthMetric('weight', child);
    const headAnalysis = analyzeGrowthMetric('headCircumference', child);

    const birthDate = parseLocalDate(child.birthDate);
    const childAgeInMonths = birthDate ? ageInMonths(new Date(), child.birthDate) : 0;

    const formatMetricData = (metricKey) => {
        if (!birthDate) return [];
        return (child.growthData || [])
            .map((d) => {
                const months = ageInMonths(d.date, child.birthDate);
                if (months == null || d[metricKey] == null || d[metricKey] === '') return null;
                return {
                    month: months,
                    value: Number(d[metricKey]),
                    date: d.date,
                };
            })
            .filter((d) => d && !Number.isNaN(d.month) && !Number.isNaN(d.value) && d.month >= 0)
            .sort((a, b) => a.month - b.month);
    };

    const formattedHeightData = formatMetricData('height');
    const formattedWeightData = formatMetricData('weight');
    const formattedHeadCircumferenceData = formatMetricData('headCircumference');

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
                <MetricInfoCard
                    title="آخرین قد ثبت شده"
                    analysis={heightAnalysis}
                    unit="cm"
                    statusClassName={getStatusClassName(heightAnalysis.status)}
                />
                <MetricInfoCard
                    title="آخرین وزن ثبت شده"
                    analysis={weightAnalysis}
                    unit="kg"
                    statusClassName={getStatusClassName(weightAnalysis.status)}
                />
                <MetricInfoCard
                    title="آخرین دور سر ثبت شده"
                    analysis={headAnalysis}
                    unit="cm"
                    statusClassName={getStatusClassName(headAnalysis.status)}
                />
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
