import * as React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import { useToast } from "../context/NotificationContext";
import { useTranslation } from "react-i18next";

interface Course {
    id: number;
    course_name: string;
    course_description: string;
    duration: string;
    course_image?: string;
    total_classes_completed: number;
}

interface Enrollment {
    id: number;
    student: { username: string; email: string; };
    course: {
        id: number;
        course_name: string;
        course_description: string;
        duration: string;
        course_image?: string;
        total_classes_completed: number;
    };
    enrollment_date: string;
    grade: { grade: string | null; };
    attendance: {
        total_classes: number;
        attended_classes: number;
        percentage: number;
        attendance_percentage?: number; // Added for compatibility
    } | null;
    manual_progress: number;
    rank: number | string;
    course_total_students: number;
}

interface Student {
    id: number;
    email: string;
    username: string;
    profile_picture?: string;
    xp: number;
    level: number;
    full_name?: string;
    parent_name?: string;
    dob?: string;
    address?: string;
    school_name?: string;
    standard_grade?: string;
}

interface AttendanceLog {
    id: number;
    date: string;
    day: string;
    status: 'present' | 'absent';
}

interface Badge {
    id: number;
    badge: {
        name: string;
        description: string;
        icon?: string;
    };
    earned_at: string;
}

interface ChallengeSubmission {
    id: number;
    challenge: number;
    text_response?: string;
    audio_response?: string;
    file_response?: string;
    status: 'pending' | 'approved' | 'correction';
    feedback?: string;
    submitted_at: string;
    quiz_score?: number;
    total_quiz_questions?: number;
}

interface DailyChallengeQuestion {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
}

interface DailyChallenge {
    id: number;
    mission: string;
    challenge_type: 'mission' | 'quiz';
    deadline: string;
    enrollment_id: number;
    course_name: string;
    allow_audio: boolean;
    allow_text: boolean;
    allow_file: boolean;
    reward_xp: number;
    user_submission?: ChallengeSubmission;
    quiz_questions?: DailyChallengeQuestion[];
}

interface DashboardData {
    is_staff: boolean;
    student: Student;
    enrollments: Enrollment[];
    stats: {
        overall_attendance: number;
        xp: number;
        level: number;
    };
    recent_badges: Badge[];
}

export function meta() {
    return [{ title: "Vetri Academy | Student Portal" }];
}

// ── Icons ──
const IconHome = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const IconBook = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const IconPlus = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>;
const IconUser = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const IconLogout = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const IconDownload = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const IconCamera = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconCalendar = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconTrophy = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const IconStar = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const IconClock = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

