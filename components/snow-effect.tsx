"use client";

import Snowfall from "react-snowfall";

export default function SnowEffect() {
  return (
    <Snowfall
      snowflakeCount={120} // adjust intensity
      style={{
        position: "fixed",
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    />
  );
}
