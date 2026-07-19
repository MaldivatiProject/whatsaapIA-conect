/**
 * whatsapp-connector's origin, resolved for whichever host the browser used
 * to load this dashboard.
 *
 * Connector and dashboard are always deployed on the same host (see
 * deploy-project/docker-compose.yml), just on different ports — so instead
 * of baking an absolute URL (hostname/IP) into the build, which breaks the
 * moment that host's address changes (e.g. a laptop on DHCP, or accessing
 * the dashboard via a LAN IP instead of localhost), this swaps in the
 * connector's port on top of the dashboard's own origin at request time.
 *
 * NEXT_PUBLIC_CONNECTOR_API_URL / NEXT_PUBLIC_CONNECTOR_WS_URL remain as an
 * explicit escape hatch for topologies where that assumption doesn't hold
 * (e.g. connector and dashboard behind different hostnames).
 */
function autoDetectOrigin(): string {
  if (typeof window === "undefined") {
    // SSR-only evaluation: every connector call happens from a client-side
    // effect or event handler, by which point this re-evaluates in the
    // browser with a real window.location — this placeholder is never
    // actually used to dispatch a request.
    return "http://localhost:3000";
  }
  const port = process.env.NEXT_PUBLIC_CONNECTOR_PORT || "3000";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export function connectorApiOrigin(): string {
  return process.env.NEXT_PUBLIC_CONNECTOR_API_URL || autoDetectOrigin();
}

export function connectorWsOrigin(): string {
  return process.env.NEXT_PUBLIC_CONNECTOR_WS_URL || connectorApiOrigin();
}
