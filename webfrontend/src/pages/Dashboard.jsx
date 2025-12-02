import React, { useEffect, useState } from "react";
import "./Dashboard.css";

// Static initial data extracted outside component (minor optimization)
const INITIAL_PLATFORMS = [
  { name: "LinkedIn", status: "Pending", jobsSynced: 124 },
  { name: "Indeed", status: "Pending", jobsSynced: 0 },
  { name: "UnStop", status: "Pending", jobsSynced: 26 },
];

function Dashboard() {
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);

  useEffect(() => {
    // Read saved connection statuses from localStorage safely
    const savedConnections =
      JSON.parse(localStorage.getItem("connections") || "{}") || {};

    // Update only the status field based on saved values
    setPlatforms((prevPlatforms) =>
      prevPlatforms.map((platform) => ({
        ...platform,
        status: savedConnections[platform.name] ? "Connected" : "Pending",
      }))
    );
  }, []);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>JobSync Dashboard</h1>
        <p>
          Keep track of all your job platforms and sync statuses in one place.
        </p>
      </header>

      {/* Main Platform Cards */}
      <section className="platforms">
        {platforms.map((platform) => {
          const isConnected = platform.status === "Connected";
          return (
            <div key={`platform-${platform.name}`} className="platform-card">
              <div className="platform-top">
                <h2>{platform.name}</h2>

                {/* Dynamic badge class */}
                <span
                  className={`status-badge ${
                    isConnected ? "connected" : "pending"
                  }`}
                >
                  {platform.status}
                </span>
              </div>

              <p>
                Jobs Available: <strong>{platform.jobsSynced}</strong>
              </p>
            </div>
          );
        })}
      </section>

      {/* Extras Section */}
      <section className="extras">
        <div className="extra-card">
          <h3>Analytics</h3>
          <p>
            Coming soon: Visual insights on job performance, sync history, and
            success rates.
          </p>
        </div>

        <div className="extra-card">
          <h3>Settings</h3>
          <p>
            Manage your connected platforms, refresh tokens, and sync intervals
            here.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
