import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import DateObject from 'react-date-object';
import gregorian from 'react-date-object/calendars/gregorian';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faBaby,
    faHeartbeat,
    faFileMedical,
    faCamera,
    faCheck
} from '@fortawesome/free-solid-svg-icons';
import './AddChildPage.css';

const STEPS = [
    { id: 'identity', title: 'هویت', hint: 'نام و مشخصات اصلی', icon: faUser },
    { id: 'birth', title: 'تولد', hint: 'اطلاعات هنگام تولد', icon: faBaby },
    { id: 'health', title: 'سلامت', hint: 'قد، وزن و آلرژی', icon: faHeartbeat },
    { id: 'docs', title: 'مدارک', hint: 'عکس و پرونده پزشکی', icon: faFileMedical }
];

const DEFAULT_ALLERGY_TYPES = { 'غذایی': false, 'دارویی': false, 'محیطی': false, 'سایر': false };
const DEFAULT_ILLNESS_TYPES = { 'مزمن': false, 'ژنتیکی': false, 'تکاملی': false, 'سایر': false };

const parseBirthDate = (value) => {
    if (!value) return null;
    try {
        const normalized = String(value).replace(/\//g, '-');
        return new DateObject({ date: normalized, calendar: gregorian }).convert(persian);
    } catch {
        return null;
    }
};

const EditChildPage = () => {
    const history = useHistory();
    const { id } = useParams();
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState(null);
    const [birthDate, setBirthDate] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [documentFiles, setDocumentFiles] = useState([]);
    const [stepError, setStepError] = useState('');

    useEffect(() => {
        const fetchChildData = async () => {
            try {
                const response = await fetch(`/api/children/${id}`);
                if (!response.ok) throw new Error('Child not found');
                const data = await response.json();

                data.allergies = data.allergies || { types: {}, description: '' };
                data.allergies.types = { ...DEFAULT_ALLERGY_TYPES, ...(data.allergies.types || {}) };
                data.special_illnesses = data.special_illnesses || { types: {}, description: '' };
                data.special_illnesses.types = {
                    ...DEFAULT_ILLNESS_TYPES,
                    ...(data.special_illnesses.types || {})
                };

                if (data.name && !data.firstName) {
                    const nameParts = data.name.split(' ');
                    data.firstName = nameParts[0];
                    data.lastName = nameParts.slice(1).join(' ');
                }

                setFormData(data);
                setBirthDate(parseBirthDate(data.birthDate));
                if (data.avatar) {
                    setPreview(data.avatar.startsWith('/uploads') ? `${data.avatar}` : data.avatar);
                }
            } catch {
                alert('موفق به دریافت اطلاعات کودک نشدیم.');
                history.push('/my-children');
            }
        };
        fetchChildData();
    }, [id, history]);

    const handleDocumentChange = (e) => {
        if (e.target.files) setDocumentFiles(Array.from(e.target.files));
    };

    const handleDeleteExistingDocument = (docPath) => {
        setFormData((prev) => ({
            ...prev,
            documents: (prev.documents || []).filter((doc) => doc !== docPath)
        }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (name === 'avatar' && files && files[0]) {
            setAvatarFile(files[0]);
            setPreview(URL.createObjectURL(files[0]));
            return;
        }
        if (name.includes('.')) {
            const [category, field, subField] = name.split('.');
            if (type === 'checkbox') {
                setFormData((prev) => ({
                    ...prev,
                    [category]: {
                        ...prev[category],
                        [field]: { ...prev[category][field], [subField]: checked }
                    }
                }));
            } else {
                setFormData((prev) => ({
                    ...prev,
                    [category]: { ...prev[category], [field]: value }
                }));
            }
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateStep = (index) => {
        if (index === 0) {
            if (!formData.firstName?.trim()) return 'نام کودک را وارد کنید.';
            if (!formData.lastName?.trim()) return 'نام خانوادگی را وارد کنید.';
            if (!birthDate) return 'تاریخ تولد را انتخاب کنید.';
        }
        return '';
    };

    const goNext = () => {
        const error = validateStep(step);
        if (error) {
            setStepError(error);
            return;
        }
        setStepError('');
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        setStepError('');
        if (step === 0) {
            history.push('/my-children');
            return;
        }
        setStep((s) => Math.max(s - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validateStep(0);
        if (error) {
            setStep(0);
            setStepError(error);
            return;
        }

        setIsSubmitting(true);
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (!loggedInUser || !loggedInUser.id) {
                alert('برای انجام این عملیات باید وارد شده باشید.');
                history.push('/login');
                return;
            }

            let newAvatarPath = formData.avatar;
            if (avatarFile) {
                const avatarUploadData = new FormData();
                avatarUploadData.append('avatar', avatarFile);
                const avatarRes = await fetch(`/api/children/${id}/avatar`, {
                    method: 'POST',
                    headers: { 'x-user-id': loggedInUser.id },
                    body: avatarUploadData
                });
                if (!avatarRes.ok) throw new Error('آپلود عکس پروفایل ناموفق بود');
                const avatarResult = await avatarRes.json();
                newAvatarPath = (avatarResult.filePath || avatarResult.url || '').replace(/\\/g, '/');
            }

            const newDocumentPaths = [];
            if (documentFiles.length > 0) {
                for (const file of documentFiles) {
                    const docUploadData = new FormData();
                    docUploadData.append('document', file);
                    const docRes = await fetch(`/api/documents/${id}`, {
                        method: 'POST',
                        body: docUploadData
                    });
                    if (docRes.ok) {
                        const docResult = await docRes.json();
                        const path = docResult.filePath || docResult.url;
                        if (path) newDocumentPaths.push(path.replace(/\\/g, '/'));
                    } else {
                        alert(`موفق به آپلود فایل جدید ${file.name} نشدیم.`);
                    }
                }
            }

            const gregorianDate = birthDate.toDate ? birthDate.toDate() : birthDate.convert(gregorian).toDate();
            const formattedBirthDate = gregorianDate.toISOString().split('T')[0];
            const finalData = {
                ...formData,
                name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
                birthDate: formattedBirthDate,
                avatar: newAvatarPath,
                documents: [...(formData.documents || []), ...newDocumentPaths]
            };

            const response = await fetch(`/api/children/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });

            if (!response.ok) throw new Error('ذخیره تغییرات ناموفق بود.');

            alert('تغییرات با موفقیت ذخیره شد!');
            history.push('/my-children');
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!formData) {
        return (
            <div className="add-child-page-v2">
                <p style={{ textAlign: 'center', padding: '3rem 1rem' }}>در حال بارگذاری اطلاعات کودک...</p>
            </div>
        );
    }

    const progress = ((step + 1) / STEPS.length) * 100;
    const isLast = step === STEPS.length - 1;

    return (
        <div className="add-child-page-v2 child-wizard-page">
            <nav className="page-nav-final">
                <button type="button" onClick={goBack} className="back-btn-add-child">
                    <span>&rarr;</span>
                    <span>{step === 0 ? 'بازگشت' : 'قبلی'}</span>
                </button>
                <h1>ویرایش {formData.firstName || 'کودک'}</h1>
            </nav>

            <div className="add-child-form-container-v2 wizard-shell">
                <div className="wizard-intro">
                    <p className="wizard-kicker">ویرایش مرحله‌به‌مرحله</p>
                    <h2>{STEPS[step].title}</h2>
                    <p className="wizard-hint">{STEPS[step].hint} — فقط همین مرحله را ببینید و ذخیره کنید.</p>
                </div>

                <div className="wizard-progress" aria-hidden="true">
                    <div className="wizard-progress-track">
                        <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <ol className="wizard-steps">
                        {STEPS.map((item, index) => {
                            const state = index < step ? 'done' : index === step ? 'active' : '';
                            return (
                                <li key={item.id} className={`wizard-step ${state}`}>
                                    <span className="wizard-step-dot">
                                        {index < step ? (
                                            <FontAwesomeIcon icon={faCheck} />
                                        ) : (
                                            <FontAwesomeIcon icon={item.icon} />
                                        )}
                                    </span>
                                    <span className="wizard-step-label">{item.title}</span>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                <form onSubmit={handleSubmit} className="add-child-form wizard-form" noValidate>
                    {stepError && <div className="wizard-error" role="alert">{stepError}</div>}

                    {step === 0 && (
                        <div className="wizard-panel">
                            <div className="avatar-upload-area-v2 wizard-avatar">
                                <div className="avatar-preview-wrap">
                                    {preview ? (
                                        <img src={preview} alt="پیش‌نمایش" className="avatar-preview" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            <FontAwesomeIcon icon={faCamera} />
                                            <span>عکس</span>
                                        </div>
                                    )}
                                </div>
                                <label htmlFor="avatar" className="avatar-pick-btn">تغییر عکس پروفایل</label>
                                <input
                                    type="file"
                                    id="avatar"
                                    name="avatar"
                                    onChange={handleChange}
                                    accept="image/*"
                                    capture="user"
                                    className="visually-hidden"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>نام <span className="req">*</span></label>
                                    <input name="firstName" value={formData.firstName || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>نام خانوادگی <span className="req">*</span></label>
                                    <input name="lastName" value={formData.lastName || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>جنسیت</label>
                                    <div className="choice-pills">
                                        <button
                                            type="button"
                                            className={`choice-pill ${formData.gender === 'boy' ? 'selected' : ''}`}
                                            onClick={() => setFormData((p) => ({ ...p, gender: 'boy' }))}
                                        >
                                            پسر
                                        </button>
                                        <button
                                            type="button"
                                            className={`choice-pill ${formData.gender === 'girl' ? 'selected' : ''}`}
                                            onClick={() => setFormData((p) => ({ ...p, gender: 'girl' }))}
                                        >
                                            دختر
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>تاریخ تولد <span className="req">*</span></label>
                                    <DatePicker
                                        value={birthDate}
                                        onChange={(date) => {
                                            setBirthDate(date);
                                            setStepError('');
                                        }}
                                        calendar={persian}
                                        locale={persian_fa}
                                        format="YYYY/MM/DD"
                                        placeholder="انتخاب تاریخ"
                                        inputClass="form-control"
                                        containerClassName="wizard-datepicker"
                                        style={{ textAlign: 'center', width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>کد ملی</label>
                                    <input name="nationalId" value={formData.nationalId || ''} onChange={handleChange} inputMode="numeric" />
                                </div>
                                <div className="form-group">
                                    <label>نام پدر</label>
                                    <input name="fatherName" value={formData.fatherName || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="wizard-panel">
                            <p className="wizard-optional-note">اگر الآن اطلاعات کامل نیست، رد کنید و بعداً برگردید.</p>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>وزن هنگام تولد (گرم)</label>
                                    <input type="number" name="birthWeight" value={formData.birthWeight || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>قد هنگام تولد (سانتی‌متر)</label>
                                    <input type="number" name="birthHeight" value={formData.birthHeight || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>دور سر (سانتی‌متر)</label>
                                    <input type="number" name="birthHeadCircumference" value={formData.birthHeadCircumference || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>نوع زایمان</label>
                                    <div className="choice-pills">
                                        <button
                                            type="button"
                                            className={`choice-pill ${(formData.birthType || 'natural') === 'natural' ? 'selected' : ''}`}
                                            onClick={() => setFormData((p) => ({ ...p, birthType: 'natural' }))}
                                        >
                                            طبیعی
                                        </button>
                                        <button
                                            type="button"
                                            className={`choice-pill ${formData.birthType === 'cesarean' ? 'selected' : ''}`}
                                            onClick={() => setFormData((p) => ({ ...p, birthType: 'cesarean' }))}
                                        >
                                            سزارین
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>سن بارداری (هفته)</label>
                                    <input type="number" name="gestationalAge" value={formData.gestationalAge || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>محل تولد</label>
                                    <input name="birthPlace" value={formData.birthPlace || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>نمره آپگار (دقیقه ۱)</label>
                                    <input type="number" name="apgar1" value={formData.apgar1 || ''} onChange={handleChange} min="0" max="10" />
                                </div>
                                <div className="form-group">
                                    <label>نمره آپگار (دقیقه ۵)</label>
                                    <input type="number" name="apgar5" value={formData.apgar5 || ''} onChange={handleChange} min="0" max="10" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="wizard-panel">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>قد فعلی (سانتی‌متر)</label>
                                    <input type="number" name="height" value={formData.height || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>وزن فعلی (کیلوگرم)</label>
                                    <input type="number" step="0.1" name="weight" value={formData.weight || ''} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>گروه خونی</label>
                                    <select name="bloodType" value={formData.bloodType || ''} onChange={handleChange}>
                                        <option>A+</option>
                                        <option>A-</option>
                                        <option>B+</option>
                                        <option>B-</option>
                                        <option>AB+</option>
                                        <option>AB-</option>
                                        <option>O+</option>
                                        <option>O-</option>
                                        <option value="">نمی‌دانم</option>
                                    </select>
                                </div>
                                <div className="form-group" />
                            </div>

                            <div className="wizard-subblock">
                                <h3>آلرژی‌ها</h3>
                                <div className="checkbox-container">
                                    {Object.keys(formData.allergies.types).map((key) => (
                                        <label key={key} className={`chip-check ${formData.allergies.types[key] ? 'on' : ''}`} htmlFor={`allergy-${key}`}>
                                            <input
                                                type="checkbox"
                                                id={`allergy-${key}`}
                                                name={`allergies.types.${key}`}
                                                checked={!!formData.allergies.types[key]}
                                                onChange={handleChange}
                                            />
                                            <span>{key}</span>
                                        </label>
                                    ))}
                                </div>
                                {Object.values(formData.allergies.types).some(Boolean) && (
                                    <textarea
                                        name="allergies.description"
                                        value={formData.allergies.description || ''}
                                        rows="3"
                                        placeholder="توضیح کوتاه درباره آلرژی"
                                        onChange={handleChange}
                                    />
                                )}
                            </div>

                            <div className="wizard-subblock">
                                <h3>بیماری‌های خاص</h3>
                                <div className="checkbox-container">
                                    {Object.keys(formData.special_illnesses.types).map((key) => (
                                        <label key={key} className={`chip-check ${formData.special_illnesses.types[key] ? 'on' : ''}`} htmlFor={`illness-${key}`}>
                                            <input
                                                type="checkbox"
                                                id={`illness-${key}`}
                                                name={`special_illnesses.types.${key}`}
                                                checked={!!formData.special_illnesses.types[key]}
                                                onChange={handleChange}
                                            />
                                            <span>{key}</span>
                                        </label>
                                    ))}
                                </div>
                                {Object.values(formData.special_illnesses.types).some(Boolean) && (
                                    <textarea
                                        name="special_illnesses.description"
                                        value={formData.special_illnesses.description || ''}
                                        rows="3"
                                        placeholder="توضیح کوتاه درباره بیماری"
                                        onChange={handleChange}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="wizard-panel">
                            <div className="form-group-full wizard-file-box">
                                <label>مدارک موجود</label>
                                {formData.documents && formData.documents.length > 0 ? (
                                    <ul className="file-list existing-files">
                                        {formData.documents.map((doc, index) => (
                                            <li key={`${doc}-${index}`}>
                                                <a href={`${doc}`} target="_blank" rel="noopener noreferrer">
                                                    {String(doc).split('/').pop()}
                                                </a>
                                                <button type="button" onClick={() => handleDeleteExistingDocument(doc)} className="delete-doc-btn">
                                                    &times;
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="field-note">هیچ مدرکی آپلود نشده است.</p>
                                )}
                            </div>
                            <div className="form-group-full wizard-file-box" style={{ marginTop: '1rem' }}>
                                <label htmlFor="documents">افزودن مدارک جدید</label>
                                <input
                                    type="file"
                                    id="documents"
                                    name="documents"
                                    onChange={handleDocumentChange}
                                    multiple
                                    accept="image/*,.pdf"
                                />
                                {documentFiles.length > 0 && (
                                    <ul className="file-list">
                                        {documentFiles.map((file, index) => (
                                            <li key={`${file.name}-${index}`}>{file.name}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="wizard-actions">
                        <button type="button" className="btn-cancel" onClick={goBack}>
                            {step === 0 ? 'انصراف' : 'مرحله قبل'}
                        </button>
                        {!isLast ? (
                            <div className="wizard-next-group">
                                {step > 0 && (
                                    <button type="button" className="btn-skip" onClick={goNext}>
                                        فعلاً رد کن
                                    </button>
                                )}
                                <button type="button" className="btn-save" onClick={goNext}>
                                    مرحله بعد
                                </button>
                            </div>
                        ) : (
                            <button type="submit" className="btn-save" disabled={isSubmitting}>
                                {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditChildPage;
