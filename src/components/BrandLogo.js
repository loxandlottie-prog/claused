import React, { useState } from "react";

export default function BrandLogo({ logo, logoColor, domain, size = 36 }) {
  const [failed, setFailed] = useState(false);

  const radius = size <= 30 ? 8 : 10;
  const fontSize = size <= 30 ? 10 : 11;

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (domain && !failed) {
    return (
      <div style={{ ...baseStyle, background: "#fff", border: "1px solid #EDE9E4" }}>
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={logo}
          onError={() => setFailed(true)}
          style={{ width: "72%", height: "72%", objectFit: "contain", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, background: logoColor, fontSize, fontWeight: 800, color: "#fff", letterSpacing: "0.3px" }}>
      {logo}
    </div>
  );
}
