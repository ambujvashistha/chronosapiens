import React, { useState } from "react";
import "./ProfilePage.css";

function ProfilePage() {
  const [isEditable, setIsEditable] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [profileData, setProfileData] = useState({
    name: "John Doe",
    email: "johndoe@example.com",
    role: "Fullstack Developer",
    location: "Remote, Pune",
    salaryRange: "₹60L - ₹80L"
  });
  const [preferredRoles, setPreferredRoles] = useState([
    "Frontend Engineer",
    "Backend Developer"
  ]);
  const [newRole, setNewRole] = useState("");

  const handleEditToggle = () => {
    setIsEditable(!isEditable);
    setNewRole("");
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const extension = file.name.substring(file.name.lastIndexOf('.'));
      const username = profileData.name.replace(/\s+/g, '_').toLowerCase();
      const formattedName = `${username}_resume${extension}`;
      setResumeFile(formattedName);
    }
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    const fileInput = document.getElementById('resume-upload-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const triggerFileInput = () => {
    document.getElementById('resume-upload-input').click();
  };

  const handleAddRole = () => {
    if (newRole.trim()) {
      setPreferredRoles([...preferredRoles, newRole.trim()]);
      setNewRole("");
    }
  };

  const handleRemoveRole = (index) => {
    setPreferredRoles(preferredRoles.filter((_, i) => i !== index));
  };

  const handleRoleChange = (index, value) => {
    const updatedRoles = [...preferredRoles];
    updatedRoles[index] = value;
    setPreferredRoles(updatedRoles);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-card-header">
            <div>
              <h1 className="profile-title">Profile</h1>
              <p className="profile-subtitle">Manage your personal and professional details.</p>
            </div>
            <button
              className={`editable-btn ${isEditable ? 'editing' : ''}`}
              onClick={handleEditToggle}
            >
              {isEditable ? 'Save' : 'Editable'}
            </button>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <label>Name</label>
              {isEditable ? (
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="profile-input"
                />
              ) : (
                <p>{profileData.name}</p>
              )}
            </div>
            <div className="profile-field">
              <label>Email</label>
              {isEditable ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="profile-input"
                />
              ) : (
                <p>{profileData.email}</p>
              )}
            </div>
            <div className="profile-field">
              <label>Role</label>
              {isEditable ? (
                <input
                  type="text"
                  value={profileData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="profile-input"
                />
              ) : (
                <p>{profileData.role}</p>
              )}
            </div>
            <div className="profile-field">
              <label>Preferred Roles</label>
              <div className="role-badges">
                {preferredRoles.map((role, index) => (
                  <div key={index} className="role-badge-wrapper">
                    {isEditable && (
                      <button
                        className="remove-role-btn"
                        onClick={() => handleRemoveRole(index)}
                      >
                        −
                      </button>
                    )}
                    {isEditable ? (
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => handleRoleChange(index, e.target.value)}
                        className="role-badge role-input"
                      />
                    ) : (
                      <span className="role-badge">{role}</span>
                    )}
                  </div>
                ))}
                {isEditable && (
                  <>
                    {newRole !== "" && (
                      <div className="role-badge-wrapper">
                        <input
                          type="text"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddRole();
                            }
                          }}
                          onBlur={handleAddRole}
                          className="role-badge role-input"
                          placeholder="New role"
                          autoFocus
                        />
                      </div>
                    )}
                    <div className="add-role-wrapper">
                      <button
                        className="add-role-btn"
                        onClick={() => setNewRole(" ")}
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="profile-field">
              <label>Location</label>
              {isEditable ? (
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="profile-input"
                />
              ) : (
                <p>{profileData.location}</p>
              )}
            </div>
            <div className="profile-field">
              <label>Salary Range</label>
              {isEditable ? (
                <input
                  type="text"
                  value={profileData.salaryRange}
                  onChange={(e) => handleInputChange('salaryRange', e.target.value)}
                  className="profile-input"
                />
              ) : (
                <p>{profileData.salaryRange}</p>
              )}
            </div>
          </div>

          <div className="resume-section">
            <h3 className="resume-title">Resume</h3>
            <div className="resume-content">
              {resumeFile ? (
                <div className="resume-file-wrapper">
                  {isEditable && (
                    <button
                      className="remove-resume-btn"
                      onClick={handleRemoveResume}
                    >
                      −
                    </button>
                  )}
                  <div className="resume-file">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{resumeFile}</span>
                  </div>
                </div>
              ) : (
                <div className="resume-file no-file">
                  <span className="file-name">No Resume uploaded</span>
                </div>
              )}
              <input
                type="file"
                id="resume-upload-input"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="upload-resume-btn"
                onClick={triggerFileInput}
              >
                Upload Resume
              </button>
            </div>
          </div>
        </div>

        <footer className="profile-footer">
          <p>JobSync © 2025</p>
        </footer>
      </div>
    </div>
  );
}

export default ProfilePage;
