import * as React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router";
import { useToast } from "../context/NotificationContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface UserDetails {
    username: string;
    email: string;
    profile_picture: string | null;
}

interface CompetitionRecord {
    competition_title: string;
    score: number;
    correct_answers: number;
    total_questions: number;
    date: string;
    mode: string;
}

interface StudentPerformanceRecord {
    id: number;
    student_details: UserDetails;
    course_name: string;
    attendance_pct: number;
    grade_val: string | null;
    best_competition_score: number;
    competition_records: CompetitionRecord[];
}

export function meta() {
    return [{ title: "Student Analytics | Vetri Teacher" }];
}

export default function TeacherStudentPerformance() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { enrollment_id } = useParams();
    const [performance, setPerformance] = useState<StudentPerformanceRecord | null>(null);
    const [loading, setLoading] = useState(true);

    const token = () => localStorage.getItem("access_token") || "";

    useEffect(() => {
        const fetchPerformance = async () => {
            try {
                const resp = await axios.get(`http://localhost:8000/api/lms/teacher/students/${enrollment_id}/performance/`, {
                    headers: { Authorization: `Bearer ${token()}` }
                });
                setPerformance(resp.data);
            } catch (err) {
                showToast("Failed to load student performance.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchPerformance();
    }, [enrollment_id]);

    const getImageUrl = (path: string | null) => {
        if (!path) return "https://ui-avatars.com/api/?name=User&background=random";
        if (path.startsWith('http')) return path;
        return `http://localhost:8000${path}`;
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", flexDirection: 'column', alignItems: "center", justifyContent: "center", color: "#64748B" }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1a1f2e', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: 16, fontWeight: 600 }}>Analyzing student data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!performance) return <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" }}>Student record not found.</div>;

    // Charts Data
    const attendanceData = [
        { name: 'Present', value: performance.attendance_pct, color: '#10B981' },
        { name: 'Absent', value: 100 - performance.attendance_pct, color: '#EF4444' },
    ];

    const competitionSummaryData = [
        { name: 'Student High', value: performance.best_competition_score },
        { name: 'Avg Score', value: 65 },
        { name: 'Class Top', value: 100 },
    ];

    return (
        <div style={{ minHeight: "100vh", background: "#0D0F14", color: "#F1F5F9", fontFamily: '"Inter", sans-serif', padding: "40px 48px" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                .glass-card { background: rgba(26, 31, 46, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 32px; transition: transform 0.3s ease; }
                .glass-card:hover { transform: translateY(-4px); border-color: rgba(245, 158, 11, 0.2); }
                .btn-back { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); color: #94A3B8; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; width: fit-content; margin-bottom: 32px; }
                .btn-back:hover { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border-color: #F59E0B; }
                .stat-pill { background: rgba(245, 158, 11, 0.1); color: #F59E0B; padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.2); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade { animation: fadeIn 0.6s ease-out forwards; }
                .comp-row { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 16px 0; display: grid; grid-template-columns: 1fr 100px 100px 120px 80px; align-items: center; }
                .comp-row:last-child { border-bottom: none; }
                .mode-tag { font-size: 11px; text-transform: uppercase; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); color: #94A3B8; }
                .correct-tag { color: #10B981; font-weight: 700; }
                .incorrect-tag { color: #EF4444; font-weight: 700; }
            `}</style>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <button onClick={() => navigate("/teacher-dashboard")} className="btn-back">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Portal
                </button>

                {/* Profile Header */}
                <div className="glass-card animate-fade" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
                    <div style={{ position: 'relative' }}>
                        <img src={getImageUrl(performance.student_details.profile_picture)} alt="" style={{ width: 140, height: 140, borderRadius: 28, objectFit: "cover", border: "4px solid #F59E0B" }} />
                        <div style={{ position: 'absolute', bottom: -10, right: -10, background: '#10B981', width: 32, height: 32, borderRadius: '50%', border: '4px solid #0D0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <span className="stat-pill">{performance.course_name}</span>
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#F1F5F9", letterSpacing: '-1px' }}>{performance.student_details.username}</h1>
                        <p style={{ color: "#94A3B8", fontSize: 18, marginTop: 4 }}>{performance.student_details.email}</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                    {/* Competition History Full Width */}
                    <div className="glass-card animate-fade" style={{ animationDelay: '0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 800 }}>Detailed Challenge Accuracy</h3>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <span className="stat-pill" style={{ background: '#10B9811A', color: '#10B981', borderColor: '#10B98133' }}>Accuracy Tracker</span>
                            </div>
                        </div>

                        <div style={{ minWidth: 800 }}>
                            <div className="comp-row" style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: 10, fontWeight: 700, color: '#64748B', fontSize: 12, textTransform: 'uppercase' }}>
                                <div>Challenge Name</div>
                                <div style={{ textAlign: 'center' }}>Mode</div>
                                <div style={{ textAlign: 'center' }}>Date</div>
                                <div style={{ textAlign: 'center' }}>Correct / Total</div>
                                <div style={{ textAlign: 'right' }}>Score</div>
                            </div>

                            {performance.competition_records.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>No competition records found.</div>
                            ) : (
                                performance.competition_records.map((rec, idx) => {
                                    const incorrect = rec.total_questions - rec.correct_answers;
                                    return (
                                        <div key={idx} className="comp-row">
                                            <div style={{ fontWeight: 600 }}>{rec.competition_title}</div>
                                            <div style={{ textAlign: 'center' }}><span className="mode-tag">{rec.mode}</span></div>
                                            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748B' }}>{rec.date}</div>
                                            <div style={{ textAlign: 'center', fontSize: 14 }}>
                                                <span className="correct-tag">{rec.correct_answers}</span>
                                                <span style={{ color: '#64748B', margin: '0 4px' }}>/</span>
                                                <span style={{ fontWeight: 700 }}>{rec.total_questions}</span>
                                                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                                                    ({incorrect} Incorrect)
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', fontWeight: 800, color: rec.score >= 80 ? '#10B981' : rec.score >= 50 ? '#F59E0B' : '#EF4444' }}>
                                                {rec.score} XP
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 24, marginTop: 24 }}>
                    <div className="glass-card animate-fade" style={{ animationDelay: '0.1s' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#F59E0B' }}>Engagement Level</h3>
                        <div style={{ height: 180, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={attendanceData} innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                                        {attendanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 800 }}>{Math.round(performance.attendance_pct)}%</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card animate-fade" style={{ animationDelay: '0.4s' }}>
                        <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#3B82F6' }}>Strategic Assessment</h4>
                        <div style={{ lineHeight: 1.7, color: "#94A3B8", fontSize: 15 }}>
                            <p>
                                Analysis of <strong>{performance.student_details.username}'s</strong> submissions shows an average accuracy of
                                <strong> {performance.competition_records.length > 0 ?
                                    Math.round((performance.competition_records.reduce((acc, curr) => acc + (curr.correct_answers / (curr.total_questions || 1)), 0) / performance.competition_records.length) * 100)
                                    : 0}%</strong>.
                            </p>
                            <p style={{ marginTop: 12 }}>
                                {performance.competition_records.some(r => r.total_questions - r.correct_answers > 3)
                                    ? "There is a noticeable gap between attempted and correct answers in certain complex modes. Focused practice in those areas is recommended."
                                    : "The student shows a high degree of precision in their answers, with very few incorrect attempts relative to the total volume of questions."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
