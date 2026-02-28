import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router";
import { useToast } from "../context/NotificationContext";
import { useTranslation } from "react-i18next";

interface UserDetails {
    id: number;
    username: string;
    email: string;
    profile_picture: string | null;
}

interface StudentRecord {
    id: number;
    student_details: UserDetails;
    course_name: string;
    attendance_pct: number;
    grade_val: string | null;
    best_competition_score: number;
    daily_status?: "present" | "absent" | null;
    manual_progress: number;
    // Local state for attendance radio buttons
    current_status?: "present" | "absent";
}

interface AssignedCourse {
    id: number;
    course: number;
    course_name: string;
    student_count: number;
}

interface DashboardSummary {
    teacher_name: string;
    assigned_courses: AssignedCourse[];
    total_students: number;
}

export function meta() {
    return [{ title: "Teacher Dashboard | Vetri Academy" }];
}

type Tab = "overview" | "students" | "missions";

interface ChallengeSubmission {
    id: number;
    student_name: string;
    mission_text: string;
    text_response?: string;
    audio_response?: string;
    file_response?: string;
    status: 'pending' | 'approved' | 'correction';
    feedback?: string;
    submitted_at: string;
    reward_xp: number;
    challenge_type: 'mission' | 'quiz';
    quiz_score?: number;
    total_quiz_questions?: number;
}

interface NewQuizQuestion {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
}

