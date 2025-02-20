import express from "express";
import puppeteer from "puppeteer-extra";
import cors from "cors";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000; // Railway asigna un puerto dinámico

// 🟢 Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🟢 Servir archivos estáticos desde 'public'
app.use(express.static(path.join(__dirname, "public")));

// 🟢 Habilitar CORS
app.use(cors());

// 🟢 Configurar Puppeteer con Stealth
puppeteer.use(StealthPlugin());

// 🟢 Ruta de scraping
app.get("/get-jobs", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // IMPORTANTE PARA RAILWAY
    });

    const page = await browser.newPage();
    await page.goto("https://www.linkedin.com/jobs/search/", { waitUntil: "networkidle2" });

    // Scraping aquí...
    const jobs = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".job-result-card")).map((job) => ({
        title: job.querySelector(".job-result-card__title")?.innerText || "No title",
        company: job.querySelector(".job-result-card__subtitle")?.innerText || "No company",
        link: job.querySelector(".job-result-card__title a")?.href || "No link",
      }))
    );

    await browser.close();
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el scraping" });
  }
});

// 🟢 Servir `index.html`
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🟢 Iniciar Servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
