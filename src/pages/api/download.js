import { handleDownloadRequest } from "../../components/RepoForm";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract query parameters and pass them to our handler
  await handleDownloadRequest(req, res);
}