type Tab = "overview" | "courses" | "catalog" | "attendance" | "profile";

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const getImageUrl = (path: string | undefined | null) => {
        if (!path) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop";
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `http://localhost:8000${cleanPath}`;
    };

    const getAttendanceColor = (pct: number) => {
        if (pct >= 85) return "#10B981";
        if (pct >= 70) return "#F59E0B";
        return "#EF4444";
    };

    const [data, setData] = useState<DashboardData | null>(null);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<string>("all");
    // Attendance tab state
    const [logEnrollmentId, setLogEnrollmentId] = useState<number | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logFilter, setLogFilter] = useState<'all' | 'month' | '3months'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    // Staff mark state
    const [markDate, setMarkDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [markStatus, setMarkStatus] = useState<'present' | 'absent'>('present');
    const [marking, setMarking] = useState(false);

    // Daily Challenge state
    const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
    const [challengesLoading, setChallengesLoading] = useState(false);
    const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);
    const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
    const [submissionType, setSubmissionType] = useState<'text' | 'audio' | 'file' | 'quiz' | null>(null);
    const [challengeText, setChallengeText] = useState("");
    const [challengeFile, setChallengeFile] = useState<File | null>(null);
    const [quizResponses, setQuizResponses] = useState<Record<number, string>>({});

    const navigate = useNavigate();

    const handleError = (error: any, defaultMsg?: string) => {
        if (error.response?.status === 401) { localStorage.clear(); navigate("/login"); return; }
        if (defaultMsg) showToast(error.response?.data?.detail || defaultMsg, "error");
        console.error(error);
    };

    const toggleLanguage = () => {
        const nextLng = i18n.language === 'en' ? 'ta' : 'en';
        i18n.changeLanguage(nextLng);
    };

    const fetchData = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        try {
            const [dashRes, courseRes] = await Promise.all([
                axios.get("http://localhost:8000/api/lms/dashboard/", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("http://localhost:8000/api/lms/courses/")
            ]);
            setData(dashRes.data);
            setAllCourses(courseRes.data);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    };

    const fetchChallenges = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        setChallengesLoading(true);
        try {
            const res = await axios.get("http://localhost:8000/api/lms/daily-challenges/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChallenges(res.data);
        } catch (err) { console.error(err); }
        finally { setChallengesLoading(false); }
    };

    const fetchMyLogs = async () => {
        setLogsLoading(true);
        try {
            const resp = await axios.get(`http://localhost:8000/api/lms/attendance/logs/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
            });
            setAttendanceLogs(resp.data);
        } catch (err) {
            showToast("Failed to load attendance logs", "error");
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchMyLogs();
        fetchChallenges();
    }, []);

    const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const token = localStorage.getItem("access_token");
        const formData = new FormData();
        formData.append("profile_picture", file);
        setUploading(true);
        try {
            await axios.patch("http://localhost:8000/api/accounts/profile/", formData, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
            });
            const res = await axios.get("http://localhost:8000/api/lms/dashboard/", { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data);
        } catch (error) { handleError(error, "Failed to update profile picture."); }
        finally { setUploading(false); }
    };

    const handleEnroll = async (courseId: number, courseName: string) => {
        const token = localStorage.getItem("access_token");
        // For now using native confirm as it's less intrusive than alert, but will replace if needed.
        if (!window.confirm(`Enroll in "${courseName}"?`)) return;
        try {
            const res = await axios.post("http://localhost:8000/api/lms/enroll/", { course_id: courseId }, { headers: { Authorization: `Bearer ${token}` } });
            showToast(res.data.detail || `Successfully enrolled in ${courseName}!`, "success");
            const dashRes = await axios.get("http://localhost:8000/api/lms/dashboard/", { headers: { Authorization: `Bearer ${token}` } });
            setData(dashRes.data);
            setActiveTab("courses");
            fetchChallenges(); // Refresh challenges after enrollment
        } catch (error: any) { handleError(error, "Enrollment failed."); }
    };

    const handleChallengeSubmit = async () => {
        if (!activeSubmissionId) return;
        const token = localStorage.getItem("access_token");
        const formData = new FormData();
        formData.append("challenge_id", activeSubmissionId.toString());

        if (submissionType === 'quiz') {
            // For quiz, we send a JSON object with responses
            try {
                setIsSubmittingChallenge(true);
                const res = await axios.post("http://localhost:8000/api/lms/daily-challenges/submit/", {
                    challenge_id: activeSubmissionId,
                    responses: quizResponses
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast(res.data.detail || "Quiz submitted successfully!", "success");
                setActiveSubmissionId(null);
                setSubmissionType(null);
                setQuizResponses({});
                fetchChallenges();
                fetchData(); // Refresh user data to show updated XP/Level
                return;
            } catch (err) {
                handleError(err, "Quiz submission failed.");
                return;
            } finally {
                setIsSubmittingChallenge(false);
            }
        }

        if (submissionType === 'text') formData.append("text_response", challengeText);
        else if (submissionType === 'audio' && challengeFile) formData.append("audio_response", challengeFile);
        else if (submissionType === 'file' && challengeFile) formData.append("file_response", challengeFile);

        setIsSubmittingChallenge(true);
        try {
            await axios.post("http://localhost:8000/api/lms/daily-challenges/submit/", formData, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
            });
            showToast("Challenge submitted successfully!", "success");
            setActiveSubmissionId(null);
            setSubmissionType(null);
            setChallengeText("");
            setChallengeFile(null);
            fetchChallenges();
        } catch (err) {
            handleError(err, "Submission failed.");
        } finally {
            setIsSubmittingChallenge(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0F1117' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #2D3748', borderTopColor: '#F59E0B', animation: 'spin 0.8s linear infinite' }}></div>
            <p style={{ color: '#64748B', marginTop: 16, fontSize: 14, fontWeight: 600 }}>{t("loading")}</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const enrolledIds = data?.enrollments.map(e => e.course.id) || [];
    const availableCourses = allCourses.filter(c => !enrolledIds.includes(c.id));
    const avgAttendance = data?.stats.overall_attendance || 0;
    const bestGrade = data?.enrollments.map(e => e.grade?.grade).filter(Boolean)[0] || "—";

    const navItems: { tab: Tab; label: string; icon: React.ReactNode; path?: string }[] = [
        { tab: "overview", label: t("dashboard"), icon: <IconHome /> },
        { tab: "courses", label: t("my_assigned_courses"), icon: <IconBook /> },
        { tab: "catalog", label: "Catalog", icon: <IconPlus /> },
        { tab: "attendance", label: t("attendance"), icon: <IconCalendar /> },
        ...(data?.is_staff ? [{ tab: "overview" as Tab, label: "Admin Attendance Log", icon: <IconCalendar />, path: "/admin-attendance" }] : []),
        { tab: "overview", label: "Competitions", icon: <IconTrophy />, path: "/competitions" },
        { tab: "overview", label: "XP & Badges", icon: <IconStar />, path: "/xp-badges" },
        { tab: "profile", label: "Profile", icon: <IconUser /> },
    ];

    const handleLogCourseChange = async (studentId: number) => {
        setLogsLoading(true);
        try {
            const resp = await axios.get(`http://localhost:8000/api/lms/attendance/logs/${studentId}/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
            });
            setAttendanceLogs(resp.data);
        } catch (err) {
            showToast("Failed to load attendance logs", "error");
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchLogs = async (enrollmentId: number) => {
        const token = localStorage.getItem("access_token");
        setLogsLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/lms/attendance/logs/${enrollmentId}/`, { headers: { Authorization: `Bearer ${token}` } });
            setAttendanceLogs(res.data);
        } catch (err) { handleError(err); }
        finally { setLogsLoading(false); }
    };

    const handleDownloadCSV = async (enrollmentId: number, courseName: string) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await axios.get(`http://localhost:8000/api/lms/attendance/export/${enrollmentId}/`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${courseName.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) { handleError(err, "Failed to download CSV."); }
    };

    const handleMarkAttendance = async () => {
        if (!logEnrollmentId) return;
        const token = localStorage.getItem("access_token");
        setMarking(true);
        try {
            await axios.post("http://localhost:8000/api/lms/attendance/mark/", {
                enrollment_id: logEnrollmentId,
                date: markDate,
                status: markStatus
            }, { headers: { Authorization: `Bearer ${token}` } });

            // Refresh logs and dashboard data
            fetchLogs(logEnrollmentId);
            const res = await axios.get("http://localhost:8000/api/lms/dashboard/", { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data);
            showToast("Attendance marked successfully.", "success");
        } catch (err) { handleError(err, "Failed to mark attendance."); }
        finally { setMarking(false); }
    };

    const filterLogs = (logs: AttendanceLog[]) => {
        if (logFilter === 'all') return logs;
        const now = new Date();
        const months = logFilter === 'month' ? 1 : 3;
        const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        return logs.filter(l => new Date(l.date) >= cutoff);
    };

    const getGradeColor = (g: string | null) => {
        if (!g) return '#64748B';
        if (g === 'A' || g === 'A+') return '#10B981';
        if (g === 'B') return '#3B82F6';
        if (g === 'C') return '#F59E0B';
        return '#EF4444';
    };


    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#0F1117', color: '#F1F5F9', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1A1F2E; } ::-webkit-scrollbar-thumb { background: #2D3748; border-radius: 3px; }
                .fade-in { animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); } 
                @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                .card { background: #1A1F2E; border: 1px solid #2D3748; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); padding: 28px; transition: transform 0.3s ease, box-shadow 0.3s ease; }
                .btn-gold { background: linear-gradient(135deg, #F59E0B, #D97706); color: #0F1117; font-weight: 800; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 0 20px rgba(245,158,11,0.5), 0 8px 25px -5px rgba(245,158,11,0.4); }
                .nav-btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 20px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-align: left; position: relative; overflow: hidden; white-space: nowrap; }
                .nav-btn.active { background: linear-gradient(90deg, rgba(245,158,11,0.15) 0%, transparent 100%); color: #F59E0B; border-left: 4px solid #F59E0B; }
                .nav-btn.inactive { background: transparent; color: #CBD5E1; border-left: 4px solid transparent; }
                .nav-btn.inactive:hover { background: rgba(255,255,255,0.04); color: #F8FAFC; transform: translateX(6px); }
                .nav-btn.inactive:hover svg { color: #F59E0B; filter: drop-shadow(0 0 8px rgba(245,158,11,0.5)); }
                .stat-card { padding: 28px; border-radius: 16px; background: #1A1F2E; border: 1px solid #2D3748; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; overflow: hidden; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.4); }
                .stat-card:hover { transform: translateY(-5px); border-color: #F59E0B50; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
                .progress-bar { height: 16px; background: #0F172A; border-radius: 9999px; overflow: hidden; position: relative; border: 1px solid #1E293B; }
                .progress-fill { height: 100%; border-radius: 9999px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #0F1117; }
                .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
                .table-row { display: grid; align-items: center; padding: 14px 16px; border-radius: 8px; transition: all 0.2s; border-bottom: 1px solid rgba(255,255,255,0.02); }
                .table-row:nth-child(even) { background: rgba(255,255,255,0.01); }
                .table-row:hover { background: rgba(245,158,11,0.03); transform: scale(1.005); }
                .btn-csv { background: #242938; color: #94A3B8; border: 1px solid #2D3748; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
                .btn-csv:hover { background: #2D3748; color: #F1F5F9; border-color: #F59E0B; }
                input[type=text], input[type=email], input[type=password] { background: #242938; border: 1px solid #2D3748; color: #F1F5F9; border-radius: 8px; padding: 10px 14px; font-size: 14px; width: 100%; outline: none; transition: border-color 0.2s; }
                input:focus { border-color: #F59E0B; }
                .lang-switch { position: fixed; top: 20px; right: 20px; background: #111827; border: 1px solid #2D3748; color: #F59E0B; padding: 8px 16px; border-radius: 99px; font-weight: 700; font-size: 13px; cursor: pointer; z-index: 100; transition: all 0.2s; }
                .lang-switch:hover { background: #F59E0B1A; border-color: #F59E0B; }
                .badge-item:hover {
                    transform: translateY(-5px);
                    background: #1F2937 !important;
                    border-color: #F59E0B !important;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                }
                .badge-item:hover div:first-child {
                    transform: scale(1.1) rotate(5deg);
                }
                .challenge-card { background: linear-gradient(135deg, #1E293B 0%, #111827 100%); border: 1px solid #F59E0B33; border-radius: 20px; padding: 24px; position: relative; overflow: hidden; }
                .challenge-icon { position: absolute; top: -10px; right: -10px; font-size: 80px; opacity: 0.1; transform: rotate(15deg); }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .modal-content { background: #1A1F2E; border: 1px solid #2D3748; border-radius: 24px; width: 100%; max-width: 500px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative; }
            `}</style>

            <button className="lang-switch" onClick={toggleLanguage}>
                {i18n.language === 'en' ? 'தமிழ்' : 'English'}
            </button>

            {/* ── SIDEBAR ── */}
            <aside style={{ width: isSidebarCollapsed ? 80 : 260, background: 'linear-gradient(180deg, #111827 0%, #0F172A 100%)', borderRight: '1px solid #1E293B', display: 'flex', flexDirection: 'column', padding: '32px 0 24px 0', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', backdropFilter: 'blur(20px)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                {/* Logo & Toggle */}
                <div style={{ padding: '0 24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between' }}>
                    {!isSidebarCollapsed && (
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F1117', fontSize: 18 }}>V</div>
                            VETRI
                        </div>
                    )}
                    {isSidebarCollapsed && (
                        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F1117', fontSize: 18 }}>V</div>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        style={{ background: 'rgba(245,158,11,0.1)', border: 'none', color: '#F59E0B', padding: 8, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isSidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}
                    >
                        <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: isSidebarCollapsed ? '0 10px' : '0 16px 0 0' }}>
                    {navItems.map(({ tab, label, icon, path }) => (
                        <button
                            key={label}
                            onClick={() => path ? navigate(path) : setActiveTab(tab)}
                            className={`nav-btn ${!path && activeTab === tab ? 'active' : 'inactive'}`}
                            title={isSidebarCollapsed ? label : ''}
                            style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', transition: 'transform 0.3s ease', minWidth: 20 }}>{icon}</span>
                            {!isSidebarCollapsed && <span style={{ fontWeight: !path && activeTab === tab ? 700 : 500 }}>{label}</span>}
                        </button>
                    ))}
                </nav>

                {/* User + Logout */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, margin: isSidebarCollapsed ? '0 10px' : '24px 16px 0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: isSidebarCollapsed ? 0 : '0 8px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, #1E293B, #0F172A)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#F59E0B', fontSize: 18, border: '1px solid rgba(245,158,11,0.2)' }}>
                            {data?.student.profile_picture ? (
                                <img src={getImageUrl(data.student.profile_picture)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : data?.student.username[0].toUpperCase()}
                        </div>
                        {!isSidebarCollapsed && (
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data?.student.username}</div>
                                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Student Member</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => { localStorage.clear(); navigate("/login"); }}
                        className="nav-btn inactive"
                        style={{ color: '#F87171', borderLeft: isSidebarCollapsed ? 'none' : '4px solid transparent', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
                    >
                        <IconLogout /> {!isSidebarCollapsed && <span style={{ fontWeight: 600 }}>{t("logout")}</span>}
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
                {/* Page Header */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F1F5F9' }}>
                        {activeTab === 'overview' && t('dashboard')}
                        {activeTab === 'courses' && t('my_assigned_courses')}
                        {activeTab === 'catalog' && 'Course Catalog'}
                        {activeTab === 'profile' && 'My Profile'}
                        {activeTab === 'attendance' && t('attendance')}
                    </h1>
                </div>

                {/* ── OVERVIEW TAB ── */}
                {activeTab === 'overview' && (
                    <div className="fade-in">
                        {/* 4 Smaller Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 36 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Total Courses</div>
                                <div style={{ fontSize: 24, fontWeight: 900 }}>{data?.enrollments.length}</div>
                                <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.2 }}><IconBook /></div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Attendance %</div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: getAttendanceColor(avgAttendance) }}>{Math.round(avgAttendance)}%</div>
                                <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.2 }}><IconCalendar /></div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Global Progress</div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B' }}>
                                    {Math.round((data?.enrollments || []).reduce((acc, curr) => acc + (curr.attendance?.percentage || 0), 0) / (data?.enrollments.length || 1))}%
                                </div>
                                <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.2 }}><IconStar /></div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Vetri Rank</div>
                                <div style={{ fontSize: 24, fontWeight: 900 }}>#{data?.enrollments[0]?.rank || '1'}</div>
                                <div style={{ position: 'absolute', top: 15, right: 15, opacity: 0.2 }}><IconTrophy /></div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 36 }}>
                            {/* Improved Attendance Circle */}
                            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>Attendance Health</div>
                                <div style={{ position: 'relative', width: 140, height: 140 }}>
                                    <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                                        <circle cx="70" cy="70" r="60" stroke="#2D3748" strokeWidth="12" fill="transparent" />
                                        <circle cx="70" cy="70" r="60" stroke={getAttendanceColor(avgAttendance)} strokeWidth="12" fill="transparent"
                                            strokeDasharray={377} strokeDashoffset={377 - (377 * avgAttendance) / 100} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                                    </svg>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#F1F5F9' }}>{Math.round(avgAttendance)}%</div>
                                        {avgAttendance < 50 && <div style={{ fontSize: 8, fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', marginTop: 2 }}>Needs Improvement</div>}
                                    </div>
                                </div>
                                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></div> 75%+
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }}></div> 50%
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}></div> Below 50%
                                    </div>
                                </div>
                            </div>

                            {/* Badges Section */}
                            <div className="card" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>My Badges & Achievements</h2>
                                    <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                                        {data?.recent_badges.length || 0} Earned
                                    </span>
                                </div>

                                {data?.recent_badges && data.recent_badges.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 20 }}>
                                        {data.recent_badges.map((b, idx) => (
                                            <div
                                                key={b.id}
                                                className="badge-item"
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    textAlign: 'center',
                                                    padding: '16px',
                                                    background: '#11182766',
                                                    border: '1px solid #1E293B',
                                                    borderRadius: 16,
                                                    transition: 'all 0.3s ease',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 28,
                                                    marginBottom: 12,
                                                    boxShadow: '0 8px 16px rgba(180, 83, 9, 0.3)',
                                                    border: '3px solid #111827'
                                                }}>
                                                    {b.badge.icon || '🏆'}
                                                </div>
                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>{b.badge.name}</div>
                                                <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.3 }}>{b.badge.description}</div>

                                                {/* Decorative background pulse */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-20%',
                                                    right: '-20%',
                                                    width: '50%',
                                                    height: '50%',
                                                    background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
                                                    pointerEvents: 'none'
                                                }}></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px 0', background: '#11182744', borderRadius: 16, border: '1px dashed #2D3748' }}>
                                        <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
                                        <p style={{ color: '#64748B', fontSize: 14, fontWeight: 500 }}>Start your journey to earn your first badge!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 🎯 Daily Missions Section */}
                        <div style={{ marginBottom: 36 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 24 }}>🎯</span> {t('Daily Missions')}
                                </h2>
                                {challenges.length > 0 && <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{challenges.length} active tasks</span>}
                            </div>

                            {challengesLoading ? (
                                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1F2E', borderRadius: 16 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #F59E0B22', borderTopColor: '#F59E0B', animation: 'spin 0.8s linear infinite' }}></div>
                                </div>
                            ) : challenges.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                                    {challenges.map(ch => {
                                        const sub = ch.user_submission;
                                        return (
                                            <div key={ch.id} className="challenge-card">
                                                <div className="challenge-icon">🎯</div>
                                                <div style={{ position: 'relative', zIndex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>{ch.course_name}</span>
                                                        {sub && (
                                                            <span className="badge" style={{
                                                                background: sub.status === 'approved' ? '#10B98122' : sub.status === 'correction' ? '#EF444422' : '#3B82F622',
                                                                color: sub.status === 'approved' ? '#10B981' : sub.status === 'correction' ? '#EF4444' : '#3B82F6'
                                                            }}>
                                                                {sub.status.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', marginBottom: 8, lineHeight: 1.4 }}>
                                                        {ch.challenge_type === 'quiz' ? `🏆 Quiz: ${ch.mission}` : ch.mission}
                                                    </h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748B' }}>
                                                            <IconClock /> {new Date(ch.deadline).toLocaleDateString()}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>
                                                            <IconStar /> +{ch.reward_xp} XP
                                                        </div>
                                                        {ch.challenge_type === 'quiz' && (
                                                            <div style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, background: '#3B82F611', padding: '2px 8px', borderRadius: 4 }}>
                                                                CONTEST
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!sub ? (
                                                        <div style={{ display: 'flex', gap: 10 }}>
                                                            {ch.challenge_type === 'quiz' ? (
                                                                <button onClick={() => { setActiveSubmissionId(ch.id); setSubmissionType('quiz'); }} className="btn-gold" style={{ flex: 1, padding: '10px 0', fontSize: 12, borderRadius: 12 }}>
                                                                    🚀 Start Quiz
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    {ch.allow_text && <button onClick={() => { setActiveSubmissionId(ch.id); setSubmissionType('text'); }} className="btn-gold" style={{ flex: 1, padding: '8px 0', fontSize: 11 }}>Write Response</button>}
                                                                    {ch.allow_audio && <button onClick={() => { setActiveSubmissionId(ch.id); setSubmissionType('audio'); }} className="btn-gold" style={{ flex: 1, padding: '8px 0', fontSize: 11, background: '#1E293B', color: '#F59E0B', border: '1px solid #F59E0B' }}>Record Audio</button>}
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                                                            {ch.challenge_type === 'quiz' ? (
                                                                <div>
                                                                    <div style={{ fontSize: 14, fontWeight: 900, color: '#10B981', marginBottom: 4 }}>Score: {sub.quiz_score}/{sub.total_quiz_questions}</div>
                                                                    <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Reward collected successfully! 🎉</p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                                                                        {sub.status === 'approved' ? 'Great work! Reward collected.' : sub.status === 'correction' ? `Feedback: ${sub.feedback}` : 'Awaiting teacher review...'}
                                                                    </p>
                                                                    {sub.status === 'correction' && (
                                                                        <button onClick={() => { setActiveSubmissionId(ch.id); setSubmissionType('text'); }} className="btn-gold" style={{ width: '100%', marginTop: 10, padding: '6px 0', fontSize: 10 }}>Resubmit</button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: 40, textAlign: 'center', background: '#1A1F2E', borderRadius: 20, border: '1px dashed #2D3748' }}>
                                    <p style={{ color: '#64748B', fontSize: 14 }}>No daily missions available right now.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PROFILE TAB ── */}
                {activeTab === 'profile' && (
                    <div className="fade-in" style={{ maxWidth: 720 }}>
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ height: 120, background: 'linear-gradient(135deg, #1e3a5f, #1a2744, #0F1117)', position: 'relative' }}>
                                <div style={{ position: 'absolute', bottom: -40, left: 28 }}>
                                    <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '3px solid #0F1117', background: '#242938' }}>
                                        {data?.student.profile_picture ? (
                                            <img src={getImageUrl(data.student.profile_picture)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#F59E0B' }}>{data?.student.username[0].toUpperCase()}</div>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '52px 28px 28px' }}>
                                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 28 }}>{data?.student.username}</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Full Name</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.full_name || 'Not provided'}</p>
                                    </div>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Parent's Name</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.parent_name || 'Not provided'}</p>
                                    </div>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Email</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.email}</p>
                                    </div>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Date of Birth</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.dob || 'Not provided'}</p>
                                    </div>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px', gridColumn: 'span 2' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Residential Address</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.address || 'Not provided'}</p>
                                    </div>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>School Name</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.school_name || 'Not provided'}</p>
                                    </div>
                                    <div style={{ background: '#242938', border: '1px solid #2D3748', borderRadius: 8, padding: '14px 18px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Standard / Grade</p>
                                        <p style={{ fontSize: 14, color: '#F1F5F9' }}>{data?.student.standard_grade || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rest of the tabs (Courses, Catalog, Attendance) restored properly... */}
                {activeTab === 'courses' && (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                        {data?.enrollments.map(enr => {
                            const pct = enr.manual_progress;
                            const clr = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
                            const isCompleted = pct === 100;

                            return (
                                <div key={enr.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
                                    <div style={{ height: 160, background: '#242938', position: 'relative' }}>
                                        {enr.course.course_image ? (
                                            <img src={getImageUrl(enr.course.course_image)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 800, color: '#F59E0B' }}>{enr.course.course_name[0]}</div>
                                        )}
                                        <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                            <span className="badge" style={{
                                                background: isCompleted ? '#10B981BB' : '#3B82F6BB',
                                                color: '#FFF',
                                                backdropFilter: 'blur(10px)'
                                            }}>
                                                {isCompleted ? 'Completed' : 'In Progress'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9', marginBottom: 12 }}>{enr.course.course_name}</h3>

                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Course Progress</span>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: clr }}>{Math.round(pct)}%</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${pct}%`, background: clr }}></div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                            <div style={{ background: '#0F172A', padding: '10px 12px', borderRadius: 8, border: '1px solid #1E293B' }}>
                                                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Attendance</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: getAttendanceColor(enr.attendance?.attendance_percentage || 0) }}>{Math.round(enr.attendance?.attendance_percentage || 0)}%</div>
                                            </div>
                                            <div style={{ background: '#0F172A', padding: '10px 12px', borderRadius: 8, border: '1px solid #1E293B' }}>
                                                <div style={{ fontSize: 9, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>Next Class</div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>Tue, 24 Feb</div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'catalog' && (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                        {availableCourses.length > 0 ? (
                            availableCourses.map(c => (
                                <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
                                    <div style={{ height: 160, background: '#242938' }}>
                                        {c.course_image && <img src={getImageUrl(c.course_image)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ padding: 20 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.course_name}</h3>
                                        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{c.course_description}</p>
                                        <button onClick={() => handleEnroll(c.id, c.course_name)} className="btn-gold" style={{ width: '100%', padding: '10px 0' }}>Enroll Now</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', background: '#1A1F2E', borderRadius: 20, border: '1px dashed #2D3748' }}>
                                <div style={{ fontSize: 48, marginBottom: 20 }}>🎓</div>
                                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', marginBottom: 8 }}>No Courses Available</h3>
                                <p style={{ color: '#64748B', maxWidth: 400, margin: '0 auto' }}>Check back soon! We're currently preparing new exciting courses for you.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'flex-end' }}>
                            <div style={{ background: '#111827', padding: 4, borderRadius: 10, display: 'flex', border: '1px solid #1E293B' }}>
                                <button
                                    onClick={() => setViewMode('list')}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: viewMode === 'list' ? '#F59E0B' : 'transparent', color: viewMode === 'list' ? '#0F1117' : '#94A3B8', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    📋 LIST VIEW
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: viewMode === 'calendar' ? '#F59E0B' : 'transparent', color: viewMode === 'calendar' ? '#0F1117' : '#94A3B8', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    📅 CALENDAR
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {attendanceLogs.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#64748B', background: '#1A1F2E', borderRadius: 16 }}>No attendance records found.</div>
                            ) : (
                                <>
                                    {viewMode === 'list' ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                                            {attendanceLogs.map(log => (
                                                <div key={log.id} className="card" style={{ padding: 18, borderLeft: `4px solid ${log.status === 'present' ? '#10B981' : '#F87171'}` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#F1F5F9' }}>{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{log.day}</div>
                                                        </div>
                                                        <span className="badge" style={{
                                                            background: log.status === 'present' ? '#10B98122' : '#F8717122',
                                                            color: log.status === 'present' ? '#10B981' : '#F87171'
                                                        }}>
                                                            {log.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <IconClock />
                                                            <span>Full Day</span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{log.status === 'present' ? '✅ Marked' : '❌ Absent'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="card" style={{ padding: 32 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
                                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(h => (
                                                    <div key={h} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#64748B', paddingBottom: 12 }}>{h}</div>
                                                ))}
                                                {/* Mocking a calendar visual for Feb 2026 */}
                                                {Array.from({ length: 28 }).map((_, i) => {
                                                    const day = i + 1;
                                                    const log = attendanceLogs.find(l => new Date(l.date).getDate() === day);
                                                    return (
                                                        <div key={i} style={{
                                                            height: 80,
                                                            background: log ? (log.status === 'present' ? '#10B98115' : '#F8717115') : '#11182766',
                                                            borderRadius: 8,
                                                            border: '1px solid',
                                                            borderColor: log ? (log.status === 'present' ? '#10B98140' : '#F8717140') : '#1E293B',
                                                            padding: 8,
                                                            position: 'relative',
                                                            opacity: log ? 1 : 0.4
                                                        }}>
                                                            <span style={{ fontSize: 12, fontWeight: 900, color: log ? '#F1F5F9' : '#64748B' }}>{day}</span>
                                                            {log && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    bottom: 8,
                                                                    right: 8,
                                                                    width: 6,
                                                                    height: 6,
                                                                    borderRadius: '50%',
                                                                    background: log.status === 'present' ? '#10B981' : '#F87171',
                                                                    boxShadow: `0 0 10px ${log.status === 'present' ? '#10B981' : '#F87171'}`
                                                                }}></div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* 🎯 Challenge Submission Modal */}
            {activeSubmissionId && submissionType && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: submissionType === 'quiz' ? 600 : 500 }}>
                        <button onClick={() => { setActiveSubmissionId(null); setSubmissionType(null); setQuizResponses({}); }} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                {submissionType === 'text' ? '✍️' : submissionType === 'audio' ? '🎙️' : submissionType === 'quiz' ? '🏆' : '📁'}
                            </div>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 900 }}>{submissionType === 'quiz' ? 'Mission Contest' : 'Submit Response'}</h2>
                                <p style={{ fontSize: 13, color: '#64748B' }}>
                                    {submissionType === 'quiz' ? 'Answer all questions to win!' : submissionType === 'text' ? 'Write your response below' : 'Upload your media response'}
                                </p>
                            </div>
                        </div>

                        {submissionType === 'quiz' ? (
                            <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8, marginBottom: 24 }}>
                                {challenges.find(c => c.id === activeSubmissionId)?.quiz_questions?.map((q, idx) => (
                                    <div key={q.id} style={{ marginBottom: 24, padding: 16, background: '#11182744', borderRadius: 16, border: '1px solid #1E293B' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>QUESTION {idx + 1}</div>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: '#F8FAFC', marginBottom: 16 }}>{q.question_text}</div>
                                        <div style={{ display: 'grid', gap: 10 }}>
                                            {([['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]] as [string, string][]).map(([val, label]) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setQuizResponses(prev => ({ ...prev, [q.id]: val }))}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '12px 16px',
                                                        borderRadius: 10,
                                                        fontSize: 14,
                                                        transition: 'all 0.2s ease',
                                                        background: quizResponses[q.id] === val ? '#F59E0B22' : '#242938',
                                                        color: quizResponses[q.id] === val ? '#F59E0B' : '#94A3B8',
                                                        border: `1px solid ${quizResponses[q.id] === val ? '#F59E0B' : '#2D3748'}`,
                                                        fontWeight: quizResponses[q.id] === val ? 700 : 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span style={{ marginRight: 12, opacity: 0.5 }}>{val}</span> {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : submissionType === 'text' ? (
                            <div style={{ position: 'relative' }}>
                                <textarea
                                    value={challengeText}
                                    onChange={(e) => setChallengeText(e.target.value)}
                                    placeholder="Type your answer here..."
                                    style={{ width: '100%', height: 160, background: '#242938', border: '1px solid #2D3748', borderRadius: 12, padding: 16, color: '#F1F5F9', fontSize: 14, outline: 'none', resize: 'none', marginBottom: 12 }}
                                />
                                <div style={{ textAlign: 'right', fontSize: 11, color: challengeText.length > 500 ? '#EF4444' : '#64748B', fontWeight: 700 }}>
                                    {challengeText.length} / 500 characters
                                </div>
                            </div>
                        ) : (
                            <div style={{ border: '2px dashed #2D3748', borderRadius: 16, padding: '40px 20px', textAlign: 'center', marginBottom: 24, background: '#24293833' }}>
                                <input
                                    type="file"
                                    id="challengeFile"
                                    hidden
                                    accept={submissionType === 'audio' ? "audio/*" : "*/*"}
                                    onChange={(e) => setChallengeFile(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="challengeFile" style={{ cursor: 'pointer' }}>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>
                                        {challengeFile ? challengeFile.name : `Click to upload ${submissionType}`}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#64748B' }}>Max size: 10MB</p>
                                </label>
                            </div>
                        )}

                        <button
                            disabled={isSubmittingChallenge || (submissionType === 'text' ? !challengeText : !challengeFile)}
                            onClick={handleChallengeSubmit}
                            className="btn-gold"
                            style={{ width: '100%', padding: '14px 0', opacity: (isSubmittingChallenge || (submissionType === 'text' ? !challengeText : !challengeFile)) ? 0.6 : 1 }}
                        >
                            {isSubmittingChallenge ? 'Submitting...' : 'Send Submission'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
