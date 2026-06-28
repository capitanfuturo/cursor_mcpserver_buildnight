import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile?.(".env");
} catch {
  // The workshop normally uses direnv. A .env file is optional.
}

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const webDir = path.join(rootDir, "web");
const port = Number(process.env.WEB_PORT || 5174);
const mcpBaseUrl =
  process.env.MCP_SERVER_URL ||
  process.env.MCP_URL ||
  `http://localhost:${process.env.PORT || 3000}`;
const mcpUrl = new URL("/mcp", mcpBaseUrl);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function proxyMcp(req, res) {
  const body = await readBody(req);
  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    accept: req.headers.accept || "application/json, text/event-stream",
  };

  if (req.headers["mcp-session-id"]) {
    headers["mcp-session-id"] = req.headers["mcp-session-id"];
  }

  const upstream = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body,
  });
  const responseBody = Buffer.from(await upstream.arrayBuffer());
  const responseHeaders = {
    "content-type":
      upstream.headers.get("content-type") ||
      "application/json; charset=utf-8",
  };
  const sessionId = upstream.headers.get("mcp-session-id");

  if (sessionId) {
    responseHeaders["mcp-session-id"] = sessionId;
  }

  send(res, upstream.status, responseBody, responseHeaders);
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalizedPath = path.normalize(decodeURIComponent(requestedPath));

  if (normalizedPath.includes("..")) {
    send(res, 403, "Forbidden");
    return;
  }

  const filePath = path.join(webDir, normalizedPath);

  try {
    const file = await readFile(filePath);
    const contentType =
      mimeTypes.get(path.extname(filePath)) || "application/octet-stream";
    send(res, 200, file, { "content-type": contentType });
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url?.startsWith("/mcp")) {
      await proxyMcp(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res);
      return;
    }

    send(res, 405, "Method not allowed");
  } catch (error) {
    send(
      res,
      502,
      JSON.stringify({
        error: "Promo Kit UI could not reach the MCP server.",
        mcpUrl: mcpUrl.toString(),
        detail: error instanceof Error ? error.message : String(error),
      }),
      { "content-type": "application/json; charset=utf-8" }
    );
  }
});

server.listen(port, () => {
  console.log(`Promo Kit web UI: http://localhost:${port}`);
  console.log(`Proxying MCP calls to: ${mcpUrl}`);
});
