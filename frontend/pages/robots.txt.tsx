import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    || req.headers.host
    || "";
  const hostname = host.split(",")[0].trim().split(":")[0].toLowerCase();
  const validHost = /^[a-z0-9.-]+$/.test(hostname) ? hostname : "";

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Vary", "Host");
  res.end(`User-agent: *\nAllow: /\n${validHost ? `Sitemap: https://${validHost}/sitemap.xml\n` : ""}`);

  return { props: {} };
};

export default function Robots() {
  return null;
}
