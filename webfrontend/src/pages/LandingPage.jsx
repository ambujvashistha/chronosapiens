import React from "react";
import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-content">
        <h1>JobSync – Your Unified Job Application Hub</h1>
        <p>Manage all ur job portals like Naukri, Internshala, Glassdoor, and Unstop</p>
        <a href="/login" className="btn-primary">Get Started</a>
      </div>
    </div>
  );
}

export default LandingPage;
