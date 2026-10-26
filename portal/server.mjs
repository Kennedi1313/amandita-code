import { createReadStream } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve("dist");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const isInsideRoot = (filePath) =>
  filePath === root || filePath.startsWith(`${root}${sep}`);

const sendFile = (request, response, filePath, statusCode = 200) => {
  stat(filePath)
    .then((fileInfo) => {
      response.writeHead(statusCode, {
        "Content-Length": fileInfo.size,
        "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      createReadStream(filePath).pipe(response);
    })
    .catch(() => {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    });
};

export const createPortalServer = () =>
  createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad request");
      return;
    }

    const requestedPath = resolve(
      root,
      pathname === "/" ? "index.html" : `.${pathname}`,
    );
    if (!isInsideRoot(requestedPath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    try {
      const filePath = await realpath(requestedPath);
      if (!isInsideRoot(filePath)) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const fileInfo = await stat(filePath);
      if (fileInfo.isFile()) {
        sendFile(request, response, filePath);
        return;
      }
    } catch {
      // Missing assets should stay 404s; only page navigations use the branded page.
    }

    if (extname(pathname)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const notFoundPage = resolve(root, "404.html");
    try {
      await access(notFoundPage);
      sendFile(request, response, notFoundPage, 404);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 5174);
  createPortalServer().listen(port, "0.0.0.0", () => {
    console.log(`Portal listening on port ${port}`);
  });
}
