import React from "react";
import "./ProfilePage.css";

function ProfilePage() {
  return (
    <div className="profile-page">
      <div className="profile-container">
        <header className="profile-header">
          <h1>Your Profile</h1>
          <p>Manage your personal info and resume details.</p>
        </header>

        <section className="profile-section">
          <h2>Personal Information</h2>
          <form className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="john.doe@example.com" />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input type="text" placeholder="New York, USA" />
            </div>

            <div className="form-group">
              <label>LinkedIn</label>
              <input type="text" placeholder="linkedin.com/in/johndoe" />
            </div>

            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </form>
        </section>

        <section className="resume-section">
          <h2>Resume</h2>
          <div className="resume-upload">
            <input type="file" id="resume" accept=".pdf,.doc,.docx" hidden />
            <label htmlFor="resume" className="upload-box">
              <span>📄 Upload Resume</span>
            </label>
            <p className="upload-hint">Supported formats: PDF, DOC, DOCX</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
