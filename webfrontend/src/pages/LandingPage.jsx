import React from "react";
import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing">
      <nav className="navbar">
        <div className="logo">JobSync</div>
        <div className="nav-links">
          <a href="/login">Login</a>
          <a href="/signup" className="nav-btn">Sign Up</a>
        </div>
      </nav>

      <div className="landing-content">
        <div className="text-section">
          <h1>One Dashboard to Rule All Your Job Portals 👑</h1>
          <p>
            Sync and manage your job applications from platforms like{" "}
            <b>LinkedIn</b>, <b>Naukri</b>, <b>Internshala</b>, and <b>Glassdoor</b> — 
            all from one unified hub.
          </p>
          <a href="/login" className="btn-primary">Get Started</a>
        </div>

        <div className="mockup">
          <img
            src="https://cdn.dribbble.com/userupload/40676233/file/original-7d8d0105b29dce5e8e11280dd0e6c70b.jpg?resize=1504x1128&vertical=center"
            alt="Dashboard preview"
          />
        </div>
      </div>

      <footer className="footer">
        <p>© 2025 JobSync. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
