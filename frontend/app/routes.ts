import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/login.tsx"),
    route("login", "routes/login.tsx", { id: "login-explicit" }),
    route("register", "routes/register.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("competitions", "routes/competitions.tsx"),
    route("competitions/:id/play", "routes/competition-play.tsx"),
    route("xp-badges", "routes/xp-badges.tsx"),
    route("admin-dashboard", "routes/admin-dashboard.tsx"),
    route("admin-attendance", "routes/admin-attendance.tsx"),
    route("teacher-dashboard", "routes/teacher-dashboard.tsx"),
    route("teacher/students/:enrollment_id/performance", "routes/teacher-student-performance.tsx"),
] satisfies RouteConfig;

