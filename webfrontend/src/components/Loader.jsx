import React from "react";
import "./Loader.css";

const Loader = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column", // 👈 Stack vertically
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}
    >
      <div className="loader"></div>
      <p
        style={{
          marginTop: "12px",
          fontWeight: "bold", // 👈 Bold text
          fontSize: "18px",
          color: "#000",
        }}
      >
        Loading...
      </p>
    </div>
  );
};

export default Loader;
