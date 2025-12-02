import React from "react";
import "./ApplicationsPage.css";

function ApplicationsPage() {
  // Sample application data
  const applications = [
    {
      id: 1,
      role: "Frontend Engineer",
      company: "Nebula Labs",
      location: "Remote",
      source: "LinkedIn",
      appliedOn: "2025-09-12"
    }
  ];

  return (
    <div className="applications-page">
      <div className="applications-container">
        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">Applications</h1>
        </header>

        {/* Navigation */}
        <nav className="nav-tabs">
          <div className="nav-logo"></div>
          <a href="#dashboard" className="nav-tab">Dashboard</a>
          <a href="#profile" className="nav-tab">Profile</a>
          <a href="#connections" className="nav-tab">Connections</a>
          <a href="#applications" className="nav-tab active">Applications</a>
          <a href="#settings" className="nav-tab">Settings</a>
        </nav>

        {/* Applications Table */}
        <div className="table-container">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Company</th>
                <th>Location</th>
                <th>Source</th>
                <th>Applied-On</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.role}</td>
                  <td>{app.company}</td>
                  <td>{app.location}</td>
                  <td>{app.source}</td>
                  <td>
                    <div className="applied-date">
                      {app.appliedOn}
                      <a href="#view" className="view-link">View Application</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Analytics Button */}
        <div className="analytics-section">
          <button className="analytics-button">Analytics</button>
        </div>

        {/* Footer */}
        <footer className="page-footer">
          <p>JobSync © 2025</p>
        </footer>
      </div>
    </div>
  );
}

export default ApplicationsPage;
