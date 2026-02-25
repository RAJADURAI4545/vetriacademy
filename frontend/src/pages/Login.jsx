import React, { useState } from "react";
import axios from "axios";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                "http://127.0.0.1:8000/api/auth/login/",
                {
                    email: email,
                    password: password,
                }
            );

            console.log(response.data);
            alert("Login Successful!");
        } catch (error) {
            console.error(error);
            alert("Login Failed!");
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