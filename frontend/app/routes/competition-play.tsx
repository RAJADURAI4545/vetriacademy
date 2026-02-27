import { useEffect, useState, useRef } from "react";
import api from "../api";
import { useNavigate, useParams } from "react-router";
import { useToast } from "../context/NotificationContext";

export default function CompetitionPlay() {
    const { showToast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();

    // Core State
    const [loading, setLoading] = useState(true);
    const [started, setStarted] = useState(false);
    const [mode, setMode] = useState<'quiz' | 'coding' | 'english' | 'memory' | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [memorySets, setMemorySets] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // UX & Animation State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [feedback, setFeedback] = useState<{ id: number; isCorrect: boolean; selected: string; correct: string } | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [finalResult, setFinalResult] = useState<any>(null);
    const [showBadge, setShowBadge] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }

        const fetchData = async () => {
            try {
                const res = await api.get(`/api/lms/competitions/questions/${id}/`);
                setMode(res.data.mode_type);
                setQuestions(res.data.questions || []);
                setMemorySets(res.data.memory_sets || []);
                setTimeLeft(res.data.time_limit * 60);
                setLoading(false);
            } catch (err: any) {
                setError(err.response?.data?.detail || "Failed to load challenge.");
                setLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);

    const startChallenge = async () => {
        try {
            await api.post(`/api/lms/competitions/start/${id}/`, {});
            setStarted(true);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            showToast("Could not start challenge.", "error");
        }
    };

    const handleAnswerSelect = (qId: number, selected: string, correct: string) => {
        if (feedback) return; // Prevent double clicking

        const isCorrect = selected === correct;

        // Update Streak
        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > maxStreak) setMaxStreak(newStreak);
        } else {
            setStreak(0);
        }

        setAnswers(prev => ({ ...prev, [qId]: selected }));
        setFeedback({ id: qId, isCorrect, selected, correct });

        // Play feedback sound (optional)
        // Move to next question after delay
        setTimeout(() => {
            setFeedback(null);
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                handleSubmit();
            }
        }, isCorrect ? 800 : 2000);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/api/lms/competitions/submit/${id}/`, { answers });
            setFinalResult(res.data);
            setIsFinished(true);
            // Trigger badge reveal after delay
            setTimeout(() => setShowBadge(true), 1500);
        } catch (err: any) {
            showToast("Submission failed.", "error");
        } finally {
            setSubmitting(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    if (loading) return <Loader />;
    if (error) return <ErrorView error={error} onBack={() => navigate("/competitions")} />;
    if (!started) return <ReadyView mode={mode} timeLeft={timeLeft} onStart={startChallenge} onBack={() => navigate("/competitions")} />;

    if (isFinished) return <CelebrationScreen result={finalResult} maxStreak={maxStreak} onExit={() => navigate("/competitions")} showBadge={showBadge} />;

    const currentQuestion = mode === 'memory' ? memorySets[0]?.questions[currentIndex] : questions[currentIndex];
    const progress = ((currentIndex + 1) / (mode === 'memory' ? memorySets[0]?.questions.length : questions.length)) * 100;

    return (
        <div className="min-h-screen bg-[#0F1117] text-slate-100 pb-20 overflow-hidden">
            {/* Header / Timer / Progress */}
            <div className="sticky top-0 z-40 bg-[#0F1117]/80 backdrop-blur-xl border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            🏆
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Question {currentIndex + 1} of {questions.length || memorySets[0]?.questions.length}</p>
                            <h2 className="text-sm font-bold">{mode?.toUpperCase()} CHALLENGE</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Streak Effect */}
                        {streak > 1 && (
                            <div className="flex items-center gap-2 animate-bounce">
                                <span className="text-2xl">{streak >= 5 ? '⚡' : '🔥'}</span>
                                <span className={`text-sm font-black ${streak >= 5 ? 'text-blue-400' : 'text-orange-500 underline decoration-2'}`}>
                                    {streak >= 5 ? 'GENIUS MODE!' : streak >= 3 ? 'ON FIRE!' : `${streak} STREAK!`}
                                </span>
                            </div>
                        )}

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold ${timeLeft < 60 ? 'bg-rose-500/10 border-rose-500/50 text-rose-500 animate-pulse' : 'bg-slate-800/50 border-slate-700 text-slate-300'}`}>
                            <IconClock /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                    </div>
                </div>
                {/* Smooth Progress Bar */}
                <div className="h-1.5 bg-slate-800/50 w-full">
                    <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 transition-all duration-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto mt-12 px-6 relative">
                <div key={currentIndex} className="animate-in slide-in-from-right fade-in duration-500 ease-out">
                    {mode === 'quiz' && (
                        <QuizCard
                            question={currentQuestion}
                            onSelect={(opt: string) => handleAnswerSelect(currentQuestion.id, opt, currentQuestion.correct_option)}
                            feedback={feedback}
                        />
                    )}
                    {mode === 'memory' && (
                        <MemoryPlay
                            memorySets={memorySets}
                            currentIndex={currentIndex}
                            onSelect={(opt: string) => handleAnswerSelect(currentQuestion.id, opt, currentQuestion.correct_option)}
                            feedback={feedback}
                        />
                    )}
                    {/* Other modes would follow similar refined patterns */}
                    {(mode === 'coding' || mode === 'english') && (
                        <div className="bg-[#1A1F2E] p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                            <h3 className="text-xl font-bold mb-8">This module is under visual upgrade...</h3>
                            <button onClick={handleSubmit} className="btn-gold">SUBMIT RESPONSES</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Popups */}
            {feedback && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom fade-in duration-300">
                    <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 ${feedback.isCorrect ? 'bg-emerald-500 text-[#0F1117]' : 'bg-rose-500 text-white'}`}>
                        <span className="text-2xl">{feedback.isCorrect ? '🎉' : '💡'}</span>
                        <div>
                            <p className="font-black leading-tight">{feedback.isCorrect ? 'CORRECT!' : 'NOT QUITE!'}</p>
                            <p className="text-xs font-bold opacity-80">{feedback.isCorrect ? 'Keep that momentum!' : 'Watch carefully next time.'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* --- REFINED SUB-COMPONENTS --- */

function QuizCard({ question, onSelect, feedback }: any) {
    return (
        <div className="bg-[#1A1F2E] p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="mb-10">
                <h3 className="text-2xl md:text-3xl font-black text-slate-100 leading-tight">
                    {question.question_text}
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {['A', 'B', 'C', 'D'].map((opt) => {
                    const isSelected = feedback?.selected === opt;
                    const isCorrect = feedback?.correct === opt;
                    const isWrong = isSelected && !isCorrect;

                    return (
                        <button
                            key={opt}
                            disabled={!!feedback}
                            onClick={() => onSelect(opt)}
                            className={`group relative p-6 rounded-2xl border text-left transition-all duration-300 flex items-center gap-5 active:scale-[0.98] 
                                ${isSelected ? (isCorrect ? 'bg-emerald-500 border-emerald-400 text-[#0F1117] shadow-[0_0_30px_rgba(16,185,129,0.3)] bounce' : 'bg-rose-500 border-rose-400 text-white shake shadow-[0_0_30px_rgba(239,68,68,0.3)]')
                                    : feedback && isCorrect ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'
                                        : 'bg-[#0F1117] border-slate-800 hover:border-amber-500/50 hover:bg-[#151926] text-slate-300'}`}
                        >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors
                                ${isSelected ? 'bg-black/20' : 'bg-slate-800 group-hover:bg-amber-500/20 group-hover:text-amber-500'}`}>
                                {opt}
                            </span>
                            <span className="text-lg font-bold">{question[`option_${opt.toLowerCase()}`]}</span>

                            {isSelected && isCorrect && <span className="absolute right-6 text-xl">✅</span>}
                            {isWrong && <span className="absolute right-6 text-xl">❌</span>}
                        </button>
                    );
                })}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .bounce { animation: bounce 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
                .shake { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
                @keyframes bounce { 
                    0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); }
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            ` }} />
        </div>
    );
}

function CelebrationScreen({ result, maxStreak, onExit, showBadge }: any) {
    return (
        <div className="fixed inset-0 z-[100] bg-[#0F1117] flex items-center justify-center p-6 overflow-hidden">
            <Confetti />

            <div className="max-w-md w-full text-center animate-in zoom-in fade-in duration-700 relative z-10">
                <div className="mb-8">
                    <span className="text-6xl md:text-8xl drop-shadow-2xl">🏆</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-white mb-2 leading-none uppercase italic tracking-tighter">Congratulations!</h1>
                <p className="text-slate-400 font-bold mb-10 italic">"Every attempt makes you stronger."</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#1A1F2E] p-6 rounded-3xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Score</p>
                        <p className="text-3xl font-black text-amber-500">
                            {result?.correct_answers}/{result?.total_questions}
                        </p>
                    </div>
                    <div className="bg-[#1A1F2E] p-6 rounded-3xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Best Streak</p>
                        <p className="text-3xl font-black text-orange-500">🔥 {maxStreak}</p>
                    </div>
                </div>

                {showBadge && (
                    <div className="mb-10 animate-in slide-in-from-bottom duration-700">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <span className="text-2xl">🌟</span>
                            <span className="font-black uppercase tracking-widest text-sm">
                                {result?.correct_answers > result?.total_questions * 0.8 ? "Focused Mind" : "Quick Learner"}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    onClick={onExit}
                    className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-[#0F1117] font-black rounded-[2rem] text-xl transition-all shadow-[0_20px_40px_rgba(245,158,11,0.2)]"
                >
                    CLAIM {result?.xp_earned} XP
                </button>
            </div>
        </div>
    );
}

function Confetti() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-4 rounded-full opacity-60 animate-confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#F43F5E'][i % 4],
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${3 + Math.random() * 2}s`
                    }}
                />
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes confetti {
                    0% { transform: translateY(-20px) rotate(0deg); }
                    100% { transform: translateY(110vh) rotate(720deg); }
                }
                .animate-confetti { animation: confetti linear infinite; }
            `}} />
        </div>
    );
}

function Loader() {
    return (
        <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-amber-500 animate-spin"></div>
        </div>
    );
}

function ErrorView({ error, onBack }: any) {
    return (
        <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-6 text-center">
            <div className="text-5xl mb-6">⚠️</div>
            <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">{error}</h2>
            <button onClick={onBack} className="btn-gold px-10">Return to Competitions</button>
        </div>
    );
}

function ReadyView({ mode, timeLeft, onStart, onBack }: any) {
    return (
        <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-[#1A1F2E] p-12 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                <div className="text-6xl mb-8 group-hover:scale-110 transition-transform duration-500">🏆</div>
                <h1 className="text-4xl font-black text-white mb-4 leading-none italic uppercase tracking-tighter underline decoration-amber-500 underline-offset-8">Ready to Win?</h1>
                <p className="text-slate-400 font-bold mb-10 tracking-tight leading-snug">
                    {mode?.toUpperCase()} Mode • {Math.floor(timeLeft / 60)} Minutes
                </p>
                <div className="space-y-4">
                    <button onClick={onStart} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-[#0F1117] font-black rounded-3xl text-xl transition-all shadow-[0_15px_30px_rgba(245,158,11,0.15)] active:scale-95">
                        BEGIN CHALLENGE
                    </button>
                    <button onClick={onBack} className="w-full py-4 text-slate-500 font-bold hover:text-slate-300">
                        I need more practice
                    </button>
                </div>
            </div>
        </div>
    );
}

function MemoryPlay({ memorySets, currentIndex, onSelect, feedback }: any) {
    const [showingWords, setShowingWords] = useState(true);
    const [flashCountdown, setFlashCountdown] = useState(8);

    useEffect(() => {
        if (showingWords && flashCountdown > 0) {
            const timer = setTimeout(() => setFlashCountdown(flashCountdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (flashCountdown === 0) {
            setShowingWords(false);
        }
    }, [showingWords, flashCountdown]);

    if (showingWords) {
        return (
            <div className="flex flex-col items-center justify-center py-10 scale-up">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black mb-2 italic uppercase tracking-tighter text-amber-500">Memorize fast!</h2>
                    <p className="text-slate-400 font-bold">They vanish in <span className="text-rose-500 animate-pulse">{flashCountdown}s</span></p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
                    {memorySets[0]?.words_list.map((word: string, i: number) => (
                        <div key={i} className="px-10 py-5 bg-white text-[#0F1117] text-2xl font-black rounded-3xl shadow-2xl animate-in zoom-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                            {word}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <QuizCard
            question={memorySets[0]?.questions[currentIndex]}
            onSelect={onSelect}
            feedback={feedback}
            title="Recall Time"
        />
    );
}

const IconClock = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
