import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// This deployment terminates plain HTTP by default (no reverse-proxy TLS in
// front). `upgrade-insecure-requests` tells the browser to silently retry
// every sub-resource over HTTPS — harmless on a real TLS deployment, but on
// plain HTTP it breaks CSS/JS loading entirely for any origin the browser
// doesn't special-case as trustworthy (this affects LAN IPs; "localhost"
// itself is exempted by browsers, which is why this only shows up when
// accessing the app from another device on the network). Only emit it once
// TLS is actually configured in front of this app.
const httpsEnabled = process.env.NEXT_PUBLIC_HTTPS_ENABLED === "true";
const rulesApiUrl = process.env.NEXT_PUBLIC_RULES_API_URL ?? "/rules-api";
const rulesInternalApiUrl = process.env.RULES_INTERNAL_API_URL ?? "http://whatsaap-backend-api:8000";
const rulesConnectSrc = rulesApiUrl.startsWith("/") ? "" : ` ${rulesApiUrl}`;

// The connector's host isn't known at build time — shared/lib/api/connectorOrigin.ts
// derives it in the browser from whatever host loaded the dashboard itself (so a
// laptop's changing LAN IP/DHCP address doesn't require a rebuild). CSP can't express
// "the same host this page was loaded from", so instead this allows the connector's
// port on any host; NEXT_PUBLIC_CONNECTOR_API_URL/_WS_URL, when explicitly set for a
// topology where connector and dashboard aren't co-located, are additionally allow-listed.
const connectorApiUrlOverride = process.env.NEXT_PUBLIC_CONNECTOR_API_URL;
const connectorWsUrlOverride = process.env.NEXT_PUBLIC_CONNECTOR_WS_URL;
const connectorPort = process.env.NEXT_PUBLIC_CONNECTOR_PORT || "3000";
const connectorConnectSrc = [
  `http://*:${connectorPort}`,
  `https://*:${connectorPort}`,
  `ws://*:${connectorPort}`,
  `wss://*:${connectorPort}`,
  connectorApiUrlOverride,
  connectorWsUrlOverride,
  connectorWsUrlOverride?.replace(/^http/, "ws"),
]
  .filter(Boolean)
  .join(" ");

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' ${connectorConnectSrc}${rulesConnectSrc};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDev || !httpsEnabled ? "" : "upgrade-insecure-requests;"}
`;

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/rules-api/:path*",
        destination: `${rulesInternalApiUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader.replace(/\s{2,}/g, " ").trim() },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
