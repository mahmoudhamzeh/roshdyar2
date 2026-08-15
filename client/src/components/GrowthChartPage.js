import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import persian_fa from 'react-date-object/locales/persian_fa';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRight,
    faPlus,
    faChild,
    faInfoCircle,
    faChevronDown,
    faPen,
    faTrash,
    faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { whoStats } from '../who-stats';
import {
    analyzeGrowthMetric,
    analyzeRecordMetric,
    getGrowthInterpretation,
    getTrendMeta,
    roundPercentile,
    METRIC_META,
} from '../utils/growth-analyzer';
import {
    ageInMonths, formatLocalDate, normalizeDateString,
    parseLocalDate, formatAgeLabel
} from '../utils/growth-dates';
import { buildChartData, getVisibleAgeDomain, buildAgeTicks, formatDelta } from '../utils/growth-chart-helpers';
import { toShamsi } from '../utils/dateConverter';
import { getChildDisplayName } from '../utils/childName';
import './GrowthChartPage.css';
import './DatePickerOverride.css';

Modal.setAppElement('#root');

const emptyForm = { date: null, height: '', weight: '', headCircumference: '' };

const METRIC_TABS = [
    { key: 'height', whoBoys: 'heightForAgeBoys', whoGirls: 'heightForAgeGirls' },
    { key: 'weight', whoBoys: 'weightForAgeBoys', whoGirls: 'weightForAgeGirls' },
    { key: 'headCircumference', whoBoys: 'headCircumferenceForAgeBoys', whoGirls: 'headCircumferenceForAgeGirls' },
];

const legendItems = [
    { color: '#d97706', label: 'صدک ۳', hint: '۳٪ از کودکان هم‌سن و هم‌جنس مقداری کمتر از این خط دارند.' },
    { color: '#0f766e', label: 'صدک ۵۰', hint: 'نقطه میانی رشد؛ نیمی از کودکان پایین‌تر و نیمی بالاتر از این خط هستند.' },
    { color: '#0284c7', label: 'صدک ۹۷', hint: '۹۷٪ از کودکان هم‌سن و هم‌جنس مقداری کمتر از این خط دارند.' },
    { color: '#dc2626', label: 'کودک شما', hint: 'نقاط قرمز اندازه‌گیری‌های ثبت‌شده روی محور سن هستند.' },
];

const toGregorianDateString = (value) => {
    if (!value) return '';
    const selected = Array.isArray(value) ? value[0] : value;

    try {
        if (selected instanceof Date) {
            return formatLocalDate(selected);
        }

        if (typeof selected === 'object') {
            let jsDate = null;
            if (typeof selected.toDate === 'function') {
                jsDate = selected.toDate();
            } else {
                const asObject = selected instanceof DateObject
                    ? selected
                    : new DateObject(selected);
                jsDate = asObject.convert(gregorian).toDate();
            }
            const formatted = formatLocalDate(jsDate);
            if (formatted) return formatted;
        }

        if (typeof selected === 'string') {
            const normalized = normalizeDateString(selected);
            if (normalized && Number(normalized.slice(0, 4)) > 1700) {
                return normalized;
            }
            const persianDate = new DateObject({
                date: selected.replace(/-/g, '/'),
                format: 'YYYY/MM/DD',
                calendar: persian,
            });
            return formatLocalDate(persianDate.convert(gregorian).toDate());
        }
    } catch (e) {
        console.error('date conversion failed', e);
    }
    return '';
};

const statusClass = (status) => {
    if (status === 'کمبود') return 'is-low';
    if (status === 'اضافه') return 'is-high';
    if (status === 'نرمال') return 'is-ok';
    return 'is-muted';
};

