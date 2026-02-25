import * as React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import { useToast } from "../context/NotificationContext";

interface Competition {
    id: number;
    title: string;
    description: string;
    category: 'internal' | 'external';
    external_link?: string;
    start_date: string;
    end_date: string;
    reward_xp: number;
    reward_badge?: {
        name: string;
        icon?: string;
    };
    participant_count: number;
    is_joined: boolean;
}

interface LeaderboardEntry {
    username: string;
    profile_picture?: string;
    score: number;
    joined_at: string;
}

export function meta() {
    return [{ title: "Vetri Academy | Competitions" }];
}

export default function Competitions() {
    const { showToast } = useToast();
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
    const [showLeaderboard, setShowLeaderboard] = useState<number | null>(null);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }

        const fetchCompetitions = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`http://localhost:8000/api/lms/competitions/?category=${activeTab}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCompetitions(res.data);
            } catch (err) {
                console.error(err);
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    navigate("/login");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCompetitions();
    }, [navigate, activeTab]);

    const handleJoin = async (id: number) => {
        const token = localStorage.getItem("access_token");
        try {
            await axios.post(`http://localhost:8000/api/lms/competitions/join/${id}/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompetitions(prev => prev.map(c => c.id === id ? { ...c, is_joined: true, participant_count: c.participant_count + 1 } : c));
            showToast("Success! You've joined the competition.", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to join competition.", "error");
        }
    };

    const fetchLeaderboard = async (id: number) => {
        const token = localStorage.getItem("access_token");
        setLoadingLeaderboard(true);
        setShowLeaderboard(id);
        try {
            const res = await axios.get(`http://localhost:8000/api/lms/competitions/leaderboard/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeaderboardData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    if (loading && competitions.length === 0) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-amber-500 animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F1117] text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Competitions</h1>
                        <p className="text-slate-400 mt-2">Challenge yourself and earn rewards</p>
                    </div>

                    <div className="flex bg-[#1A1F2E] p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setActiveTab('internal')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'internal' ? 'bg-amber-500 text-[#0F1117]' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Internal Contests
                        </button>
                        <button
                            onClick={() => setActiveTab('external')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'external' ? 'bg-amber-500 text-[#0F1117]' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            External Opportunities
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {competitions.map(comp => (
                        <div key={comp.id} className="bg-[#1A1F2E] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/50 transition-all group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider">
                                        {comp.reward_xp} XP REWARD
                                    </span>
                                    {comp.category === 'internal' && (
                                        <div className="flex items-center text-slate-500 text-xs font-medium">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            {comp.participant_count}
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-100 mb-2">{comp.title}</h2>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2">{comp.description}</p>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center text-xs text-slate-500">
                                        <svg className="w-4 h-4 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Ends {new Date(comp.end_date).toLocaleDateString()}
                                    </div>
                                    {comp.reward_badge && (
                                        <div className="flex items-center text-xs text-amber-500">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                            Badge: {comp.reward_badge.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {comp.category === 'internal' ? (
                                    <>
                                        {comp.is_joined ? (
                                            <div className="flex flex-col gap-2">
                                                <button disabled className="w-full py-3 px-4 bg-emerald-500/10 text-emerald-500 font-bold rounded-xl border border-emerald-500/20 flex items-center justify-center">
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    Participating
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/competitions/${comp.id}/play`)}
                                                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-[#0F1117] font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10"
                                                >
                                                    PLAY CHALLENGE
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleJoin(comp.id)}
                                                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-[#0F1117] font-bold rounded-xl transition-colors active:scale-[0.98]"
                                            >
                                                Register Now
                                            </button>
                                        )}
                                        <button
                                            onClick={() => fetchLeaderboard(comp.id)}
                                            className="w-full py-3 px-4 bg-transparent hover:bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-800 transition-colors"
                                        >
                                            View Leaderboard
                                        </button>
                                    </>
                                ) : (
                                    <a
                                        href={comp.external_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl transition-colors flex items-center justify-center"
                                    >
                                        Visit Opportunity
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {competitions.length === 0 && !loading && (
                    <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                        <div className="text-4xl mb-4">🏆</div>
                        <h3 className="text-xl font-bold text-slate-300">No {activeTab} competitions found</h3>
                        <p className="text-slate-500 mt-2">Check back later for new challenges!</p>
                    </div>
                )}

                <button
                    onClick={() => navigate("/dashboard")}
                    className="mt-12 text-slate-500 hover:text-slate-300 flex items-center font-medium transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </button>
            </div>

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1A1F2E] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Leaderboard</h3>
                            <button onClick={() => setShowLeaderboard(null)} className="text-slate-500 hover:text-slate-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {loadingLeaderboard ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin"></div>
                                </div>
                            ) : leaderboardData.length > 0 ? (
                                <div className="space-y-4">
                                    {leaderboardData.map((entry, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-500 text-[#0F1117]' : 'bg-slate-800 text-slate-400'}`}>
                                                    {i + 1}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                                    {entry.profile_picture ? <img src={entry.profile_picture} alt="" /> : <IconUserSmall />}
                                                </div>
                                                <span className="font-bold text-sm">{entry.username}</span>
                                            </div>
                                            <span className="text-amber-500 font-bold">{entry.score} pts</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-500">
                                    No participants yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const IconUserSmall = () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
    </div>
);
