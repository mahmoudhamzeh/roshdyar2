import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import DatePicker from "react-datepicker";
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import "react-datepicker/dist/react-datepicker.css";
import './AddChildPage.css';

import { useParams } from 'react-router-dom';
import { parseISO } from 'date-fns';

const EditChildPage = () => {
    const history = useHistory();
    const { id } = useParams();
    const [formData, setFormData] = useState(null);
    const [birthDate, setBirthDate] = useState(new Date());
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openSection, setOpenSection] = useState('identity');
    const [documentFiles, setDocumentFiles] = useState([]); // For new uploads
    // We don't handle existing documents yet, that's the next step

    useEffect(() => {
        const fetchChildData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/children/${id}`);
                if (!response.ok) throw new Error('Child not found');
                const data = await response.json();

                // Ensure nested structures exist
                data.allergies = data.allergies || { types: {}, description: '' };
                data.allergies.types = data.allergies.types || {};
                data.special_illnesses = data.special_illnesses || { types: {}, description: '' };
                data.special_illnesses.types = data.special_illnesses.types || {};

                // If the child object has a 'name' but not 'firstName', parse it
                if (data.name && !data.firstName) {
                    const nameParts = data.name.split(' ');
                    data.firstName = nameParts[0];
                    data.lastName = nameParts.slice(1).join(' ');
                }

                setFormData(data);
                if (data.birthDate) setBirthDate(parseISO(data.birthDate.replace(/\//g, '-')));
                if (data.avatar) setPreview(data.avatar.startsWith('/uploads') ? `http://localhost:5000${data.avatar}` : data.avatar);

            } catch (error) {
                alert('موفق به دریافت اطلاعات کودک نشدیم.');
                history.push('/my-children');
            }
        };
        fetchChildData();
    }, [id, history]);

    const handleSectionToggle = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handleDocumentChange = (e) => {
        if (e.target.files) {
            setDocumentFiles(Array.from(e.target.files));
        }
    };

    const handleDeleteExistingDocument = (docPath) => {
        setFormData(prevState => ({
            ...prevState,
            documents: prevState.documents.filter(doc => doc !== docPath)
        }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (name === "avatar" && files && files[0]) {
            setAvatarFile(files[0]);
            setPreview(URL.createObjectURL(files[0]));
        } else if (name.includes('.')) {
            const [category, field, subField] = name.split('.');
            if (type === 'checkbox') {
                setFormData(prevState => ({
                    ...prevState,
                    [category]: {
                        ...prevState[category],
                        [field]: { ...prevState[category][field], [subField]: checked }
                    }
                }));
            } else {
                setFormData(prevState => ({
                    ...prevState,
                    [category]: { ...prevState[category], [field]: value }
                }));
            }
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (!loggedInUser || !loggedInUser.id) {
                alert('برای انجام این عملیات باید وارد شده باشید.');
                history.push('/login');
                return;
            }

            // Step 1: Handle new avatar upload
            let newAvatarPath = formData.avatar;
            if (avatarFile) {
                const avatarUploadData = new FormData();
                avatarUploadData.append('avatar', avatarFile);
                const avatarRes = await fetch(`http://localhost:5000/api/children/${id}/avatar`, {
                    method: 'POST',
                    headers: { 'x-user-id': loggedInUser.id },
                    body: avatarUploadData
                });
                if (!avatarRes.ok) throw new Error('آپلود عکس پروفایل ناموفق بود');
                const avatarResult = await avatarRes.json();
                newAvatarPath = (avatarResult.filePath || avatarResult.url || '').replace(/\\/g, "/");
            }

            // Step 2: Handle new document uploads
            let newDocumentPaths = [];
            if (documentFiles.length > 0) {
                for (const file of documentFiles) {
                    const docUploadData = new FormData();
                    docUploadData.append('document', file);
                    const docRes = await fetch(`http://localhost:5000/api/documents/${id}`, { method: 'POST', body: docUploadData });
                    if (docRes.ok) {
                        const docResult = await docRes.json();
                        const path = docResult.filePath || docResult.url;
                        if (path) newDocumentPaths.push(path.replace(/\\/g, "/"));
                    } else {
                        alert(`موفق به آپلود فایل جدید ${file.name} نشدیم.`);
                    }
                }
            }

            // Step 3: Combine all data and send PUT request
            const formattedBirthDate = format(birthDate, 'yyyy/MM/dd');
            const finalData = {
                ...formData,
                birthDate: formattedBirthDate,
                avatar: newAvatarPath,
                // Combine existing (potentially filtered) documents with newly uploaded ones
                documents: [...(formData.documents || []), ...newDocumentPaths]
            };

            const response = await fetch(`http://localhost:5000/api/children/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });

            if (!response.ok) throw new Error('Failed to update child info');

            alert('تغییرات با موفقیت ذخیره شد!');
            history.push('/my-children');

        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!formData) {
        return <p>در حال بارگذاری اطلاعات کودک...</p>;
    }

    return (
        <div className="add-child-page-v2">
            <nav className="page-nav-final">
                <button onClick={() => history.push('/my-children')} className="back-btn-add-child">
                    <span>&rarr;</span>
                    <span>بازگشت</span>
                </button>
                <h1>ویرایش اطلاعات {formData.firstName}</h1>
                <div className="nav-placeholder"></div>
            </nav>
            <div className="add-child-form-container-v2">
                <form onSubmit={handleSubmit} className="add-child-form">

                    {/* Identity Information Section */}
                    <div className="form-section">
                        <h3 className={`section-title ${openSection === 'identity' ? 'open' : ''}`} onClick={() => handleSectionToggle('identity')}>
                            <span>اطلاعات هویتی</span>
                            <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
                        </h3>
                        {openSection === 'identity' && (
                            <div className="section-content identity-section-content">
                                <div className="avatar-upload-area-v2">
                                    <label htmlFor="avatar">عکس پروفایل</label>
                                    <img src={preview || 'https://i.pravatar.cc/150?u=default'} alt="پیش‌نمایش" className="avatar-preview" />
                                    <input type="file" id="avatar" name="avatar" onChange={handleChange} accept="image/*" capture="user" />
                                </div>
                                <div className="identity-fields">
                                    <div className="form-row">
                                        <div className="form-group"><label>نام</label><input name="firstName" value={formData.firstName || ''} onChange={handleChange} required /></div>
                                        <div className="form-group"><label>نام خانوادگی</label><input name="lastName" value={formData.lastName || ''} onChange={handleChange} required /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label>کد ملی</label><input name="nationalId" value={formData.nationalId || ''} onChange={handleChange} /></div>
                                        <div className="form-group"><label>نام پدر</label><input name="fatherName" value={formData.fatherName || ''} onChange={handleChange} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label>جنسیت</label><select name="gender" value={formData.gender || 'boy'} onChange={handleChange}><option value="boy">پسر</option><option value="girl">دختر</option></select></div>
                                        <div className="form-group"><label>تاریخ تولد</label><DatePicker selected={birthDate} onChange={(date) => setBirthDate(date)} dateFormat="yyyy/MM/dd" showYearDropdown scrollableYearDropdown yearDropdownItemNumber={40} /></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Document Upload Section */}
                    <div className="form-section">
                        <h3 className={`section-title ${openSection === 'documents' ? 'open' : ''}`} onClick={() => handleSectionToggle('documents')}>
                            <span>بارگذاری مدارک</span>
                            <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
                        </h3>
                        {openSection === 'documents' && (
                            <div className="section-content">
                                <div className="form-group-full">
                                    <label>مدارک موجود</label>
                                    {formData.documents && formData.documents.length > 0 ? (
                                        <ul className="file-list existing-files">
                                            {formData.documents.map((doc, index) => (
                                                <li key={index}>
                                                    <a href={`http://localhost:5000${doc}`} target="_blank" rel="noopener noreferrer">{doc.split('/').pop()}</a>
                                                    <button type="button" onClick={() => handleDeleteExistingDocument(doc)} className="delete-doc-btn">&times;</button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>هیچ مدرکی آپلود نشده است.</p>
                                    )}
                                </div>
                                <div className="form-group-full">
                                    <label htmlFor="documents">افزودن مدارک جدید</label>
                                    <input type="file" id="documents" name="documents" onChange={handleDocumentChange} multiple accept="image/*,.pdf" />
                                    {documentFiles.length > 0 && (
                                        <ul className="file-list">
                                            {documentFiles.map((file, index) => (
                                                <li key={index}>{file.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Birth Information Section */}
                    <div className="form-section">
                        <h3 className={`section-title ${openSection === 'birth' ? 'open' : ''}`} onClick={() => handleSectionToggle('birth')}>
                            <span>اطلاعات مربوط به تولد</span>
                            <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
                        </h3>
                        {openSection === 'birth' && (
                            <div className="section-content">
                                <div className="form-row">
                                    <div className="form-group"><label>وزن هنگام تولد (g)</label><input type="number" name="birthWeight" value={formData.birthWeight || ''} onChange={handleChange} placeholder="مثال: 3200" /></div>
                                    <div className="form-group"><label>قد هنگام تولد (cm)</label><input type="number" name="birthHeight" value={formData.birthHeight || ''} onChange={handleChange} placeholder="مثال: 50" /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>دور سر (cm)</label><input type="number" name="birthHeadCircumference" value={formData.birthHeadCircumference || ''} onChange={handleChange} placeholder="مثال: 35" /></div>
                                    <div className="form-group"><label>نوع زایمان</label><select name="birthType" value={formData.birthType || 'natural'} onChange={handleChange}><option value="natural">طبیعی</option><option value="cesarean">سزارین</option></select></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>سن بارداری (هفته)</label><input type="number" name="gestationalAge" value={formData.gestationalAge || ''} onChange={handleChange} placeholder="مثال: 39" /></div>
                                    <div className="form-group"><label>محل تولد</label><input name="birthPlace" value={formData.birthPlace || ''} onChange={handleChange} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>نمره آپگار (دقیقه ۱)</label><input type="number" name="apgar1" value={formData.apgar1 || ''} onChange={handleChange} min="0" max="10" /></div>
                                    <div className="form-group"><label>نمره آپگار (دقیقه ۵)</label><input type="number" name="apgar5" value={formData.apgar5 || ''} onChange={handleChange} min="0" max="10" /></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Other Health Info */}
                    <div className="form-section">
                         <h3 className={`section-title ${openSection === 'health' ? 'open' : ''}`} onClick={() => handleSectionToggle('health')}>
                            <span>سایر اطلاعات سلامتی</span>
                            <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
                        </h3>
                        {openSection === 'health' && (
                            <div className="section-content">
                                <div className="form-row">
                                    <div className="form-group"><label>قد فعلی (cm)</label><input type="number" name="height" value={formData.height || ''} onChange={handleChange} /></div>
                                    <div className="form-group"><label>وزن فعلی (kg)</label><input type="number" step="0.1" name="weight" value={formData.weight || ''} onChange={handleChange} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>گروه خونی</label><select name="bloodType" value={formData.bloodType || 'A+'} onChange={handleChange}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>O+</option><option>O-</option></select></div>
                                    <div className="form-group"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h3 className={`section-title ${openSection === 'allergies' ? 'open' : ''}`} onClick={() => handleSectionToggle('allergies')}>
                            <span>آلرژی‌ها</span>
                            <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
                        </h3>
                        {openSection === 'allergies' && (
                            <div className="section-content">
                                <div className="checkbox-container">
                                    {Object.keys(formData.allergies.types).map(key => (
                                        <div key={key} className="checkbox-item">
                                            <input type="checkbox" id={`allergy-${key}`} name={`allergies.types.${key}`} checked={formData.allergies.types[key] || false} onChange={handleChange} />
                                            <label htmlFor={`allergy-${key}`}>{key}</label>
                                        </div>
                                    ))}
                                </div>
                                {Object.values(formData.allergies.types).some(v => v) && (
                                    <textarea name="allergies.description" value={formData.allergies.description || ''} rows="3" placeholder="توضیحات بیشتر در مورد آلرژی‌ها" onChange={handleChange}></textarea>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h3 className={`section-title ${openSection === 'illnesses' ? 'open' : ''}`} onClick={() => handleSectionToggle('illnesses')}>
                            <span>بیماری‌های خاص</span>
                            <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
                        </h3>
                        {openSection === 'illnesses' && (
                            <div className="section-content">
                                <div className="checkbox-container">
                                    {Object.keys(formData.special_illnesses.types).map(key => (
                                        <div key={key} className="checkbox-item">
                                            <input type="checkbox" id={`illness-${key}`} name={`special_illnesses.types.${key}`} checked={formData.special_illnesses.types[key] || false} onChange={handleChange} />
                                            <label htmlFor={`illness-${key}`}>{key}</label>
                                        </div>
                                    ))}
                                </div>
                                {Object.values(formData.special_illnesses.types).some(v => v) && (
                                    <textarea name="special_illnesses.description" value={formData.special_illnesses.description || ''} rows="3" placeholder="توضیحات بیشتر در مورد بیماری‌ها" onChange={handleChange}></textarea>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="form-actions"><button type="submit" className="btn-save" disabled={isSubmitting}>{isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button><button type="button" onClick={() => history.push('/my-children')} className="btn-cancel">انصراف</button></div>
                </form>
            </div>
        </div>
    );
};

export default EditChildPage;