export default function TeacherDashboard() {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    // Filters
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split("T")[0]);

    // Mission Submission state
    const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [reviewingId, setReviewingId] = useState<number | null>(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    // New Mission Creation state
    const [isCreatingMission, setIsCreatingMission] = useState(false);
    const [newMission, setNewMission] = useState({
        course: "",
        mission: "",
        challenge_type: 'mission' as 'mission' | 'quiz',
        reward_xp: 100,
        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        allow_text: true,
        allow_audio: false,
        allow_file: false,
        quiz_questions: [] as NewQuizQuestion[]
    });
    const [isSavingMission, setIsSavingMission] = useState(false);

    const fetchSummary = async () => {
        try {
            const resp = await api.get("/api/lms/teacher/dashboard/");
            setSummary(resp.data);
            if (resp.data.assigned_courses.length > 0 && !selectedCourseId) {
                setSelectedCourseId(String(resp.data.assigned_courses[0].course));
            }
        } catch (err: any) {
            if (err.response?.status === 403 || err.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            }
            showToast(t("failed_load_summary"), "error");
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCourseId) params.append("course_id", selectedCourseId);
            if (attendanceDate) params.append("date", attendanceDate);

            const resp = await api.get(`/api/lms/teacher/students/?${params.toString()}`);

            // Map students and use daily_status from backend if it exists, otherwise leave undefined or default
            setStudents(resp.data.map((s: StudentRecord) => ({
                ...s,
                current_status: s.daily_status || undefined // If no saved status, it stays unselected
            })));
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        setSubmissionsLoading(true);
        try {
            const resp = await api.get("/api/lms/teacher/challenges/submissions/");
            setSubmissions(resp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    const handleFeedbackSubmit = async (status: 'approved' | 'correction') => {
        if (!reviewingId) return;
        setIsSubmittingFeedback(true);
        try {
            await api.post("/api/lms/teacher/challenges/feedback/", {
                submission_id: reviewingId,
                status: status,
                feedback: feedbackText
            });
            showToast(`Submission ${status}`, "success");
            setReviewingId(null);
            setFeedbackText("");
            fetchSubmissions();
        } catch (err) {
            showToast("Failed to submit feedback", "error");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleCreateMission = async () => {
        if (!newMission.course || !newMission.mission) {
            showToast("Please fill in all required fields.", "error");
            return;
        }
        setIsSavingMission(true);
        try {
            await api.post("/api/lms/teacher/daily-challenges/create/", newMission);
            showToast("Mission assigned successfully!", "success");
            setIsCreatingMission(false);
            setNewMission({
                course: selectedCourseId,
                mission: "",
                challenge_type: 'mission',
                reward_xp: 100,
                deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                allow_text: true,
                allow_audio: false,
                allow_file: false,
                quiz_questions: []
            });
            if (activeTab === 'missions') fetchSubmissions();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Failed to create mission", "error");
        } finally {
            setIsSavingMission(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    useEffect(() => {
        if (activeTab === "students") {
            fetchStudents();
        } else if (activeTab === "missions") {
            fetchSubmissions();
        }
    }, [selectedCourseId, activeTab, attendanceDate]);

    const handleAttendanceChange = async (studentId: number, status: "present" | "absent") => {
        // Optimistic UI update
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, current_status: status } : s));

        // Auto-save to backend
        try {
            const student = students.find(st => st.id === studentId);
            if (!student) return;

            await api.post("/api/lms/teacher/attendance/mark/", {
                date: attendanceDate,
                attendance: [{
                    student_id: student.student_details.id,
                    status: status
                }]
            });
            // showToast("Saved", "success");
        } catch (err) {
            showToast("Failed to auto-save attendance", "error");
        }
    };

    const markAllPresent = async () => {
        if (students.length === 0) return;

        const attendanceData = students.map(s => ({
            student_id: s.student_details.id,
            status: 'present' as const
        }));

        // Optimistic UI update
        setStudents(prev => prev.map(s => ({ ...s, current_status: 'present' as const })));

        try {
            await api.post("/api/lms/teacher/attendance/mark/", {
                date: attendanceDate,
                attendance: attendanceData
            });
            showToast("All students marked present", "success");
        } catch (err) {
            showToast("Failed to save bulk attendance", "error");
        }
    };

    const updateStudentProgress = async (enrollmentId: number, progress: number) => {
        try {
            await api.post("/api/lms/teacher/update-progress/", {
                enrollment_id: enrollmentId,
                progress: progress
            });
            setStudents(prev => prev.map(s => s.id === enrollmentId ? { ...s, manual_progress: progress } : s));
            showToast("Progress updated successfully", "success");
        } catch (err) {
            showToast("Failed to update progress", "error");
        }
    };

    const saveAttendance = async () => {
        if (!selectedCourseId) {
            showToast(t("select_course"), "error");
            return;
        }

        // Ensure all students have a status selected
        const missing = students.filter(s => !s.current_status);
        if (missing.length > 0) {
            showToast("Please mark attendance for all students before saving.", "error");
            return;
        }

        setSaving(true);
        try {
            const attendanceData = students.map(s => ({
                student_id: s.student_details.id,
                status: s.current_status
            }));

            await api.post("/api/lms/teacher/attendance/mark/", {
                date: attendanceDate,
                attendance: attendanceData
            });

            showToast(t("attendance_saved"), "success");
            fetchStudents(); // Refresh data to confirm saved state
        } catch (err: any) {
            const msg = err.response?.data?.detail || t("failed_save_attendance");
            showToast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    const toggleLanguage = () => {
        const nextLng = i18n.language === 'en' ? 'ta' : 'en';
        i18n.changeLanguage(nextLng);
    };

    const filteredStudents = students.filter(s => {
        const q = searchTerm.toLowerCase();
        return (
            s.student_details.username.toLowerCase().includes(q) ||
            s.student_details.email.toLowerCase().includes(q)
        );
    });

    return (
        <div style={{ minHeight: "100vh", background: "#0F1117", color: "#F1F5F9", fontFamily: '"Inter", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                .sidebar { width: 260px; background: linear-gradient(180deg, #111827 0%, #0F172A 100%); border-right: 1px solid #1E293B; padding: 32px 0; display: flex; flex-direction: column; backdrop-filter: blur(20px); }
                .nav-link { display: flex; align-items: center; gap: 12px; padding: 14px 24px; color: #94A3B8; text-decoration: none; font-weight: 500; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; border-left: 4px solid transparent; }
                .nav-link:hover { background: rgba(255,255,255,0.03); color: #F1F5F9; transform: translateX(4px); }
                .nav-link.active { background: linear-gradient(90deg, rgba(245,158,11,0.15) 0%, transparent 100%); color: #F59E0B; border-left: 4px solid #F59E0B; font-weight: 700; }
                .card { background: #1A1F2E; border: 1px solid #2D3748; border-radius: 12px; padding: 24px; }
                .input-dark { background: #242938; border: 1px solid #2D3748; color: #F1F5F9; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
                .input-dark:focus { border-color: #F59E0B; }
                .btn-gold { background: linear-gradient(135deg, #F59E0B, #D97706); color: #0F1117; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; padding: 10px 20px; }
                .btn-gold:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(245,158,11,0.3); }
                .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
                .table-row { border-bottom: 1px solid #2D3748; transition: background 0.15s; }
                .table-row:hover { background: #1E253A; }
                .radio-group { display: flex; gap: 12px; }
                .attendance-btn { padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid #2D3748; background: #131825; color: #64748B; transition: all 0.2s; }
                .attendance-btn.present-active { background: #10B98120; color: #10B981; border-color: #10B98140; }
                .attendance-btn.absent-active { background: #EF444420; color: #EF4444; border-color: #EF444440; }
                .lang-switch { position: fixed; top: 20px; right: 20px; background: #111827; border: 1px solid #2D3748; color: #F59E0B; padding: 8px 16px; border-radius: 99px; font-weight: 700; font-size: 13px; cursor: pointer; z-index: 100; transition: all 0.2s; }
                .lang-switch:hover { background: #F59E0B1A; border-color: #F59E0B; }
            `}</style>

            <button className="lang-switch" onClick={toggleLanguage}>
                {i18n.language === 'en' ? 'தமிழ்' : 'English'}
            </button>

            <div style={{ display: "flex", minHeight: "100vh" }}>
                <aside className="sidebar">
                    <div style={{ padding: '0 24px', marginBottom: 40 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F1117', fontSize: 20 }}>V</div>
                            VETRI
                        </div>
                    </div>

                    <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <button
                            className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
                            onClick={() => setActiveTab("overview")}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            {t("dashboard")}
                        </button>
                        <button
                            className={`nav-link ${activeTab === "students" ? "active" : ""}`}
                            onClick={() => setActiveTab("students")}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            {t("students")}
                        </button>
                        <button
                            className={`nav-link ${activeTab === "missions" ? "active" : ""}`}
                            onClick={() => setActiveTab("missions")}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Daily Missions
                        </button>
                    </nav>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, margin: '0 16px' }}>
                        <button className="nav-link" onClick={() => { localStorage.clear(); navigate("/login"); }} style={{ color: "#F87171", borderRadius: 8 }}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            {t("logout")}
                        </button>
                    </div>
                </aside>

                <main style={{ flex: 1, padding: "40px 48px", overflowY: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                        <div>
                            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F1F5F9", marginBottom: 8 }}>
                                {activeTab === 'missions' ? 'Review Daily Missions' : `${t("welcome")}, ${summary?.teacher_name || ""}`}
                            </h1>
                            <p style={{ color: "#64748B", fontSize: 15 }}>
                                {activeTab === 'missions' ? 'Review and provide feedback on student submissions.' : 'Manage your students and their progress.'}
                            </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{t("total_students")}</div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#F59E0B" }}>{summary?.total_students || 0}</div>
                        </div>
                    </div>

                    {activeTab === "overview" && (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
                                <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "#3B82F61A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📚</div>
                                    <div>
                                        <div style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>{t("assigned_courses")}</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9" }}>{summary?.assigned_courses.length || 0}</div>
                                    </div>
                                </div>
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{t("my_assigned_courses")}</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                {summary?.assigned_courses.map(c => (
                                    <div key={c.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 18, color: "#F1F5F9" }}>{c.course_name}</div>
                                            <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{c.student_count} Students</div>
                                        </div>
                                        <button className="btn-gold" onClick={() => { setSelectedCourseId(String(c.course)); setActiveTab("students"); }}>
                                            {t("manage")}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === "students" && (
                        <>
                            <div className="card" style={{ padding: "20px 24px", marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 200px" }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("select_course")}</label>
                                    <select className="input-dark" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                                        {summary?.assigned_courses.map(c => (
                                            <option key={c.course} value={c.course}>{c.course_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 250px" }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("search_student")}</label>
                                    <input type="text" placeholder="Name or email..." className="input-dark" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 1 180px" }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("date")}</label>
                                    <input type="date" className="input-dark" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                                </div>
                                <div style={{ flex: "0 0 auto", paddingTop: 18 }}>
                                    <button className="btn-gold" onClick={fetchStudents}>{t("reload")}</button>
                                </div>
                            </div>

                            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                                <div style={{ padding: "16px 24px", borderBottom: "1px solid #2D3748", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#131825" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t("students_list")}</h3>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            className="btn-gold"
                                            style={{ background: '#10B981', color: 'white' }}
                                            onClick={markAllPresent}
                                            disabled={students.length === 0}
                                        >
                                            ✓ Mark All Present
                                        </button>
                                    </div>
                                </div>
                                {loading ? (
                                    <div style={{ padding: 60, textAlign: "center", color: "#64748B" }}>{t("loading")}</div>
                                ) : (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                            <thead style={{ background: "#0F1117" }}>
                                                <tr>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>{t("student")}</th>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>Progress</th>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>{t("attendance")}</th>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>{t("action")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStudents.map(s => (
                                                    <tr key={s.id} className="table-row">
                                                        <td style={{ padding: "18px 24px" }}>
                                                            <div style={{ fontWeight: 700 }}>{s.student_details.username}</div>
                                                            <div style={{ fontSize: 12, color: "#64748B" }}>{s.student_details.email}</div>
                                                        </td>
                                                        <td style={{ padding: "18px 24px" }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={s.manual_progress}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        setStudents(prev => prev.map(st => st.id === s.id ? { ...st, manual_progress: val } : st));
                                                                    }}
                                                                    onMouseUp={(e) => updateStudentProgress(s.id, parseInt((e.target as HTMLInputElement).value))}
                                                                    style={{ flex: 1, accentColor: '#F59E0B' }}
                                                                />
                                                                <span style={{ fontSize: 13, fontWeight: 800, color: '#F1F5F9', minWidth: 40 }}>{s.manual_progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "18px 24px" }}>
                                                            <div className="radio-group">
                                                                <button
                                                                    className={`attendance-btn ${s.current_status === 'present' ? 'present-active' : ''}`}
                                                                    onClick={() => handleAttendanceChange(s.id, "present")}
                                                                >
                                                                    {t("present")}
                                                                </button>
                                                                <button
                                                                    className={`attendance-btn ${s.current_status === 'absent' ? 'absent-active' : ''}`}
                                                                    onClick={() => handleAttendanceChange(s.id, "absent")}
                                                                >
                                                                    {t("absent")}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "18px 24px" }}>
                                                            <button
                                                                onClick={() => navigate(`/teacher/students/${s.id}/performance`)}
                                                                style={{ background: "transparent", border: "1px solid #2D3748", color: "#F59E0B", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                                                            >
                                                                {t("report")}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === "missions" && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                <button className="btn-gold" onClick={() => { setIsCreatingMission(true); setNewMission(prev => ({ ...prev, course: selectedCourseId })); }}>
                                    + Assign New Mission
                                </button>
                            </div>
                            <div className="card" style={{ padding: 0 }}>
                                <div style={{ padding: "16px 24px", borderBottom: "1px solid #2D3748", background: "#131825" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Pending Submissions</h3>
                                </div>
                                {submissionsLoading ? (
                                    <div style={{ padding: 60, textAlign: "center", color: "#64748B" }}>Loading submissions...</div>
                                ) : submissions.filter(s => s.status === 'pending').length === 0 ? (
                                    <div style={{ padding: 60, textAlign: "center", color: "#64748B" }}>No pending submissions to review.</div>
                                ) : (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                            <thead style={{ background: "#0F1117" }}>
                                                <tr>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>Student / Mission</th>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>Response</th>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>Date</th>
                                                    <th style={{ padding: "14px 24px", color: "#64748B" }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submissions.filter(s => s.status === 'pending').map(s => (
                                                    <tr key={s.id} className="table-row">
                                                        <td style={{ padding: "18px 24px" }}>
                                                            <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{s.student_name}</div>
                                                            <div style={{ fontSize: 12, color: "#A0AEC0", marginTop: 4 }}>Mission: {s.mission_text}</div>
                                                        </td>
                                                        <td style={{ padding: "18px 24px" }}>
                                                            {s.text_response && <p style={{ fontSize: 13, background: '#242938', padding: 8, borderRadius: 6 }}>{s.text_response}</p>}
                                                            {s.audio_response && (
                                                                <div style={{ marginTop: 8 }}>
                                                                    <audio controls src={s.audio_response} style={{ height: 32 }} />
                                                                </div>
                                                            )}
                                                            {s.file_response && (
                                                                <a href={s.file_response} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#F59E0B' }}>View Attached File</a>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: "18px 24px", fontSize: 13, color: '#64748B' }}>
                                                            {new Date(s.submitted_at).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: "18px 24px" }}>
                                                            <button
                                                                onClick={() => setReviewingId(s.id)}
                                                                className="btn-gold"
                                                                style={{ padding: '6px 14px', fontSize: 12 }}
                                                            >
                                                                Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Create Mission Modal */}
            {isCreatingMission && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div style={{ background: '#1A1F2E', border: '1px solid #2D3748', borderRadius: 24, width: '100%', maxWidth: 550, padding: 32 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Assign New Mission</h2>
                        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Create a new daily task for your students.</p>

                        <div style={{ display: 'grid', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Select Course</label>
                                    <select
                                        className="input-dark"
                                        value={newMission.course}
                                        onChange={e => setNewMission({ ...newMission, course: e.target.value })}
                                    >
                                        <option value="">Choose a course...</option>
                                        {summary?.assigned_courses.map(c => (
                                            <option key={c.course} value={c.course}>{c.course_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Challenge Type</label>
                                    <select
                                        className="input-dark"
                                        value={newMission.challenge_type}
                                        onChange={e => setNewMission({ ...newMission, challenge_type: e.target.value as 'mission' | 'quiz' })}
                                    >
                                        <option value="mission">Standard Mission</option>
                                        <option value="quiz">Quiz Contest</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                                    {newMission.challenge_type === 'quiz' ? 'Contest Title' : 'Mission Details'}
                                </label>
                                <textarea
                                    className="input-dark"
                                    placeholder={newMission.challenge_type === 'quiz' ? "e.g. Daily Math Sprint" : "What should the students do?"}
                                    style={{ height: 60, padding: 16, resize: 'none' }}
                                    value={newMission.mission}
                                    onChange={e => setNewMission({ ...newMission, mission: e.target.value })}
                                />
                            </div>

                            {newMission.challenge_type === 'quiz' ? (
                                <div style={{ background: '#131825', padding: 20, borderRadius: 16, border: '1px dashed #2D3748' }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: '#F1F5F9' }}>Quiz Questions ({newMission.quiz_questions.length})</h4>

                                    <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {newMission.quiz_questions.map((q, idx) => (
                                            <div key={idx} style={{ background: '#1A1F2E', padding: 12, borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                                    <span style={{ color: '#F59E0B', fontWeight: 800 }}>Q{idx + 1}:</span> {q.question_text}
                                                </div>
                                                <button onClick={() => {
                                                    const updated = [...newMission.quiz_questions];
                                                    updated.splice(idx, 1);
                                                    setNewMission({ ...newMission, quiz_questions: updated });
                                                }} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className="btn-gold"
                                        style={{ width: '100%', padding: '10px 0', fontSize: 12, background: '#1E293B', color: '#F59E0B', border: '1px solid #F59E0B' }}
                                        onClick={() => {
                                            const questionText = window.prompt("Enter Question Text:");
                                            if (!questionText) return;
                                            const a = window.prompt("Option A:");
                                            const b = window.prompt("Option B:");
                                            const c = window.prompt("Option C:");
                                            const d = window.prompt("Option D:");
                                            const correct = window.prompt("Correct Option (A/B/C/D):")?.toUpperCase() as any;

                                            if (questionText && a && b && c && d && ['A', 'B', 'C', 'D'].includes(correct)) {
                                                setNewMission({
                                                    ...newMission,
                                                    quiz_questions: [...newMission.quiz_questions, {
                                                        question_text: questionText,
                                                        option_a: a, option_b: b, option_c: c, option_d: d,
                                                        correct_option: correct
                                                    }]
                                                });
                                            } else {
                                                alert("Invalid input. Question not added.");
                                            }
                                        }}
                                    >
                                        + Add Question
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Allowed Response Types</label>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={newMission.allow_text} onChange={e => setNewMission({ ...newMission, allow_text: e.target.checked })} style={{ accentColor: '#F59E0B' }} /> Text
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={newMission.allow_audio} onChange={e => setNewMission({ ...newMission, allow_audio: e.target.checked })} style={{ accentColor: '#F59E0B' }} /> Audio
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={newMission.allow_file} onChange={e => setNewMission({ ...newMission, allow_file: e.target.checked })} style={{ accentColor: '#F59E0B' }} /> File
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Reward XP</label>
                                    <input
                                        type="number"
                                        className="input-dark"
                                        value={newMission.reward_xp}
                                        onChange={e => setNewMission({ ...newMission, reward_xp: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Deadline</label>
                                    <input
                                        type="date"
                                        className="input-dark"
                                        value={newMission.deadline}
                                        onChange={e => setNewMission({ ...newMission, deadline: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                            <button
                                onClick={() => setIsCreatingMission(false)}
                                style={{ flex: 1, background: 'transparent', border: '1px solid #2D3748', color: '#F1F5F9', borderRadius: 12, padding: '14px 0', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSavingMission}
                                onClick={handleCreateMission}
                                className="btn-gold"
                                style={{ flex: 1, borderRadius: 12, padding: '14px 0' }}
                            >
                                {isSavingMission ? 'Creating...' : 'Assign Mission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {reviewingId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div style={{ background: '#1A1F2E', border: '1px solid #2D3748', borderRadius: 20, width: '100%', maxWidth: 500, padding: 32 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Review Submission</h2>
                        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Provided feedback to the student based on their response.</p>

                        <textarea
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            placeholder="Type your feedback here..."
                            style={{ width: '100%', height: 120, background: '#242938', border: '1px solid #2D3748', borderRadius: 12, padding: 16, color: '#F1F5F9', fontSize: 14, outline: 'none', resize: 'none', marginBottom: 24 }}
                        />

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                disabled={isSubmittingFeedback}
                                onClick={() => handleFeedbackSubmit('correction')}
                                style={{ flex: 1, background: '#EF444422', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 8, padding: '12px 0', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Needs Correction
                            </button>
                            <button
                                disabled={isSubmittingFeedback}
                                onClick={() => handleFeedbackSubmit('approved')}
                                className="btn-gold"
                                style={{ flex: 1, padding: '12px 0' }}
                            >
                                {isSubmittingFeedback ? 'Processing...' : 'Approve & Award XP'}
                            </button>
                        </div>
                        <button
                            onClick={() => { setReviewingId(null); setFeedbackText(""); }}
                            style={{ width: '100%', marginTop: 16, background: 'transparent', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
