import React from "react";
import "./ApplicationsPage.css";

function ApplicationsPage() {
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
        <div className="applications-card">
          <h1 className="applications-title">Applications</h1>

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
                {applications.slice().reverse().map((app) => (
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

          <div className="analytics-section">
            <button className="analytics-button">Analytics</button>
          </div>
        </div>

        <footer className="applications-footer">
          <p>JobSync © 2025</p>
        </footer>
      </div>
    </div>
  );
}

export default ApplicationsPage;
