import express from "express";
import puppeteer from "puppeteer-extra";
import cors from "cors";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 8080 // Railway asigna un puerto dinámico

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
    console.log("Iniciando scraping...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreDefaultArgs: ['--disable-extensions']
    });

    const page = await browser.newPage();
    console.log("Navegando a LinkedIn...");
    
    // Aumenta el tiempo de espera y usa un selector para verificar si la página cargó correctamente
    await page.goto("https://www.linkedin.com/jobs/search/", { waitUntil: "domcontentloaded" });

    // Espera a que los resultados de los trabajos estén disponibles
    await page.waitForSelector(".job-result-card", { timeout: 10000 });

    // Scraping de los trabajos
    const jobs = await page.evaluate(() => {
      const jobElements = document.querySelectorAll(".job-result-card");
      return Array.from(jobElements).map((job) => ({
        title: job.querySelector(".job-result-card__title")?.innerText || "No title",
        company: job.querySelector(".job-result-card__subtitle")?.innerText || "No company",
        link: job.querySelector(".job-result-card__title a")?.href || "No link",
      }));
    });

    await browser.close();
    console.log("Scraping completado, enviando respuesta...");
    res.json(jobs);
  } catch (error) {
    console.error("Error en el scraping:", error);
    res.status(500).json({ error: "Error en el scraping", details: error.message });
  }
});

// 🟢 Servir `index.html`
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🟢 Iniciar Servidor
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
