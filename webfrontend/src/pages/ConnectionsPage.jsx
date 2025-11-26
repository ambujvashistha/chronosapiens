import React, { useState } from "react";
import "./ConnectionsPage.css";

const connections = [
  { name: "LinkedIn", connected: false },
  { name: "UnStop", connected: false },
  { name: "Indeed", connected: false },
  { name: "Glassdoor", connected: false },
];

export default function ConnectionsPage() {
  const [connectionsList, setConnectionsList] = useState(connections);

  const handleToggle = (name) => {
    setConnectionsList((prev) =>
      prev.map((conn) =>
        conn.name === name ? { ...conn, connected: !conn.connected } : conn
      )
    );
  };

  return (
    <div className="connections-container">

      <main className="connections-main">
        <h1 className="page-title">Connections</h1>

        <div className="connections-list">
          {connectionsList.map((conn) => (
            <div key={conn.name} className="connection-card">
              <span className="platform-name">{conn.name}</span>
              <button
                className={`connect-button ${conn.connected ? "connected" : ""}`}
                onClick={() => handleToggle(conn.name)}
              >
                {conn.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
        </div>

        <footer className="connections-footer">
          JobSync © 2025
        </footer>
      </main>
    </div>
  );
}
