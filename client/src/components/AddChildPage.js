import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import './AddChildPage.css';

const AddChildPage = () => {
    const history = useHistory();
    const [formData, setFormData] = useState({
        // Identity Info
        firstName: '',
        lastName: '',
        nationalId: '',
        gender: 'boy',
        fatherName: '',
        // Birth Info
        birthWeight: '',
        birthHeight: '',
        birthHeadCircumference: '',
        birthType: 'natural',
        gestationalAge: '',
        birthPlace: '',
        apgar1: '',
        apgar5: '',
        // Other Info from previous form
        height: '',
        weight: '',
        bloodType: 'A+',
        allergies: {
            types: { 'غذایی': false, 'دارویی': false, 'محیطی': false, 'سایر': false },
            description: ''
        },
        special_illnesses: {
            types: { 'مزمن': false, 'ژنتیکی': false, 'تکاملی': false, 'سایر': false },
            description: ''
        }
    });
    const [birthDate, setBirthDate] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openSection, setOpenSection] = useState('identity');
    const [documentFiles, setDocumentFiles] = useState([]);

    const handleSectionToggle = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handleDocumentChange = (e) => {
        if (e.target.files) {
            setDocumentFiles(Array.from(e.target.files));
        }
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
            if (!birthDate) {
                alert('لطفا تاریخ تولد کودک را انتخاب کنید.');
                setIsSubmitting(false);
                return;
            }
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (!loggedInUser || !loggedInUser.id) {
                alert('لطفا برای افزودن کودک ابتدا وارد شوید.');
                history.push('/login');
                setIsSubmitting(false);
                return;
            }

            // Step 1: Create the child record first (without avatar)
            const gregorianDate = birthDate.toDate();
            const formattedBirthDate = gregorianDate.toISOString().split('T')[0];
            const childData = {
                ...formData,
                userId: loggedInUser.id,
                birthDate: formattedBirthDate,
                name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
                avatar: '', // Will be updated in the next step
                documents: []
            };

            const createChildRes = await fetch('http://localhost:5000/api/children', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': loggedInUser.id
                },
                body: JSON.stringify(childData)
            });

            if (!createChildRes.ok) throw new Error('Failed to add child');
            const newChild = await createChildRes.json();
            const newChildId = newChild.id;

            // Step 2: Upload avatar for the newly created child
            if (avatarFile) {
                const avatarUploadData = new FormData();
                avatarUploadData.append('avatar', avatarFile);
                const avatarRes = await fetch(`http://localhost:5000/api/children/${newChildId}/avatar`, {
                    method: 'POST',
                    headers: { 'x-user-id': loggedInUser.id },
                    body: avatarUploadData
                });
                if (!avatarRes.ok) {
                    // Even if avatar fails, the child was created.
                    alert('کودک با موفقیت اضافه شد، اما آپلود عکس پروفایل با مشکل مواجه شد. می‌توانید بعداً آن را ویرایش کنید.');
                }
            }

            // Step 3: Upload documents for the newly created child
            if (documentFiles.length > 0) {
                // This part is tricky because the server endpoint for documents is one-by-one.
                // A better server API would accept multiple files.
                // For now, we upload them sequentially.
                for (const file of documentFiles) {
                    const docUploadData = new FormData();
                    docUploadData.append('document', file);
                    // We don't have a title, so server will use filename.
                    const docRes = await fetch(`http://localhost:5000/api/documents/${newChildId}`, {
                        method: 'POST',
                        body: docUploadData
                    });
                    if (!docRes.ok) {
                        // If a document fails, the child is already created. This is a flaw in the current API design.
                        // We'll alert the user and proceed.
                        alert(`موفق به آپلود فایل ${file.name} نشدیم، اما کودک با موفقیت ساخته شد. می‌توانید بعداً مدرک را اضافه کنید.`);
                    }
                }
            }

            // Step 4: Final success message and navigation
            alert('کودک و مدارک با موفقیت اضافه شدند!');
            window.location.href = '/my-children'; // Force a full page reload to get fresh data

        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="add-child-page-v2">
            <nav className="page-nav-final">
                <button onClick={() => history.push('/my-children')} className="back-btn-add-child">
                    <span>&rarr;</span>
                    <span>بازگشت</span>
                </button>
                <h1>افزودن کودک جدید</h1>
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
                                        <div className="form-group"><label>نام</label><input name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                                        <div className="form-group"><label>نام خانوادگی</label><input name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label>کد ملی</label><input name="nationalId" value={formData.nationalId} onChange={handleChange} /></div>
                                        <div className="form-group"><label>نام پدر</label><input name="fatherName" value={formData.fatherName} onChange={handleChange} /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label>جنسیت</label><select name="gender" value={formData.gender} onChange={handleChange}><option value="boy">پسر</option><option value="girl">دختر</option></select></div>
                                        <div className="form-group"><label>تاریخ تولد</label>
                                            <DatePicker
                                                value={birthDate}
                                                onChange={setBirthDate}
                                                calendar={persian}
                                                locale={persian_fa}
                                                format="YYYY/MM/DD"
                                                placeholder="تاریخ تولد را انتخاب کنید"
                                                inputClass="form-control"
                                                style={{ textAlign: 'center' }}
                                            />
                                        </div>
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
                                    <label htmlFor="documents">مدارک پزشکی (مانند برگه بیمارستان)</label>
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
                                    <div className="form-group"><label>وزن هنگام تولد (g)</label><input type="number" name="birthWeight" value={formData.birthWeight} onChange={handleChange} placeholder="مثال: 3200" /></div>
                                    <div className="form-group"><label>قد هنگام تولد (cm)</label><input type="number" name="birthHeight" value={formData.birthHeight} onChange={handleChange} placeholder="مثال: 50" /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>دور سر (cm)</label><input type="number" name="birthHeadCircumference" value={formData.birthHeadCircumference} onChange={handleChange} placeholder="مثال: 35" /></div>
                                    <div className="form-group"><label>نوع زایمان</label><select name="birthType" value={formData.birthType} onChange={handleChange}><option value="natural">طبیعی</option><option value="cesarean">سزارین</option></select></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>سن بارداری (هفته)</label><input type="number" name="gestationalAge" value={formData.gestationalAge} onChange={handleChange} placeholder="مثال: 39" /></div>
                                    <div className="form-group"><label>محل تولد</label><input name="birthPlace" value={formData.birthPlace} onChange={handleChange} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>نمره آپگار (دقیقه ۱)</label><input type="number" name="apgar1" value={formData.apgar1} onChange={handleChange} min="0" max="10" /></div>
                                    <div className="form-group"><label>نمره آپگار (دقیقه ۵)</label><input type="number" name="apgar5" value={formData.apgar5} onChange={handleChange} min="0" max="10" /></div>
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
                                    <div className="form-group"><label>قد فعلی (cm)</label><input type="number" name="height" value={formData.height} onChange={handleChange} /></div>
                                    <div className="form-group"><label>وزن فعلی (kg)</label><input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>گروه خونی</label><select name="bloodType" value={formData.bloodType} onChange={handleChange}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>O+</option><option>O-</option></select></div>
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
                                            <input type="checkbox" id={`allergy-${key}`} name={`allergies.types.${key}`} checked={formData.allergies.types[key]} onChange={handleChange} />
                                            <label htmlFor={`allergy-${key}`}>{key}</label>
                                        </div>
                                    ))}
                                </div>
                                {Object.values(formData.allergies.types).some(v => v) && (
                                    <textarea name="allergies.description" value={formData.allergies.description} rows="3" placeholder="توضیحات بیشتر در مورد آلرژی‌ها" onChange={handleChange}></textarea>
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
                                            <input type="checkbox" id={`illness-${key}`} name={`special_illnesses.types.${key}`} checked={formData.special_illnesses.types[key]} onChange={handleChange} />
                                            <label htmlFor={`illness-${key}`}>{key}</label>
                                        </div>
                                    ))}
                                </div>
                                {Object.values(formData.special_illnesses.types).some(v => v) && (
                                    <textarea name="special_illnesses.description" value={formData.special_illnesses.description} rows="3" placeholder="توضیحات بیشتر در مورد بیماری‌ها" onChange={handleChange}></textarea>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="form-actions"><button type="submit" className="btn-save" disabled={isSubmitting}>{isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}</button><button type="button" onClick={() => history.push('/my-children')} className="btn-cancel">انصراف</button></div>
                </form>
            </div>
        </div>
    );
};

export default AddChildPage;