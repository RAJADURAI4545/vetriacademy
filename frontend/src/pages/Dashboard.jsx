import React, { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "/";
                return;
            }

            try {
                const response = await axios.get("http://127.0.0.1:8000/api/accounts/profile/", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setUser(response.data);
            } catch (error) {
                console.error("Profile Fetch Error:", error);
                localStorage.removeItem("token");
                window.location.href = "/";
            }
        };

        fetchProfile();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh");
        window.location.href = "/";
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Welcome, {user.full_name || user.username}!</h1>
            <p>Email: {user.email}</p>
            <p>Level: {user.level} | XP: {user.xp}</p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
}

export default Dashboard;
