import React, { useState } from "react";
import axios from "axios";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                "http://127.0.0.1:8000/api/accounts/login/",
                {
                    email: email, // This specific backend (using email as USERNAME_FIELD) expects 'email' key
                    password: password,
                }
            );

            console.log("Login Success:", response.data);
            localStorage.setItem("token", response.data.access);
            localStorage.setItem("refresh", response.data.refresh);
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Login Error:", error);
            const errorData = error.response?.data;
            let errorMsg = "Login Failed!";
            
            if (errorData) {
                if (typeof errorData === 'string') errorMsg = errorData;
                else if (errorData.detail) errorMsg = errorData.detail;
                else if (errorData.email) errorMsg = `Email: ${errorData.email[0]}`;
                else if (errorData.password) errorMsg = `Password: ${errorData.password[0]}`;
            }
            
            alert(errorMsg);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href =
            "http://127.0.0.1:8000/accounts/google/login/";
    };

    return (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
            <h2>Login</h2>

            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <br /><br />

                <input
                    type="password"
                    placeholder="Password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <br /><br />

                <button type="submit">Login</button>
            </form>

            <br />

            <button onClick={handleGoogleLogin}>
                Login with Google
            </button>
        </div>
    );
}

export default Login;