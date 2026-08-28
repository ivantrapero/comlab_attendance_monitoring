import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  User,
  Monitor,
  ShieldCheck,
  AlertCircle,
  Moon,
  Sun,
} from "lucide-react";

import { loginUser } from "./firebaseAuth";

import "./App.css";

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLightMode, setIsLightMode] = useState(
    () => document.documentElement.dataset.theme === "light",
  );

  const toggleTheme = () => {
    const nextTheme = isLightMode ? "dark" : "light";

    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("comlab-theme", nextTheme);
    setIsLightMode(nextTheme === "light");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
    } catch (error) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password.");
      } else if (error.code === "auth/too-many-requests") {
        setError(
          "Too many failed attempts. Please try again later."
        );
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-container">

        <section className="branding-section">
          <div className="branding-content">

            <div>
              <div className="logo-box">
                <Monitor size={30} />
              </div>

              <h1>
                ComLab
                <span>Attendance</span>
                Monitoring
              </h1>

              <div className="gold-line"></div>

              <p className="branding-description">
                A centralized system designed to record, monitor,
                and manage instructor attendance inside the
                Computer Laboratory.
              </p>
            </div>

            <div className="security-info">
              <div className="security-icon">
                <ShieldCheck size={20} />
              </div>

              <div>
                <strong>Secure Attendance Records</strong>
                <span>Authorized personnel only</span>
              </div>
            </div>

          </div>
        </section>

        <section className="login-section">
          <div className="login-form-container">

            <div className="mobile-brand">
              <div className="mobile-logo">
                <Monitor size={22} />
              </div>

              <div>
                <strong>ComLab Attendance</strong>
                <span>Monitoring System</span>
              </div>
            </div>

            <div className="login-header">
              <h2>Welcome back</h2>

              <p>
                Sign in to manage instructor attendance
                and laboratory records.
              </p>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="login-form"
              onSubmit={handleLogin}
            >

              <div className="form-group">
                <label htmlFor="email">
                  Email
                </label>

                <div className="input-wrapper">
                  <User
                    className="input-icon"
                    size={19}
                  />

                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>

                <div className="input-wrapper">
                  <LockKeyhole
                    className="input-icon"
                    size={19}
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-password"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

            </form>

            <div className="security-notice">
              <ShieldCheck size={18} />

              <p>
                This system is intended for authorized
                Computer Laboratory personnel.
              </p>
            </div>

            <div className="login-theme-control">
              <button
                type="button"
                className="login-theme-button"
                onClick={toggleTheme}
                aria-label={`Switch to ${isLightMode ? "dark" : "light"} mode`}
                title={`Switch to ${isLightMode ? "dark" : "light"} mode`}
              >
                {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>

            <footer>
              © 2026 Computer Laboratory
            </footer>

          </div>
        </section>

      </div>
    </main>
  );
}

export default App;