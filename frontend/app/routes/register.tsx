import * as React from "react";
import { Link, useNavigate } from "react-router";
import api from "../api";

export function meta() {
    return [{ title: "Join VetriAcademy | Create Account" }];
}

export default function Register() {
    const [step, setStep] = React.useState(1);
    const [formData, setFormData] = React.useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        parent_name: "",
        dob: "",
        address: "",
        school_name: "",
        standard_grade: "",
    });
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();

    React.useEffect(() => {
        const token = localStorage.getItem("access_token");
        const role = localStorage.getItem("user_role");
        if (token && role) {
            if (role === "admin") navigate("/admin-dashboard");
            else if (role === "teacher") navigate("/teacher-dashboard");
            else navigate("/dashboard");
        }
    }, [navigate]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        setError("");

        try {
            await api.post("/api/accounts/register/", {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                parent_name: formData.parent_name,
                dob: formData.dob || null,
                address: formData.address,
                school_name: formData.school_name,
                standard_grade: formData.standard_grade,
            });
            navigate("/login");
        } catch (err: any) {
            if (err.response?.data) {
                const errors = err.response.data;
                const msg = Object.keys(errors)
                    .map((key) => `${key}: ${errors[key]}`)
                    .join(", ");
                setError(msg);
            } else {
                setError("Account creation failed. Please check your internet connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1117] relative overflow-hidden font-sans py-12 px-4" style={{ background: 'radial-gradient(circle at top right, #1e293b, #0f172a, #020617)' }}>
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-xl">
                <div className="bg-[#1E293B]/50 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-slate-800">
                    <div className="text-center mb-10">
                        <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-[#0F1117] font-black group-hover:rotate-12 transition-transform shadow-lg shadow-amber-500/20 text-xl">V</div>
                            <span className="text-xl font-black tracking-tighter text-white">VetriAcademy</span>
                        </Link>
                        <h2 className="text-3xl font-black text-white mb-2">Join Vetri Paathai 2026</h2>
                        <div className="flex justify-center gap-2 mt-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-amber-500' : 'w-4 bg-slate-700'}`}></div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold uppercase tracking-widest rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-4 fade-in">
                                <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Step 01: Account Setup</h3>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Username</label>
                                    <input
                                        type="text"
                                        placeholder="Choose a portal name..."
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="yourname@vetri.com"
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirm</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="button" onClick={nextStep} className="w-full py-4 bg-amber-500 text-[#0F1117] font-black rounded-xl hover:bg-amber-400 transition-all text-sm active:scale-95 shadow-lg shadow-amber-500/10">CONTINUE TO BASIC INFO</button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 fade-in">
                                <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Step 02: Basic Information</h3>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Your full name..."
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Parent's Name</label>
                                        <input
                                            type="text"
                                            placeholder="Guardian name..."
                                            className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                            value={formData.parent_name}
                                            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date of Birth</label>
                                        <input
                                            type="date"
                                            className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Residential Address</label>
                                    <textarea
                                        placeholder="Your current address..."
                                        rows={3}
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium resize-none"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={prevStep} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750 transition-all text-sm">BACK</button>
                                    <button type="button" onClick={nextStep} className="flex-[2] py-4 bg-amber-500 text-[#0F1117] font-black rounded-xl hover:bg-amber-400 transition-all text-sm active:scale-95">CONTINUE TO ACADEMICS</button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 fade-in">
                                <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Step 03: Academic Details</h3>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">School Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your school name..."
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                        value={formData.school_name}
                                        onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Standard / Grade</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10th Standard"
                                        className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                        value={formData.standard_grade}
                                        onChange={(e) => setFormData({ ...formData, standard_grade: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={prevStep} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750 transition-all text-sm">BACK</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-4 bg-amber-500 text-[#0F1117] font-black rounded-xl shadow-xl shadow-amber-500/20 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 transition-all text-sm active:scale-95"
                                    >
                                        {loading ? "INITIALIZING SECURE ACCOUNT..." : "FINISH REGISTRATION"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            Already Enrolled? <Link to="/login" className="text-amber-500 font-black hover:underline ml-1">Sign In Portal</Link>
                        </p>
                    </div>
                </div>
            </div>
            <style>{`
                .fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
