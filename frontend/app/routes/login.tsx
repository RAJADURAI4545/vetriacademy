import * as React from "react";
import { Link, useNavigate } from "react-router";
import axios from "axios";

export function meta() {
    return [{ title: "Sign In | Vetri Academy" }];
}

export default function Login() {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPass, setShowPass] = React.useState(false);
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();
    const tokenStr = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;

    React.useEffect(() => {
        const token = localStorage.getItem("access_token");
        const role = localStorage.getItem("user_role");
        if (token && role) {
            if (role === "admin") navigate("/admin-dashboard");
            else if (role === "teacher") navigate("/teacher-dashboard");
            else navigate("/dashboard");
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const resp = await axios.post("http://localhost:8000/api/accounts/login/", { email, password });
            localStorage.setItem("access_token", resp.data.access);
            localStorage.setItem("refresh_token", resp.data.refresh);

            const role = resp.data.is_staff ? "admin" : resp.data.is_teacher ? "teacher" : "student";
            localStorage.setItem("user_role", role);

            // Redirect based on role
            if (role === "admin") {
                navigate("/admin-dashboard");
            } else if (role === "teacher") {
                navigate("/teacher-dashboard");
            } else {
                navigate("/dashboard");
            }
        } catch (err: any) {
            if (err.response) {
                setError(err.response.status === 401
                    ? "Incorrect email or password. Please try again."
                    : "Server error. Please try again later."
                );
            } else {
                setError("Unable to connect to the server. Please check your internet connection or try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '"Inter", "Segoe UI", sans-serif', background: '#0F1117' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .field { width: 100%; padding: 12px 16px; background: #1A1F2E; border: 1px solid #2D3748; color: #F1F5F9; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
                .field:focus { border-color: #F59E0B; }
                .field::placeholder { color: #64748B; }
                .btn-submit { width: 100%; padding: 13px; background: linear-gradient(135deg, #F59E0B, #D97706); color: #0F1117; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(245,158,11,0.4); }
                .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
                .feature-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px; }
            `}</style>

            {/* ── LEFT PANEL (Branding) ── */}
            <div style={{ flex: 1, background: 'linear-gradient(160deg, #111827 0%, #0F1117 60%, #1a2744 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative glow */}
                <div style={{ position: 'absolute', top: -80, left: -80, width: 400, height: 400, background: '#F59E0B', borderRadius: '50%', filter: 'blur(160px)', opacity: 0.07, pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, background: '#3B82F6', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.05, pointerEvents: 'none' }}></div>

                {/* Logo */}
                <div style={{ marginBottom: 56 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', letterSpacing: '-0.5px' }}>Vetri Academy</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Learning Management Portal</div>
                </div>

                {/* Headline */}
                <h1 style={{ fontSize: 38, fontWeight: 800, color: '#F1F5F9', lineHeight: 1.15, marginBottom: 16 }}>
                    Your Learning<br />
                    <span style={{ color: '#F59E0B' }}>Journey Starts Here</span>
                </h1>
                <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.7, marginBottom: 48, maxWidth: 380 }}>
                    Access your courses, track attendance, download your academic sheet, and monitor growth — all in one place.
                </p>

                {/* Feature bullets */}
                {[
                    { icon: '📊', title: 'Live Attendance Tracking', desc: 'Day-by-day presence logs with downloadable reports' },
                    { icon: '🎓', title: 'Course Management', desc: 'All your enrolled courses and grades in one dashboard' },
                    { icon: '📁', title: 'Record Export', desc: 'Download your attendance sheet as a CSV instantly' },
                ].map(f => (
                    <div key={f.title} className="feature-item">
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F59E0B1A', border: '1px solid #F59E0B33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                            {f.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 2 }}>{f.title}</div>
                            <div style={{ fontSize: 13, color: '#64748B' }}>{f.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── RIGHT PANEL (Form) ── */}
            <div style={{ width: 460, background: '#111827', borderLeft: '1px solid #2D3748', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' }}>
                <div style={{ marginBottom: 36 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#F1F5F9', marginBottom: 8 }}>Welcome back</h2>
                    <p style={{ color: '#64748B', fontSize: 14 }}>Sign in to your student account</p>
                </div>

                {/* Error banner */}
                {error && (
                    <div style={{ background: '#EF444415', border: '1px solid #EF444440', borderRadius: 8, padding: '12px 16px', color: '#FCA5A5', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚠</span> {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    {/* Email */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</label>
                        <input
                            type="email"
                            className="field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                className="field"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                style={{ paddingRight: 44 }}
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 13 }}>
                                {showPass ? '🙈' : '👁'}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? 'Signing in…' : 'Sign In →'}
                    </button>
                </form>

                {/* Footer link */}
                <p style={{ marginTop: 28, fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
