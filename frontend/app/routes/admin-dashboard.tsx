import { useEffect, useState } from "react";
import api from "../api";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router";
import { useToast } from "../context/NotificationContext";

interface Course {
    id: number;
    course_name: string;
}

interface Enrollment {
    id: number;
    student: {
        id: number;
        username: string;
        email: string;
    };
    course: {
        id: number;
        course_name: string;
    };
    grade: {
        grade: string | null;
    };
    attendance: {
        percentage: number;
        attended_classes: number;
        total_classes: number;
    };
}

export function meta() {
    return [{ title: "Admin Dashboard | AntiGravity LMS" }];
}

export default function AdminDashboard() {
    const { showToast } = useToast();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Attendance marking state
    const [showMarkModal, setShowMarkModal] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [markDate, setMarkDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [markStatus, setMarkStatus] = useState<'present' | 'absent'>('present');
    const [marking, setMarking] = useState(false);

    const fetchData = async () => {
        try {
            const url = selectedCourseId === "all"
                ? "/api/lms/all-students/"
                : `/api/lms/all-students/?course_id=${selectedCourseId}`;

            const [enrollRes, courseRes] = await Promise.all([
                api.get(url),
                api.get("/api/lms/courses/")
            ]);

            setEnrollments(enrollRes.data);
            setCourses(courseRes.data);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            } else {
                setError("Only staff members can access this page.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [navigate, selectedCourseId]);

    const handleMarkAttendance = async () => {
        if (!selectedEnrollment) return;
        setMarking(true);
        try {
            await api.post("/api/lms/attendance/mark/", {
                enrollment_id: selectedEnrollment.id,
                date: markDate,
                status: markStatus
            });

            showToast(`Attendance marked as ${markStatus} for ${selectedEnrollment.student.username}`, "success");
            setShowMarkModal(false);
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Failed to mark attendance.", "error");
        } finally {
            setMarking(false);
        }
    };

    const filteredEnrollments = enrollments.filter(enr =>
        enr.student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enr.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enr.course.course_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center text-gray-500">Loading master records...</div>;
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="p-8 bg-white shadow-xl rounded-2xl border border-red-100 text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={() => navigate("/")} className="px-6 py-2 bg-gray-900 text-white rounded-full">Return Hub</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-4xl font-extrabold text-gray-900">Admin Master View</h1>
                            <button
                                onClick={() => { localStorage.clear(); navigate("/login"); }}
                                className="px-4 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-full hover:bg-red-100 transition-all active:scale-95"
                            >
                                Logout 👋
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="text-gray-500">Managing {enrollments.length} total enrollments across the platform.</p>
                            <button
                                onClick={() => navigate("/admin-attendance")}
                                className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full hover:bg-blue-100 transition-colors"
                            >
                                View Detailed Logs →
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.course_name}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search student or email..."
                                className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-80 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Student</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Course</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Current Grade</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Attendance</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredEnrollments.map(enr => (
                                <tr key={enr.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-gray-900">{enr.student.username}</div>
                                        <div className="text-sm text-gray-500">{enr.student.email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                                            {enr.course.course_name}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`text-xl font-black ${enr.grade.grade ? "text-gray-900" : "text-gray-300"}`}>
                                            {enr.grade.grade || "Wait"}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600" style={{ width: `${enr.attendance.percentage}%` }}></div>
                                            </div>
                                            <span className="text-sm font-bold text-blue-600">{Math.round(enr.attendance.percentage)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedEnrollment(enr);
                                                    setShowMarkModal(true);
                                                }}
                                                className="text-sm font-bold text-blue-600 hover:underline text-left"
                                            >
                                                Mark Attendance
                                            </button>
                                            <a
                                                href={`${API_BASE_URL}/admin/lms/enrollment/${enr.id}/change/`}
                                                target="_blank"
                                                className="text-sm font-bold text-gray-400 hover:text-gray-600 hover:underline"
                                            >
                                                Expert Panel
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredEnrollments.length === 0 && (
                        <div className="p-20 text-center text-gray-400">No student records match your search.</div>
                    )}
                </div>
            </div>

            {/* Attendance Modal */}
            {showMarkModal && selectedEnrollment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h2>
                        <p className="text-gray-500 mb-6">
                            Mark presence for <span className="font-bold text-gray-900">{selectedEnrollment.student.username}</span> in {selectedEnrollment.course.course_name}.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Date</label>
                                <input
                                    type="date"
                                    value={markDate}
                                    onChange={(e) => setMarkDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setMarkStatus('present')}
                                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${markStatus === 'present' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        Present
                                    </button>
                                    <button
                                        onClick={() => setMarkStatus('absent')}
                                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${markStatus === 'absent' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        Absent
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowMarkModal(false)}
                                    className="flex-1 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMarkAttendance}
                                    disabled={marking}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {marking ? "Saving..." : "Save Record"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
