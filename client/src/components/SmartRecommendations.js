import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';

const SmartRecommendations = ({ child, growthTrend, vaccinationStatus }) => {
    const recommendations = new Map();

    // Growth Status Rules
    if (growthTrend.weight) {
        if (growthTrend.weight.status === 'اضافه') {
            recommendations.set('weight-high', {
                text: 'وزن کودک بالاتر از محدوده نرمال است. توصیه می‌شود به تنوع و تعادل در رژیم غذایی او توجه بیشتری داشته باشید و فعالیت بدنی او را افزایش دهید.',
                severity: 'high'
            });
        }
        if (growthTrend.weight.status === 'کمبود') {
            recommendations.set('weight-low', {
                text: 'وزن کودک پایین‌تر از محدوده نرمال است. برای اطمینان از دریافت کالری و مواد مغذی کافی، با پزشک یا متخصص تغذیه مشورت کنید.',
                severity: 'high'
            });
        }
    }

    // Growth Trend Rules
    if (growthTrend.height && growthTrend.height.trend === 'declining') {
        recommendations.set('height-decline', {
            text: 'روند صدک قدی کودک رو به کاهش است. این موضوع ممکن است نیاز به بررسی توسط پزشک داشته باشد.',
            severity: 'high'
        });
    }
    if (growthTrend.weight && growthTrend.weight.trend === 'declining') {
        recommendations.set('weight-decline', {
            text: 'روند صدک وزنی کودک رو به کاهش است. این موضوع ممکن است نیاز به بررسی توسط پزشک داشته باشد.',
            severity: 'high'
        });
    }

    // Allergies Rule
    const allergyTypes = child.allergies && child.allergies.types ? Object.values(child.allergies.types) : [];
    if (allergyTypes.some(v => v)) {
        recommendations.set('allergies', {
            text: 'با توجه به آلرژی‌های ثبت‌شده، در انتخاب مواد غذایی و محصولات بهداشتی دقت کنید. برای اطلاعات بیشتر می‌توانید به منابع معتبر مراجعه کنید.',
            severity: 'medium'
        });
    }

    // Overdue Vaccines Rule
    if (vaccinationStatus && vaccinationStatus.some(v => v.status === 'overdue')) {
        recommendations.set('overdue-vaccine', {
            text: 'برخی از واکسن‌های کودک شما به تأخیر افتاده است. لطفاً برای تکمیل واکسیناسیون در اسرع وقت به پزشک یا مرکز بهداشت مراجعه کنید.',
            severity: 'high'
        });
    }

    const finalRecommendations = Array.from(recommendations.values());

    if (finalRecommendations.length === 0) {
        finalRecommendations.push({
            id: 'all-good',
            text: 'همه چیز خوب به نظر می‌رسد! به مراقبت عالی خود از کودک ادامه دهید.',
            severity: 'low'
        });
    }

    const getSeverityClass = (severity) => {
        if (severity === 'high') return 'rec-high';
        if (severity === 'medium') return 'rec-medium';
        return 'rec-low';
    };

    return (
        <div className="recommendations-container">
            <ul>
                {finalRecommendations.map((rec, index) => (
                    <li key={index} className={getSeverityClass(rec.severity)}>
                        <FontAwesomeIcon icon={faLightbulb} />
                        <p>{rec.text}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SmartRecommendations;