const CustomTooltip = ({ active, payload, label, childName }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload || {};
    const rows = payload.filter((entry) => entry.value != null);
    if (!rows.length) return null;

    return (
        <div className="gc-tooltip">
            <p className="gc-tooltip-age">سن: {Number(label).toFixed(1)} ماه</p>
            {point.recordDate && <p>تاریخ: {toShamsi(point.recordDate)}</p>}
            {rows.map((entry) => (
                <p key={entry.dataKey} style={{ color: entry.color }}>
                    {entry.dataKey === 'value' ? childName : entry.name}: {entry.value}
                </p>
            ))}
        </div>
    );
};

const GrowthChart = ({
    data,
    standardData,
    childName,
    yAxisLabel,
    childAgeInMonths,
    rangeMode,
    onSelectPoint,
    selectedMonth,
}) => {
    const chartData = useMemo(
        () => buildChartData(standardData, data),
        [standardData, data]
    );
    const [minAge, maxAge] = getVisibleAgeDomain({
        childAgeInMonths,
        points: data,
        mode: rangeMode,
    });
    const visibleData = chartData.filter((row) => row.month >= minAge - 0.01 && row.month <= maxAge + 0.01);
    const ageMarker = Math.min(Math.max(childAgeInMonths || 0, minAge), maxAge);
    const values = visibleData
        .flatMap((row) => [row.P3, row.P50, row.P97, row.value])
        .filter((value) => value != null && !Number.isNaN(value));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const padding = Math.max((maxValue - minValue) * 0.1, 1);
    const yDomain = [Math.max(0, Math.floor(minValue - padding)), Math.ceil(maxValue + padding)];
    const ticks = buildAgeTicks(minAge, maxAge);
    const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 768;
    const chartHeight = isNarrow ? 240 : 320;

    return (
        <div className="gc-chart-wrap">
            <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart
                    data={visibleData}
                    margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                    onClick={(state) => {
                        const point = state?.activePayload?.[0]?.payload;
                        if (point?.value != null) onSelectPoint(point);
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7e5e2" />
                    <XAxis
                        type="number"
                        dataKey="month"
                        domain={[minAge, maxAge]}
                        ticks={ticks}
                        allowDecimals
                        tick={{ fontSize: 11, fill: '#5b716e' }}
                        tickMargin={6}
                    />
                    <YAxis
                        domain={yDomain}
                        width={isNarrow ? 36 : 44}
                        tick={{ fontSize: 11, fill: '#5b716e' }}
                        tickMargin={4}
                    />
                    <Tooltip
                        content={<CustomTooltip childName={childName} />}
                        allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Line type="monotone" dataKey="P3" stroke="#d97706" name="صدک ۳" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
                    <Line type="monotone" dataKey="P50" stroke="#0f766e" name="صدک ۵۰" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
                    <Line type="monotone" dataKey="P97" stroke="#0284c7" name="صدک ۹۷" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#dc2626"
                        name={childName}
                        strokeWidth={2.5}
                        connectNulls
                        isAnimationActive={false}
                        dot={{ r: isNarrow ? 5 : 4, strokeWidth: 2, fill: '#fff', stroke: '#dc2626' }}
                        activeDot={{ r: 7 }}
                    />
                    {childAgeInMonths > 0 && (
                        <ReferenceLine
                            x={ageMarker}
                            stroke="#115e59"
                            strokeDasharray="4 4"
                        />
                    )}
                    {selectedMonth != null && (
                        <ReferenceLine x={selectedMonth} stroke="#dc2626" strokeDasharray="2 4" />
                    )}
                </LineChart>
            </ResponsiveContainer>
            <p className="gc-axis-caption">محور افقی: سن (ماه) · محور عمودی: {yAxisLabel}</p>
        </div>
    );
};

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
    const [activeMetric, setActiveMetric] = useState('height');
    const [rangeMode, setRangeMode] = useState('focus');
    const [legendOpen, setLegendOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fetchChildData = useCallback(async () => {
        try {
            setLoadError('');
            const [childRes, growthRes] = await Promise.all([
                fetch(`/api/children/${childId}`),
                fetch(`/api/growth/${childId}`)
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

    useEffect(() => {
        setSelectedPoint(null);
        setExpandedId(null);
        setConfirmDeleteId(null);
    }, [activeMetric]);

    const openAddModal = () => {
        setEditingRecord(null);
        setForm({
            ...emptyForm,
            date: new DateObject({ calendar: persian, locale: persian_fa }),
        });
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
        setConfirmDeleteId(null);
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
            const hasRecordId = Boolean(editingRecord && editingRecord.id);
            const url = hasRecordId
                ? `/api/growth/${childId}/record/${editingRecord.id}`
                : `/api/growth/${childId}`;
            const response = await fetch(url, {
                method: hasRecordId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || 'ثبت داده رشد ناموفق بود');
            }
            await fetchChildData();
            setModalIsOpen(false);
            setEditingRecord(null);
            setForm(emptyForm);
            setFormError('');
        } catch (error) {
            setFormError(error.message || 'خطا در ذخیره');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (record) => {
        try {
            let response;
            if (record.id) {
                response = await fetch(
                    `/api/growth/${childId}/record/${record.id}`,
                    { method: 'DELETE' }
                );
            } else {
                const encodedDate = encodeURIComponent(normalizeDateString(record.date) || record.date);
                response = await fetch(
                    `/api/growth/${childId}/${encodedDate}`,
                    { method: 'DELETE' }
                );
            }
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || 'حذف ناموفق بود');
            setConfirmDeleteId(null);
            await fetchChildData();
        } catch (error) {
            alert(error.message);
        }
    };

    if (!child) {
        return (
            <div className="growth-chart-page">
                <p className="gc-loading">{loadError || 'در حال بارگذاری...'}</p>
            </div>
        );
    }

    const childName = getChildDisplayName(child);
    const isBoy = child.gender === 'boy';
    const birthDate = parseLocalDate(child.birthDate);
    const childAgeInMonths = birthDate ? ageInMonths(new Date(), child.birthDate) : 0;
    const analyses = {
        height: analyzeGrowthMetric('height', child),
        weight: analyzeGrowthMetric('weight', child),
        headCircumference: analyzeGrowthMetric('headCircumference', child),
    };
    const activeMeta = METRIC_META[activeMetric];
    const activeAnalysis = analyses[activeMetric];
    const activeTab = METRIC_TABS.find((tab) => tab.key === activeMetric);
    const standardData = whoStats[isBoy ? activeTab.whoBoys : activeTab.whoGirls];
    const trend = getTrendMeta(activeAnalysis.trend);
    const percentile = roundPercentile(activeAnalysis.percentile);
    const deltaLabel = formatDelta(activeAnalysis.delta, activeMeta.unit);
    const beyondWho = childAgeInMonths > 60;

    const formatMetricData = (metricKey) => {
        if (!birthDate) return [];
        return (child.growthData || [])
            .map((record) => {
                const months = ageInMonths(record.date, child.birthDate);
                if (months == null || record[metricKey] == null || record[metricKey] === '') return null;
                return {
                    month: months,
                    value: Number(record[metricKey]),
                    date: record.date,
                };
            })
            .filter((record) => record && !Number.isNaN(record.month) && !Number.isNaN(record.value) && record.month >= 0)
            .sort((a, b) => a.month - b.month);
    };

    const metricPoints = formatMetricData(activeMetric);
    const historyRows = [...(child.growthData || [])]
        .sort((a, b) => (parseLocalDate(b.date)?.getTime() || 0) - (parseLocalDate(a.date)?.getTime() || 0));

    return (
        <div className="growth-chart-page">
            <nav className="gc-nav">
                <button type="button" onClick={() => history.goBack()} className="gc-back">
                    <FontAwesomeIcon icon={faArrowRight} />
                    <span>بازگشت</span>
                </button>
                <h1>نمودار رشد</h1>
                <button type="button" className="gc-nav-add" onClick={openAddModal}>
                    <FontAwesomeIcon icon={faPlus} />
                    <span>ثبت</span>
                </button>
            </nav>

            <header className="gc-hero">
                <div className="gc-hero-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faChild} />
                </div>
                <div className="gc-hero-text">
                    <p className="gc-kicker">منحنی رشد سازمان بهداشت جهانی</p>
                    <h2>{childName}</h2>
                    <p className="gc-hero-meta">
                        {birthDate ? formatAgeLabel(childAgeInMonths) : 'سن نامشخص'}
                        <span>·</span>
                        {isBoy ? 'پسر' : 'دختر'}
                        <span>·</span>
                        {historyRows.length} اندازه‌گیری
                    </p>
                </div>
            </header>

            <div className="gc-tabs" role="tablist" aria-label="نوع نمودار">
                {METRIC_TABS.map((tab) => {
                    const meta = METRIC_META[tab.key];
                    const analysis = analyses[tab.key];
                    const active = activeMetric === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={`gc-tab ${active ? 'is-active' : ''}`}
                            onClick={() => setActiveMetric(tab.key)}
                        >
                            <strong>{meta.label}</strong>
                            <span>
                                {analysis.value != null ? `${analysis.value} ${meta.unit}` : 'بدون داده'}
                            </span>
                        </button>
                    );
                })}
            </div>

            <section className={`gc-card gc-metric-card ${statusClass(activeAnalysis.status)}`}>
                <div className="gc-metric-top">
                    <div>
                        <p className="gc-metric-label">آخرین {activeMeta.label}</p>
                        <p className="gc-metric-value">
                            {activeAnalysis.value != null ? (
                                <>
                                    {activeAnalysis.value}
                                    <span>{activeMeta.unit}</span>
                                </>
                            ) : '—'}
                        </p>
                    </div>
                    <div className="gc-metric-badges">
                        <span className={`gc-status ${statusClass(activeAnalysis.status)}`}>
                            {activeAnalysis.status}
                        </span>
                        {percentile != null && (
                            <span className="gc-percentile">صدک {percentile}</span>
                        )}
                    </div>
                </div>
                <div className="gc-metric-facts">
                    {activeAnalysis.date ? (
                        <span>تاریخ: {toShamsi(activeAnalysis.date)}</span>
                    ) : (
                        <span>هنوز اندازه‌گیری ثبت نشده</span>
                    )}
                    {activeAnalysis.ageInMonths != null && (
                        <span>سن ثبت: {formatAgeLabel(activeAnalysis.ageInMonths)}</span>
                    )}
                    <span>روند: {trend.label}</span>
                    {deltaLabel && <span>تغییر: {deltaLabel}</span>}
                    <span>{activeAnalysis.count} نقطه روی نمودار</span>
                </div>
                <p className="gc-metric-note">{getGrowthInterpretation(activeMetric, activeAnalysis)}</p>
            </section>

            {beyondWho && (
                <p className="gc-banner">
                    منحنی استاندارد سازمان بهداشت جهانی تا ۵ سالگی است. برای سن بالاتر، نقاط روی انتهای نمودار نمایش داده می‌شوند.
                </p>
            )}

            <section className="gc-card gc-chart-card">
                <div className="gc-chart-head">
                    <h3>
                        <FontAwesomeIcon icon={faChartLine} />
                        نمودار {activeMeta.label} به سن
                    </h3>
                    <div className="gc-range-toggle">
                        <button
                            type="button"
                            className={rangeMode === 'focus' ? 'is-active' : ''}
                            onClick={() => setRangeMode('focus')}
                        >
                            نمای نزدیک
                        </button>
                        <button
                            type="button"
                            className={rangeMode === 'full' ? 'is-active' : ''}
                            onClick={() => setRangeMode('full')}
                        >
                            ۰ تا ۵ سال
                        </button>
                    </div>
                </div>
                <p className="gc-chart-hint">
                    ناحیه بین صدک ۳ و ۹۷ محدوده طبیعی است. روی نقطه قرمز بزنید تا جزئیات همان اندازه‌گیری دیده شود.
                </p>

                {metricPoints.length === 0 ? (
                    <div className="gc-empty">
                        <p>برای {activeMeta.label} هنوز نقطه‌ای ثبت نشده است.</p>
                        <button type="button" className="gc-primary-btn" onClick={openAddModal}>
                            ثبت اولین اندازه‌گیری
                        </button>
                    </div>
                ) : (
                    <GrowthChart
                        data={metricPoints}
                        standardData={standardData}
                        childName={childName}
                        yAxisLabel={`${activeMeta.label} (${activeMeta.unit})`}
                        childAgeInMonths={childAgeInMonths}
                        rangeMode={rangeMode}
                        onSelectPoint={setSelectedPoint}
                        selectedMonth={selectedPoint?.month}
                    />
                )}

                {selectedPoint && (
                    <div className="gc-selected">
                        <strong>نقطه انتخاب‌شده</strong>
                        <p>
                            {selectedPoint.value} {activeMeta.unit}
                            {selectedPoint.recordDate ? ` · ${toShamsi(selectedPoint.recordDate)}` : ''}
                            {` · ${formatAgeLabel(selectedPoint.month)}`}
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    className={`gc-accordion ${legendOpen ? 'is-open' : ''}`}
                    onClick={() => setLegendOpen((open) => !open)}
                >
                    <span>راهنمای خطوط نمودار</span>
                    <FontAwesomeIcon icon={faChevronDown} />
                </button>
                {legendOpen && (
                    <ul className="gc-legend">
                        {legendItems.map((item) => (
                            <li key={item.label}>
                                <i style={{ background: item.color }} />
                                <div>
                                    <strong>{item.label}</strong>
                                    <p>{item.hint}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="gc-card gc-history-card">
                <div className="gc-history-head">
                    <h3>تاریخچه اندازه‌گیری‌ها</h3>
                    <span>{historyRows.length} رکورد</span>
                </div>
                {historyRows.length === 0 ? (
                    <div className="gc-empty">
                        <p>هنوز اندازه‌گیری ثبت نشده است.</p>
                        <button type="button" className="gc-primary-btn" onClick={openAddModal}>
                            افزودن داده جدید
                        </button>
                    </div>
                ) : (
                    <div className="gc-history-list">
                        {historyRows.map((record) => {
                            const age = ageInMonths(record.date, child.birthDate);
                            const rowKey = record.id || record.date;
                            const open = expandedId === rowKey;
                            const metricView = analyzeRecordMetric(activeMetric, child, record);
                            const rowPercentile = roundPercentile(metricView.percentile);
                            return (
                                <article key={rowKey} className={`gc-history-item ${open ? 'is-open' : ''}`}>
                                    <button
                                        type="button"
                                        className="gc-history-main"
                                        onClick={() => setExpandedId(open ? null : rowKey)}
                                    >
                                        <div className="gc-history-title">
                                            <strong>{toShamsi(record.date)}</strong>
                                            <span>{formatAgeLabel(age)}</span>
                                        </div>
                                        <div className="gc-history-summary">
                                            <span className={activeMetric === 'height' ? 'is-focus' : ''}>
                                                قد: {record.height != null ? `${record.height} cm` : '—'}
                                            </span>
                                            <span className={activeMetric === 'weight' ? 'is-focus' : ''}>
                                                وزن: {record.weight != null ? `${record.weight} kg` : '—'}
                                            </span>
                                            <span className={activeMetric === 'headCircumference' ? 'is-focus' : ''}>
                                                دور سر: {record.headCircumference != null ? `${record.headCircumference} cm` : '—'}
                                            </span>
                                        </div>
                                        {rowPercentile != null && (
                                            <p className="gc-history-p">
                                                {activeMeta.label}: صدک {rowPercentile} · {metricView.status}
                                            </p>
                                        )}
                                    </button>
                                    {open && (
                                        <div className="gc-history-detail">
                                            <p>
                                                در تاریخ <strong>{toShamsi(record.date)}</strong> ({formatAgeLabel(age)}) این مقادیر ثبت شده است.
                                            </p>
                                            <div className="gc-history-actions">
                                                <button type="button" className="gc-btn-edit" onClick={() => openEditModal(record)}>
                                                    <FontAwesomeIcon icon={faPen} /> ویرایش
                                                </button>
                                                {confirmDeleteId === rowKey ? (
                                                    <button type="button" className="gc-btn-delete" onClick={() => handleDelete(record)}>
                                                        تأیید حذف
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="gc-btn-delete"
                                                        onClick={() => setConfirmDeleteId(rowKey)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} /> حذف
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="gc-card">
                <button
                    type="button"
                    className={`gc-accordion ${guideOpen ? 'is-open' : ''}`}
                    onClick={() => setGuideOpen((open) => !open)}
                >
                    <span>
                        <FontAwesomeIcon icon={faInfoCircle} />
                        این نمودار چه می‌گوید؟
                    </span>
                    <FontAwesomeIcon icon={faChevronDown} />
                </button>
                {guideOpen && (
                    <div className="gc-guide">
                        <p>نمودار قد، وزن و دور سر را با منحنی استاندارد سازمان بهداشت جهانی (۰ تا ۶۰ ماه) مقایسه می‌کند.</p>
                        <p>جایگاه بین صدک ۳ و ۹۷ معمولاً در محدوده طبیعی است. تغییر ناگهانی صدک مهم‌تر از یک عدد تکی است.</p>
                        <p>این صفحه جایگزین معاینه پزشک نیست و برای پیگیری خانگی اندازه‌گیری‌ها طراحی شده است.</p>
                    </div>
                )}
            </section>

            <button type="button" className="gc-fab" onClick={openAddModal}>
                <FontAwesomeIcon icon={faPlus} />
                ثبت اندازه‌گیری
            </button>

            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                contentLabel="Growth Data Modal"
                className="gc-modal"
                overlayClassName="gc-modal-overlay"
                shouldCloseOnOverlayClick={!saving}
            >
                <h2>{editingRecord ? 'ویرایش داده رشد' : 'ثبت اندازه‌گیری جدید'}</h2>
                <div className="gc-form">
                    <label className="gc-field-label" htmlFor="growth-date">تاریخ اندازه‌گیری</label>
                    <DatePicker
                        value={form.date}
                        onChange={(date) => setForm((prev) => ({ ...prev, date }))}
                        calendar={persian}
                        locale={persian_fa}
                        format="YYYY/MM/DD"
                        placeholder="تاریخ را انتخاب کنید"
                        inputClass="gc-input"
                        containerClassName="gc-datepicker"
                        calendarPosition="top-center"
                    />
                    <label className="gc-field-label" htmlFor="growth-height">قد (cm)</label>
                    <input
                        id="growth-height"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="20"
                        max="200"
                        value={form.height}
                        onChange={(e) => setForm((prev) => ({ ...prev, height: e.target.value }))}
                        placeholder="مثلاً 72.5"
                        className="gc-input"
                    />
                    <label className="gc-field-label" htmlFor="growth-weight">وزن (kg)</label>
                    <input
                        id="growth-weight"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0.5"
                        max="80"
                        value={form.weight}
                        onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                        placeholder="مثلاً 9.2"
                        className="gc-input"
                    />
                    <label className="gc-field-label" htmlFor="growth-head">دور سر (cm)</label>
                    <input
                        id="growth-head"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="20"
                        max="70"
                        value={form.headCircumference}
                        onChange={(e) => setForm((prev) => ({ ...prev, headCircumference: e.target.value }))}
                        placeholder="مثلاً 44"
                        className="gc-input"
                    />
                </div>
                {formError && <p className="gc-form-error">{formError}</p>}
                <div className="gc-modal-actions">
                    <button type="button" className="gc-primary-btn" onClick={handleSave} disabled={saving}>
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                    </button>
                    <button type="button" className="gc-ghost-btn" onClick={closeModal} disabled={saving}>انصراف</button>
                </div>
            </Modal>
        </div>
    );
};

export default GrowthChartPage;
