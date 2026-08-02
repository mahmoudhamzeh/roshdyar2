import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import persian_fa from 'react-date-object/locales/persian_fa';
import Modal from 'react-modal';
import { whoStats } from '../who-stats';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import {
    ageInMonths, formatLocalDate, normalizeDateString,
    parseLocalDate, roundAgeMonths, formatAgeLabel
} from '../utils/growth-dates';
import { toShamsi } from '../utils/dateConverter';
import { getChildDisplayName } from '../utils/childName';
import './GrowthChartPage.css';
import './DatePickerOverride.css';

Modal.setAppElement('#root');

const emptyForm = { date: null, height: '', weight: '', headCircumference: '' };

const legendTooltips = {
    'صدک ۳': '۳٪ از کودکان هم‌سن و هم‌جنس، مقداری کمتر از این خط دارند.',
    'صدک ۵۰ (میانه)': 'نقطه میانی رشد؛ ۵۰٪ از کودکان مقداری کمتر و ۵۰٪ مقداری بیشتر از این خط دارند.',
    'صدک ۹۷': '۹۷٪ از کودکان هم‌سن و هم‌جنس، مقداری کمتر از این خط دارند.'
};

const toGregorianDateString = (value) => {
    if (!value) return '';
    try {
        if (value instanceof DateObject || (typeof value === 'object' && value.year != null)) {
            const converted = new DateObject(value).convert(gregorian);
            return converted.format('YYYY-MM-DD');
        }
    } catch (e) {
        // fall through
    }
    if (value instanceof Date) return formatLocalDate(value);
    return normalizeDateString(value);
};

const CustomLegend = ({ payload, childName }) => (
    <ul className="custom-legend">
        {(payload || []).map((entry, index) => {
            const isChild = entry.value === childName;
            return (
                <li key={`legend-${index}`} style={{ color: entry.color }} title={legendTooltips[entry.value] || ''}>
                    {isChild ? `${entry.value} (داده‌های شما)` : entry.value}
                </li>
            );
        })}
    </ul>
);

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
        const month = roundAgeMonths(Math.max(0, point.month), 2);
        rows.push({
            month,
            P3: null,
            P50: null,
            P97: null,
            value: point.value,
            recordDate: point.date || null,
        });
    });

    return rows.sort((a, b) => a.month - b.month);
};

const GrowthChart = ({ data, standardData, childName, yAxisLabel, childAgeInMonths }) => {
    const chartData = buildChartData(standardData, data);
    const maxAge = Math.max(60, Math.ceil((childAgeInMonths || 0) + 1));
    const ageMarker = Math.min(Math.max(childAgeInMonths || 0, 0), maxAge);
    const values = chartData
        .flatMap((row) => [row.P3, row.P50, row.P97, row.value])
        .filter((v) => v != null && !Number.isNaN(v));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const padding = Math.max((maxValue - minValue) * 0.08, 1);
    const yDomain = [Math.max(0, Math.floor(minValue - padding)), Math.ceil(maxValue + padding)];
    const ticks = [0, 6, 12, 18, 24, 36, 48, 60].filter((t) => t <= maxAge);
    if (maxAge > 60 && !ticks.includes(maxAge)) ticks.push(maxAge);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e5e2" />
                <XAxis
                    type="number"
                    dataKey="month"
                    domain={[0, maxAge]}
                    ticks={ticks}
                    allowDecimals
                    label={{ value: 'سن (ماه)', position: 'insideBottom', offset: -12 }}
                />
                <YAxis
                    domain={yDomain}
                    width={42}
                    label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 0 }}
                />
                <Tooltip
                    formatter={(value, name) => {
                        if (value == null) return null;
                        if (name === childName) return [value, `${childName} (داده شما)`];
                        return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                        const point = payload && payload[0] && payload[0].payload;
                        const ageLabel = `سن: ${Number(label).toFixed(1)} ماه`;
                        if (point?.recordDate) {
                            return `${ageLabel} | تاریخ: ${toShamsi(point.recordDate)}`;
                        }
                        return ageLabel;
                    }}
                />
                <Legend content={<CustomLegend childName={childName} />} wrapperStyle={{ paddingTop: '16px' }} />
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
                        label={{ value: 'سن فعلی', position: 'insideTopRight', fill: '#115e59', fontSize: 12 }}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
};

