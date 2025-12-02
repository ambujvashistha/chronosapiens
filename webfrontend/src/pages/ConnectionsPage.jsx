import React, { useEffect, useState } from "react";
import "./ConnectionsPage.css";

const initialConnections = [
  { name: "LinkedIn", connected: false },
  { name: "UnStop", connected: false },
  { name: "Indeed", connected: false }
];

export default function ConnectionsPage() {
  const [connectionsList, setConnectionsList] = useState(initialConnections);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("connections")) || {};
    setConnectionsList((prev) =>
      prev.map((c) => ({ ...c, connected: !!saved[c.name] }))
    );
  }, []);

  const handleToggle = (name) => {
    setConnectionsList((prev) =>
      prev.map((c) =>
        c.name === name ? { ...c, connected: !c.connected } : c
      )
    );

    const saved = JSON.parse(localStorage.getItem("connections")) || {};
    saved[name] = !saved[name];
    localStorage.setItem("connections", JSON.stringify(saved));
  };

  return (
    <div className="connections-page">
      <div className="connections-container">
        <div className="connections-header">
          <h1 className="connections-title">Connections</h1>
        </div>

        <p className="connections-subtitle">
          Manage your connections to external job platforms to streamline your application process.
        </p>

        <div className="connections-list">
          {connectionsList.map((conn) => (
            <div key={conn.name} className="connection-card">
              <div className="platform-info">
                <span className="platform-name">{conn.name}</span>
              </div>
              <button
                className={`connect-button ${conn.connected ? "connected" : ""
                  }`}
                onClick={() => handleToggle(conn.name)}
              >
                {conn.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
        </div>

        <footer className="connections-footer">JobSync © 2025</footer>
      </div>
    </div>
  );
}
