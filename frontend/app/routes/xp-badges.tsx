import { useEffect, useState } from "react";
import axios from "axios";
import api from "../api";
import { useNavigate } from "react-router";

interface Badge {
    id: number;
    name: string;
    description: string;
    icon?: string;
    points_required: number;
}

interface UserBadge {
    id: number;
    badge: Badge;
    earned_at: string;
}

interface GamificationData {
    xp: number;
    level: number;
    earned_badges: UserBadge[];
    all_badges: Badge[];
    xp_to_next_level: number;
}

export function meta() {
    return [{ title: "Vetri Academy | XP & Badges" }];
}

export default function XPBadges() {
    const [data, setData] = useState<GamificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }

        const fetchData = async () => {
            try {
                const res = await api.get("/api/lms/gamification/");
                setData(res.data);
            } catch (err: any) {
                console.error(err);
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    navigate("/login");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-amber-500 animate-spin"></div>
        </div>
    );

    const xpProgress = data ? (data.xp % 1000) / 10 : 0;
    const earnedBadgeIds = data?.earned_badges.map(eb => eb.badge.id) || [];

    return (
        <div className="min-h-screen bg-[#0F1117] text-slate-100 p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Gamification</h1>
                        <p className="text-slate-400 mt-2">Track your learning journey and achievements</p>
                    </div>
                    <div className="bg-[#1A1F2E] border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-amber-500 flex items-center justify-center text-3xl font-black text-[#0F1117]">
                            {data?.level}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">Current Level</div>
                            <div className="text-xl font-black text-slate-100">{data?.xp} <span className="text-slate-500 text-sm font-bold uppercase ml-1">Total XP</span></div>
                        </div>
                    </div>
                </header>

                {/* Level Progress */}
                <section className="mb-16">
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-lg font-bold text-slate-200">Level Progress</h2>
                        <span className="text-sm font-bold text-slate-500">{data?.xp_to_next_level} XP more to Level {data!?.level + 1}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner border border-slate-700/50">
                        <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            style={{ width: `${xpProgress}%` }}
                        ></div>
                    </div>
                </section>

                {/* Badges Section */}
                <section>
                    <h2 className="text-2xl font-black text-slate-100 mb-8 flex items-center">
                        <svg className="w-6 h-6 mr-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-2.006 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946 2.006 3.42 3.42 0 013.137 3.137 3.42 3.42 0 002.006 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-2.006 1.946 3.42 3.42 0 01-3.137 3.137 3.42 3.42 0 00-1.946 2.006 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-2.006 3.42 3.42 0 01-3.137-3.137 3.42 3.42 0 00-2.006-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 002.006-1.946 3.42 3.42 0 013.137-3.137z" /></svg>
                        Achievement Badges
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {data?.all_badges.map(badge => {
                            const isEarned = earnedBadgeIds.includes(badge.id);
                            return (
                                <div key={badge.id} className={`relative flex flex-col items-center p-6 rounded-2xl border transition-all ${isEarned ? 'bg-[#1A1F2E] border-slate-700 shadow-xl' : 'bg-[#111827] border-slate-800 opacity-60'}`}>
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 ${isEarned ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-600 grayscale'}`}>
                                        {/* You can use specific emoji or icons based on badge kind */}
                                        {badge.icon || "🏅"}
                                    </div>
                                    <h3 className={`text-center font-bold text-sm ${isEarned ? 'text-slate-100' : 'text-slate-500'}`}>{badge.name}</h3>
                                    <p className="text-[10px] text-center mt-2 text-slate-500 leading-tight">{badge.description}</p>

                                    {!isEarned && (
                                        <div className="absolute top-2 right-2">
                                            <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <button
                    onClick={() => navigate("/dashboard")}
                    className="mt-16 text-slate-500 hover:text-slate-300 flex items-center font-medium transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