const MetricInfoCard = ({ title, analysis, unit, statusClassName }) => (
    <div className={`info-box ${statusClassName}`}>
        <h4>{title}</h4>
        <p>{analysis.value != null ? `\u200E${analysis.value} ${unit}` : 'ثبت نشده'}</p>
        {analysis.date ? (
            <div className="info-meta">
                <span>آخرین تاریخ: {toShamsi(analysis.date)}</span>
                {analysis.ageInMonths != null && <span>سن: {formatAgeLabel(analysis.ageInMonths)}</span>}
            </div>
        ) : (
            <div className="info-meta"><span>هنوز داده‌ای ثبت نشده</span></div>
        )}
        <span className="status-label">وضعیت: {analysis.status}</span>
    </div>
);

const GrowthChartPage = () => {
    const history = useHistory();
    const { childId } = useParams();
    const [child, setChild] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const fetchChildData = useCallback(async () => {
        try {
            setLoadError('');
            const [childRes, growthRes] = await Promise.all([
                fetch(`http://localhost:5000/api/children/${childId}`),
                fetch(`http://localhost:5000/api/growth/${childId}`)
            ]);
            if (!childRes.ok) throw new Error('کودک یافت نشد');
            const data = await childRes.json();
            const growth = growthRes.ok ? await growthRes.json() : (data.growthData || []);
            setChild({ ...data, growthData: growth });
        } catch (error) {
            setLoadError(error.message || 'خطا در بارگذاری');
            history.push('/my-children');
        }
    }, [childId, history]);

    useEffect(() => {
        fetchChildData();
    }, [fetchChildData]);

    const openAddModal = () => {
        setEditingRecord(null);
        setForm(emptyForm);
        setFormError('');
        setModalIsOpen(true);
    };

    const openEditModal = (record) => {
        setEditingRecord(record);
        setForm({
            date: record.date
                ? new DateObject({ date: normalizeDateString(record.date) || record.date, calendar: gregorian }).convert(persian)
                : null,
            height: record.height != null ? String(record.height) : '',
            weight: record.weight != null ? String(record.weight) : '',
            headCircumference: record.headCircumference != null ? String(record.headCircumference) : '',
        });
        setFormError('');
        setModalIsOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalIsOpen(false);
        setEditingRecord(null);
        setForm(emptyForm);
        setFormError('');
    };

    const handleSave = async () => {
        setFormError('');
        if (!form.date) {
            setFormError('لطفا تاریخ را انتخاب کنید.');
            return;
        }
        if (!form.height && !form.weight && !form.headCircumference) {
            setFormError('حداقل یکی از موارد قد، وزن یا دور سر را وارد کنید.');
            return;
        }

        const formattedDate = toGregorianDateString(form.date);
        if (!formattedDate) {
            setFormError('تاریخ نامعتبر است. دوباره انتخاب کنید.');
            return;
        }

        const birth = parseLocalDate(child?.birthDate);
        const recordDate = parseLocalDate(formattedDate);
        if (birth && recordDate && recordDate < birth) {
            setFormError('تاریخ ثبت نمی‌تواند قبل از تاریخ تولد باشد.');
            return;
        }

        const payload = {
            date: formattedDate,
            height: form.height !== '' ? form.height : null,
            weight: form.weight !== '' ? form.weight : null,
            headCircumference: form.headCircumference !== '' ? form.headCircumference : null,
        };

        setSaving(true);
        try {
            const url = editingRecord
                ? `http://localhost:5000/api/growth/${childId}/record/${editingRecord.id}`
                : `http://localhost:5000/api/growth/${childId}`;
            const response = await fetch(url, {
                method: editingRecord ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || 'ثبت داده رشد ناموفق بود');
            }
            await fetchChildData();
            closeModal();
        } catch (error) {
            setFormError(error.message || 'خطا در ذخیره');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (record) => {
        if (!window.confirm(`رکورد تاریخ ${toShamsi(record.date)} حذف شود؟`)) return;
        try {
            const response = await fetch(
                `http://localhost:5000/api/growth/${childId}/record/${record.id}`,
                { method: 'DELETE' }
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || 'حذف ناموفق بود');
            await fetchChildData();
        } catch (error) {
            alert(error.message);
        }
    };

    if (!child) {
        return (
            <div className="growth-chart-page">
                <p className="growth-loading">{loadError || 'در حال بارگذاری...'}</p>
            </div>
        );
    }

    const childName = getChildDisplayName(child);
    const isBoy = child.gender === 'boy';

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

    const historyRows = [...(child.growthData || [])]
        .sort((a, b) => (parseLocalDate(b.date)?.getTime() || 0) - (parseLocalDate(a.date)?.getTime() || 0));

    return (
        <div className="growth-chart-page">
            <nav className="page-nav-final">
                <button type="button" onClick={() => history.goBack()} className="back-btn">
                    &rarr; بازگشت
                </button>
                <h1 className="page-title">نمودار رشد {childName}</h1>
                <div className="nav-placeholder"></div>
            </nav>

            <div className="page-actions">
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAddModal();
                    }}
                    className="add-data-btn"
                >
                    + افزودن داده جدید
                </button>
                {birthDate && (
                    <p className="age-now-label">
                        سن فعلی کودک: <strong>{formatAgeLabel(childAgeInMonths)}</strong>
                    </p>
                )}
            </div>

            <div className="chart-info-boxes">
                <MetricInfoCard
                    title="آخرین قد ثبت‌شده"
                    analysis={heightAnalysis}
                    unit="cm"
                    statusClassName={getStatusClassName(heightAnalysis.status)}
                />
                <MetricInfoCard
                    title="آخرین وزن ثبت‌شده"
                    analysis={weightAnalysis}
                    unit="kg"
                    statusClassName={getStatusClassName(weightAnalysis.status)}
                />
                <MetricInfoCard
                    title="آخرین دور سر ثبت‌شده"
                    analysis={headAnalysis}
                    unit="cm"
                    statusClassName={getStatusClassName(headAnalysis.status)}
                />
            </div>

            <div className="history-section">
                <div className="history-header">
                    <h3>تاریخچه اندازه‌گیری‌ها</h3>
                    <span>{historyRows.length} رکورد</span>
                </div>
                {historyRows.length === 0 ? (
                    <p className="history-empty">هنوز اندازه‌گیری ثبت نشده است. از دکمه «افزودن داده جدید» استفاده کنید.</p>
                ) : (
                    <div className="history-list">
                        {historyRows.map((record) => {
                            const age = ageInMonths(record.date, child.birthDate);
                            const rowKey = record.id || record.date;
                            const open = expandedId === rowKey;
                            return (
                                <article key={rowKey} className={`history-item ${open ? 'is-open' : ''}`}>
                                    <button
                                        type="button"
                                        className="history-item-main"
                                        onClick={() => setExpandedId(open ? null : rowKey)}
                                    >
                                        <div className="history-item-title">
                                            <strong>{toShamsi(record.date)}</strong>
                                            <span>{formatAgeLabel(age)}</span>
                                        </div>
                                        <div className="history-item-summary">
                                            <span>قد: {record.height != null ? `${record.height} cm` : '—'}</span>
                                            <span>وزن: {record.weight != null ? `${record.weight} kg` : '—'}</span>
                                            <span>دور سر: {record.headCircumference != null ? `${record.headCircumference} cm` : '—'}</span>
                                        </div>
                                    </button>
                                    {open && (
                                        <div className="history-item-detail">
                                            <p>در تاریخ <strong>{toShamsi(record.date)}</strong> (سن {formatAgeLabel(age)}) این مقادیر ثبت شده است:</p>
                                            <ul>
                                                <li>قد: {record.height != null ? `${record.height} سانتی‌متر` : 'ثبت نشده'}</li>
                                                <li>وزن: {record.weight != null ? `${record.weight} کیلوگرم` : 'ثبت نشده'}</li>
                                                <li>دور سر: {record.headCircumference != null ? `${record.headCircumference} سانتی‌متر` : 'ثبت نشده'}</li>
                                            </ul>
                                            <div className="history-item-actions">
                                                <button type="button" className="btn-edit" onClick={() => openEditModal(record)}>ویرایش</button>
                                                <button type="button" className="btn-delete" onClick={() => handleDelete(record)}>حذف</button>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="chart-section">
                <h3>نمودار قد به سن</h3>
                <p className="chart-hint">نقاط قرمز بر اساس سن کودک در تاریخ ثبت روی محور ماه قرار می‌گیرند.</p>
                <GrowthChart
                    data={formatMetricData('height')}
                    standardData={isBoy ? whoStats.heightForAgeBoys : whoStats.heightForAgeGirls}
                    childName={childName}
                    yAxisLabel="قد (cm)"
                    childAgeInMonths={childAgeInMonths}
                />
            </div>

            <div className="chart-section">
                <h3>نمودار وزن به سن</h3>
                <GrowthChart
                    data={formatMetricData('weight')}
                    standardData={isBoy ? whoStats.weightForAgeBoys : whoStats.weightForAgeGirls}
                    childName={childName}
                    yAxisLabel="وزن (kg)"
                    childAgeInMonths={childAgeInMonths}
                />
            </div>

            <div className="chart-section">
                <h3>نمودار دور سر به سن</h3>
                <GrowthChart
                    data={formatMetricData('headCircumference')}
                    standardData={isBoy ? whoStats.headCircumferenceForAgeBoys : whoStats.headCircumferenceForAgeGirls}
                    childName={childName}
                    yAxisLabel="دور سر (cm)"
                    childAgeInMonths={childAgeInMonths}
                />
            </div>

            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                contentLabel="Growth Data Modal"
                className="add-data-modal"
                overlayClassName="growth-modal-overlay"
                shouldCloseOnOverlayClick={!saving}
            >
                <h2>{editingRecord ? 'ویرایش داده رشد' : 'افزودن داده جدید'}</h2>
                <div className="add-data-form">
                    <label className="field-label">تاریخ اندازه‌گیری</label>
                    <DatePicker
                        value={form.date}
                        onChange={(date) => setForm((prev) => ({ ...prev, date }))}
                        calendar={persian}
                        locale={persian_fa}
                        format="YYYY/MM/DD"
                        placeholder="تاریخ را انتخاب کنید"
                        inputClass="form-control"
                        containerClassName="growth-datepicker"
                        calendarPosition="bottom-center"
                    />
                    <label className="field-label">قد (cm)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={form.height}
                        onChange={(e) => setForm((prev) => ({ ...prev, height: e.target.value }))}
                        placeholder="مثلاً 72.5"
                    />
                    <label className="field-label">وزن (kg)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={form.weight}
                        onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                        placeholder="مثلاً 9.2"
                    />
                    <label className="field-label">دور سر (cm)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={form.headCircumference}
                        onChange={(e) => setForm((prev) => ({ ...prev, headCircumference: e.target.value }))}
                        placeholder="مثلاً 44"
                    />
                </div>
                {formError && <p className="form-error">{formError}</p>}
                <div className="modal-actions">
                    <button type="button" onClick={handleSave} disabled={saving}>
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                    </button>
                    <button type="button" onClick={closeModal} disabled={saving}>انصراف</button>
                </div>
            </Modal>
        </div>
    );
};

export default GrowthChartPage;
