import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "dashboard": "Dashboard",
            "students": "Students",
            "welcome": "Welcome",
            "total_students": "Total Students",
            "assigned_courses": "Assigned Courses",
            "manage": "Manage",
            "my_assigned_courses": "My Assigned Courses",
            "select_course": "Select Course",
            "search_student": "Search Student",
            "date": "Date",
            "reload": "Reload",
            "students_list": "Students List",
            "save_daily_attendance": "Save Daily Attendance",
            "student": "Student",
            "performance": "Performance",
            "attendance": "Attendance",
            "action": "Action",
            "report": "Report",
            "present": "P",
            "absent": "A",
            "logout": "Logout",
            "loading": "Loading...",
            "saving": "Saving...",
            "attendance_saved": "Attendance saved successfully!",
            "failed_load_summary": "Failed to load dashboard summary.",
            "failed_load_students": "Failed to load student list.",
            "failed_save_attendance": "Failed to save attendance.",
            "view_performance": "View Performance"
        }
    },
    ta: {
        translation: {
            "dashboard": "டாஷ்போர்டு",
            "students": "மாணவர்கள்",
            "welcome": "நல்வரவு",
            "total_students": "மொத்த மாணவர்கள்",
            "assigned_courses": "ஒதுக்கப்பட்ட பாடங்கள்",
            "manage": "நிர்வகி",
            "my_assigned_courses": "எனது ஒதுக்கப்பட்ட பாடங்கள்",
            "select_course": "பாடத்தைத் தேர்வுசெய்",
            "search_student": "மாணவரைத் தேடு",
            "date": "தேதி",
            "reload": "மீண்டும் ஏற்று",
            "students_list": "மாணவர்கள் பட்டியல்",
            "save_daily_attendance": "தினசரி வருகையைப் சேமி",
            "student": "மாணவர்",
            "performance": "செயல்திறன்",
            "attendance": "வருகை",
            "action": "செயல்",
            "report": "அறிக்கை",
            "present": "வ",
            "absent": "இ",
            "logout": "வெளியேறு",
            "loading": "ஏற்றப்படுகிறது...",
            "saving": "சேமிக்கப்படுகிறது...",
            "attendance_saved": "வருகை வெற்றிகரமாக சேமிக்கப்பட்டது!",
            "failed_load_summary": "டாஷ்போர்டு சுருக்கத்தை ஏற்றுவதில் தோல்வி.",
            "failed_load_students": "மாணவர் பட்டியலை ஏற்றுவதில் தோல்வி.",
            "failed_save_attendance": "வருகையை சேமிப்பதில் தோல்வி.",
            "view_performance": "செயல்திறனைப் பார்"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
