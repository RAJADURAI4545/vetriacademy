import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate, useLoaderData } from "react-router";
import { useToast } from "../context/NotificationContext";
import type { Route } from "./+types/admin-attendance";

interface AttendanceLog {
    id: number;
    student: number;
    student_name: string;
    course: number | null;
    course_name: string | null;
    date: string;
    day: string;
    status: "present" | "absent";
}

interface Course {
    id: number;
    course_name: string;
}

export function meta() {
    return [{ title: "Attendance Log | Admin Panel" }];
}

export async function clientLoader() {
    try {
        const [coursesRes, studentsRes] = await Promise.all([
            api.get("/api/lms/courses/"),
            api.get("/api/accounts/users/"),
        ]);
        return {
            initialCourses: coursesRes.data as Course[],
            initialStudents: studentsRes.data as { id: number; username: string; email: string; }[]
        };
    } catch (err) {
        console.error("Admin loader error:", err);
        return { initialCourses: [], initialStudents: [] };
    }
}

export default function AdminAttendanceLogs() {
    const loaderData = useLoaderData<typeof clientLoader>();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [courses, setCourses] = useState<Course[]>(loaderData.initialCourses);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Filters
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");

    // Mark new attendance panel
    const [showMarkPanel, setShowMarkPanel] = useState(false);
    const [markStudentId, setMarkStudentId] = useState<string>("");
    const [markDate, setMarkDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [markStatus, setMarkStatus] = useState<"present" | "absent">("present");
    const [allStudents, setAllStudents] = useState<{ id: number; username: string; email: string; }[]>(loaderData.initialStudents);
    const [markSaving, setMarkSaving] = useState(false);
    // Modal-level filters
    const [modalCourseFilter, setModalCourseFilter] = useState<string>("all");
    const [modalStudentSearch, setModalStudentSearch] = useState<string>("");

    const fetchData = async () => {
        try {
            let url = "/api/lms/attendance/all-logs/?";
            if (selectedCourseId !== "all") url += `course_id=${selectedCourseId}&`;
            if (selectedDate) url += `date=${selectedDate}&`;

            const logsRes = await api.get(url);
            setLogs(logsRes.data);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            } else if (err.response?.status === 403) {
                navigate("/");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCourseId, selectedDate]);

    const handleStatusToggle = async (log: AttendanceLog) => {
        const newStatus = log.status === "present" ? "absent" : "present";
        setUpdatingId(log.id);
        try {
            await api.post(
                "/api/lms/attendance/mark/",
                { 
                    student_id: log.student, 
                    course_id: log.course,
                    date: log.date, 
                    status: newStatus 
                }
            );
            setLogs(prev =>
                prev.map(l => (l.id === log.id ? { ...l, status: newStatus } : l))
            );
            showToast(`Status updated → ${newStatus.toUpperCase()}`, "success");
        } catch {
            showToast("Failed to update status.", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleMarkNew = async () => {
        if (!markStudentId) { showToast("Please select a student.", "error"); return; }
        setMarkSaving(true);
        try {
            await api.post(
                "/api/lms/attendance/mark/",
                { 
                    student_id: Number(markStudentId), 
                    course_id: Number(modalCourseFilter === "all" ? 0 : modalCourseFilter),
                    date: markDate, 
                    status: markStatus 
                }
            );
            showToast("Attendance record saved.", "success");
            setShowMarkPanel(false);
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Failed to save.", "error");
        } finally {
            setMarkSaving(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const q = searchTerm.toLowerCase();
        return (
            log.student_name.toLowerCase().includes(q)
        );
    });

    const presentCount = filteredLogs.filter(l => l.status === "present").length;
    const absentCount = filteredLogs.filter(l => l.status === "absent").length;
    const presentPct = filteredLogs.length > 0 ? Math.round((presentCount / filteredLogs.length) * 100) : 0;

    const getAttendanceColor = (pct: number) => {
        if (pct >= 85) return "#10B981";
        if (pct >= 70) return "#F59E0B";
        return "#EF4444";
    };

    return (
        <div style={{ minHeight: "100vh", background: "#0F1117", color: "#F1F5F9", fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #1A1F2E; }
                ::-webkit-scrollbar-thumb { background: #2D3748; border-radius: 3px; }
                .fade-in { animation: fadeIn 0.25s ease; }
                @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
                .card { background: #1A1F2E; border: 1px solid #2D3748; border-radius: 12px; }
                .btn-gold { background: linear-gradient(135deg, #F59E0B, #D97706); color: #0F1117; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-gold:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(245,158,11,0.35); }
                .btn-ghost { background: transparent; border: 1px solid #2D3748; color: #94A3B8; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-ghost:hover { border-color: #F59E0B; color: #F59E0B; }
                .input-dark { background: #242938; border: 1px solid #2D3748; color: #F1F5F9; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.2s; }
                .input-dark:focus { border-color: #F59E0B; }
                .input-dark option { background: #1A1F2E; }
                .select-dark { background: #242938; border: 1px solid #2D3748; color: #F1F5F9; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; font-family: inherit; cursor: pointer; }
                .tr-hover { transition: background 0.15s; }
                .tr-hover:hover { background: #1E253A !important; }
                .badge-present { background: #10B98120; color: #10B981; border: 1px solid #10B98140; }
                .badge-absent { background: #EF444420; color: #EF4444; border: 1px solid #EF444440; }
                .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; }
                .toggle-btn { padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid; transition: all 0.15s; }
                .toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .stat-card { background: #1A1F2E; border: 1px solid #2D3748; border-radius: 12px; padding: 20px 24px; }
                .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; animation: fadeIn 0.2s ease; }
                .modal { background: #1A1F2E; border: 1px solid #2D3748; border-radius: 16px; padding: 32px; width: 100%; max-width: 480px; }
                
                @media (max-width: 768px) {
                    .topbar { flex-direction: column !important; align-items: stretch !important; padding: 20px !important; }
                    .topbar-actions { flex-direction: column !important; }
                    .stats-grid { grid-template-columns: 1fr 1fr !important; }
                    .filters-bar { flex-direction: column !important; align-items: stretch !important; }
                    .filters-bar > div, .filters-bar > select { flex: none !important; width: 100% !important; }
                    .table-container { overflow-x: auto !important; }
                    .table-header, .table-row { grid-template-columns: 120px 200px 100px 140px !important; width: 560px !important; }
                    .main-container { padding: 20px !important; }
                }
                @media (max-width: 480px) {
                    .stats-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            {/* ── TOPBAR ── */}
            <div className="topbar" style={{ background: "#111827", borderBottom: "1px solid #2D3748", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                    <button
                        onClick={() => navigate("/dashboard")}
                        style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #2D3748", background: "transparent", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Admin Panel</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#F1F5F9" }}>Attendance Log</div>
                    </div>
                </div>
                <div className="topbar-actions" style={{ display: "flex", gap: 12 }}>
                    <button
                        onClick={() => setShowMarkPanel(true)}
                        className="btn-gold"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 13 }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                        Mark Attendance
                    </button>
                    <button
                        onClick={() => navigate("/admin-dashboard")}
                        className="btn-ghost"
                        style={{ padding: "10px 18px", fontSize: 13 }}
                    >
                        Student Roster
                    </button>
                    <button
                        onClick={() => { localStorage.clear(); navigate("/login"); }}
                        className="btn-ghost"
                        style={{ padding: "10px 18px", fontSize: 13, border: "1px solid #EF444440", color: "#F87171" }}
                    >
                        Logout 👋
                    </button>
                </div>
            </div>

            <div className="main-container" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px" }}>

                {/* ── STAT CARDS ── */}
                {!loading && (
                    <div className="fade-in stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
                        {[
                            { label: "Total Records", value: filteredLogs.length, color: "#3B82F6", icon: "📋" },
                            { label: "Present", value: presentCount, color: "#10B981", icon: "✅" },
                            { label: "Absent", value: absentCount, color: "#EF4444", icon: "❌" },
                            { label: "Attendance Rate", value: `${presentPct}%`, color: presentPct >= 75 ? "#10B981" : presentPct >= 50 ? "#F59E0B" : "#EF4444", icon: "📊" },
                        ].map(s => (
                            <div key={s.label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ fontSize: 28 }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 3 }}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── FILTERS ── */}
                <div className="card fade-in filters-bar" style={{ padding: "20px 24px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <div style={{ position: "relative", flex: "1 1 220px" }}>
                        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            id="att-search"
                            type="text"
                            placeholder="Search student, email, or course…"
                            className="input-dark"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: 36, width: "100%" }}
                        />
                    </div>

                    <select
                        id="att-course-filter"
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                        className="select-dark"
                        style={{ flex: "0 1 200px" }}
                    >
                        <option value="all">All Courses</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.course_name}</option>
                        ))}
                    </select>

                    <div style={{ position: "relative", flex: "0 1 180px" }}>
                        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748B", pointerEvents: "none" }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <input
                            id="att-date-filter"
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="input-dark"
                            style={{ paddingLeft: 36, width: "100%" }}
                        />
                    </div>

                    {(selectedDate || selectedCourseId !== "all" || searchTerm) && (
                        <button
                            onClick={() => { setSelectedDate(""); setSelectedCourseId("all"); setSearchTerm(""); }}
                            className="btn-ghost"
                            style={{ padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap" }}
                        >
                            ✕ Clear Filters
                        </button>
                    )}

                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748B", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* ── TABLE ── */}
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid #2D3748", borderTopColor: "#F59E0B", animation: "spin 0.8s linear infinite" }}></div>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <p style={{ color: "#64748B", fontWeight: 600 }}>Loading records…</p>
                    </div>
                ) : (
                    <div className="card fade-in table-container" style={{ overflow: "hidden" }}>
                        {/* Table Header */}
                        <div className="table-header" style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr 120px 140px", gap: 8, padding: "12px 24px", borderBottom: "1px solid #2D3748", background: "#131825" }}>
                            {["Date & Day", "Student", "Course", "Status", "Quick Action"].map(h => (
                                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
                            ))}
                        </div>

                        {/* Rows */}
                        {filteredLogs.length === 0 ? (
                            <div style={{ padding: "72px 40px", textAlign: "center", color: "#475569" }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>🕵️</div>
                                <p style={{ fontSize: 16, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>No records found</p>
                                <p style={{ fontSize: 14, color: "#475569" }}>Try adjusting your filters or marking new attendance.</p>
                            </div>
                        ) : (
                            filteredLogs.map((log, idx) => (
                                <div
                                    key={log.id}
                                    className="tr-hover table-row"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "160px 1fr 1fr 120px 140px",
                                        gap: 8,
                                        padding: "16px 24px",
                                        borderBottom: idx < filteredLogs.length - 1 ? "1px solid #1E2535" : "none",
                                        alignItems: "center",
                                        background: idx % 2 === 0 ? "transparent" : "#ffffff03",
                                    }}
                                >
                                    {/* Date */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{log.date}</div>
                                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{log.day}</div>
                                    </div>

                                    {/* Student */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{log.student_name}</div>
                                    </div>

                                    {/* Course */}
                                    <div>
                                        <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600 }}>{log.course_name || "General"}</div>
                                    </div>

                                    {/* Status Badge */}
                                    <div>
                                        <span className={`badge ${log.status === "present" ? "badge-present" : "badge-absent"}`}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: log.status === "present" ? "#10B981" : "#EF4444", flexShrink: 0 }}></span>
                                            {log.status === "present" ? "Present" : "Absent"}
                                        </span>
                                    </div>

                                    {/* Toggle Button */}
                                    <div>
                                        <button
                                            className="toggle-btn"
                                            disabled={updatingId === log.id}
                                            onClick={() => handleStatusToggle(log)}
                                            style={{
                                                background: log.status === "present" ? "#EF444415" : "#10B98115",
                                                color: log.status === "present" ? "#EF4444" : "#10B981",
                                                borderColor: log.status === "present" ? "#EF444440" : "#10B98140",
                                                opacity: updatingId === log.id ? 0.5 : 1,
                                            }}
                                        >
                                            {updatingId === log.id
                                                ? "Saving…"
                                                : log.status === "present"
                                                    ? "→ Mark Absent"
                                                    : "→ Mark Present"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* ── MARK NEW ATTENDANCE MODAL ── */}
            {showMarkPanel && (() => {
                const filteredStudents = allStudents.filter(s => {
                    const q = modalStudentSearch.toLowerCase();
                    return !q || s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
                });
                const selectedStu = allStudents.find(s => String(s.id) === markStudentId);

                return (
                    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setShowMarkPanel(false); setModalStudentSearch(""); } }}>
                        <div className="modal fade-in" style={{ maxWidth: 560 }}>
                            {/* Header */}
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9" }}>Mark Daily Attendance</h2>
                                    <p style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>Select a student, date, and status to log.</p>
                                </div>
                                <button
                                    onClick={() => { setShowMarkPanel(false); setModalStudentSearch(""); }}
                                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #2D3748", background: "transparent", color: "#64748B", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                >×</button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                                {/* ─ STEP 0: Course Picker ─ */}
                                <div>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: modalCourseFilter !== "all" ? "#10B981" : "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: modalCourseFilter !== "all" ? "#10B981" : "#2D3748", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>0</span>
                                        Select Course
                                    </label>
                                    <select 
                                        className="select-dark" 
                                        value={modalCourseFilter} 
                                        onChange={e => setModalCourseFilter(e.target.value)}
                                        style={{ width: "100%" }}
                                    >
                                        <option value="all">General / Academy</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.course_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* ─ STEP 1: Student Picker ─ */}
                                <div>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: selectedStu ? "#10B981" : "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: selectedStu ? "#10B981" : "#2D3748", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
                                            {selectedStu ? "✓" : "1"}
                                        </span>
                                        Select Student
                                        {selectedStu && (
                                            <span style={{ marginLeft: 6, fontWeight: 700, color: "#10B981", textTransform: "none", fontSize: 12 }}>
                                                — {selectedStu.username}
                                            </span>
                                        )}
                                    </label>

                                    {/* Filters row */}
                                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                        <div style={{ position: "relative", flex: 1 }}>
                                            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B", pointerEvents: "none" }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            <input
                                                id="modal-student-search"
                                                type="text"
                                                placeholder="Search students…"
                                                value={modalStudentSearch}
                                                onChange={e => { setModalStudentSearch(e.target.value); setMarkStudentId(""); }}
                                                className="input-dark"
                                                style={{ paddingLeft: 30, width: "100%", fontSize: 13 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Scrollable student card list */}
                                    <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 8, border: "1px solid #2D3748", background: "#131825" }}>
                                        {filteredStudents.length === 0 ? (
                                            <div style={{ padding: "24px 16px", textAlign: "center", color: "#475569" }}>
                                                <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                                                <p style={{ fontSize: 13, fontWeight: 600 }}>No students match these filters.</p>
                                            </div>
                                        ) : (
                                            filteredStudents.map((stu, idx) => {
                                                const isSelected = String(stu.id) === markStudentId;
                                                return (
                                                    <div
                                                        key={stu.id}
                                                        onClick={() => setMarkStudentId(String(stu.id))}
                                                        style={{
                                                            display: "flex", alignItems: "center", gap: 12,
                                                            padding: "11px 14px",
                                                            borderBottom: idx < filteredStudents.length - 1 ? "1px solid #1E2535" : "none",
                                                            cursor: "pointer",
                                                            background: isSelected ? "#F59E0B18" : "transparent",
                                                            transition: "background 0.12s",
                                                        }}
                                                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#1E253A"; }}
                                                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                                                    >
                                                        {/* Avatar */}
                                                        <div style={{ width: 34, height: 34, borderRadius: 8, background: isSelected ? "#F59E0B30" : "#242938", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: isSelected ? "#F59E0B" : "#64748B", flexShrink: 0, border: isSelected ? "2px solid #F59E0B60" : "2px solid transparent", transition: "all 0.15s" }}>
                                                            {stu.username[0].toUpperCase()}
                                                        </div>
                                                        {/* Info */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#F59E0B" : "#F1F5F9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                {stu.username}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: "#64748B", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                {stu.email}
                                                            </div>
                                                        </div>
                                                        {/* Check */}
                                                        {isSelected && (
                                                            <svg width="16" height="16" fill="none" stroke="#F59E0B" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#475569", marginTop: 6, textAlign: "right" }}>
                                        {filteredStudents.length} of {allStudents.length} student{allStudents.length !== 1 ? "s" : ""}
                                    </div>
                                </div>

                                {/* ─ STEP 2: Date ─ */}
                                <div>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#2D3748", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>2</span>
                                        Date
                                    </label>
                                    <input
                                        id="mark-date-input"
                                        type="date"
                                        value={markDate}
                                        onChange={e => setMarkDate(e.target.value)}
                                        className="input-dark"
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                {/* ─ STEP 3: Status ─ */}
                                <div>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#2D3748", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>3</span>
                                        Status
                                    </label>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        {(["present", "absent"] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setMarkStatus(s)}
                                                style={{
                                                    flex: 1, padding: "12px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "2px solid", transition: "all 0.15s",
                                                    background: markStatus === s ? (s === "present" ? "#10B981" : "#EF4444") : "transparent",
                                                    color: markStatus === s ? "#fff" : "#64748B",
                                                    borderColor: markStatus === s ? (s === "present" ? "#10B981" : "#EF4444") : "#2D3748",
                                                }}
                                            >
                                                {s === "present" ? "✓ Present" : "✗ Absent"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
                                    <button
                                        onClick={() => { setShowMarkPanel(false); setModalCourseFilter("all"); setModalStudentSearch(""); }}
                                        className="btn-ghost"
                                        style={{ flex: 1, padding: "12px 0", fontSize: 14 }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleMarkNew}
                                        disabled={markSaving || !markStudentId || modalCourseFilter === "all"}
                                        className="btn-gold"
                                        style={{ flex: 2, padding: "12px 0", fontSize: 14, opacity: (markSaving || !markStudentId || modalCourseFilter === "all") ? 0.5 : 1 }}
                                    >
                                        {markSaving ? "Saving…" : "Save Record"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
