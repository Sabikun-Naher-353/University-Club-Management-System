import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ style = {} }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title="Toggle theme"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: ".95rem",
        transition: "background .2s, border-color .2s",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--surface3)";
        e.currentTarget.style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--surface2)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}