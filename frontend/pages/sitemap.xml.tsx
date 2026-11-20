import axios from "axios";
import { GetServerSideProps } from "next";
import { getApiBaseUrl } from "@/lib/productClient";

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const getRequestHost = (request: Parameters<GetServerSideProps>[0]["req"]) => {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    || request.headers.host
    || "";
  const hostname = host.split(",")[0].trim().split(":")[0].toLowerCase();
  return /^[a-z0-9.-]+$/.test(hostname) ? hostname : "";
};

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = getRequestHost(req);
  const baseUrl = host ? `https://${host}` : "";
  const urls = new Set<string>(baseUrl ? [`${baseUrl}/`] : []);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Vary", "Host");

  if (host) {
    const headers = { "X-Store-Domain": host };
    try {
      const apiBase = getApiBaseUrl();
      const storeResponse = await axios.get(`${apiBase}/store/info`, { headers, timeout: 8000 });
      const store = storeResponse.data;

      for (const category of store.categories || []) {
        if (category.path) urls.add(`${baseUrl}${category.path.startsWith("/") ? category.path : `/${category.path}`}`);
      }

      const firstPage = await axios.get(`${apiBase}/products?page=0&size=100`, { headers, timeout: 8000 });
      const totalPages = Math.min(Number(firstPage.data.totalPages || 1), 100);
      const productPages = [];
      for (let page = 1; page < totalPages; page += 5) {
        const batch = await Promise.allSettled(
          Array.from({ length: Math.min(5, totalPages - page) }, (_, index) =>
            axios.get(`${apiBase}/products?page=${page + index}&size=100`, { headers, timeout: 8000 }),
          ),
        );
        productPages.push(...batch.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        ));
      }
      for (const product of [
        ...(firstPage.data.content || []),
        ...productPages.flatMap((response) => response.data.content || []),
      ]) {
        if (product.id != null) urls.add(`${baseUrl}/details/${encodeURIComponent(product.id)}`);
      }
    } catch {
      // Keep the store homepage in the sitemap if the API is temporarily unavailable.
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    [...urls].map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("") +
    `</urlset>`;
  res.statusCode = 200;
  res.end(xml);

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
