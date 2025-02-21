import express from "express";
import puppeteer from "puppeteer-extra";
import cors from "cors";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 8080; // Railway asigna un puerto dinámico

// 🟢 Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🟢 Servir archivos estáticos desde 'public'
app.use(express.static(path.join(__dirname, "public")));

// 🟢 Habilitar CORS
app.use(cors());

// 🟢 Configurar Puppeteer con Stealth
puppeteer.use(StealthPlugin());

// 🟢 Función para generar User-Agent aleatorio
const generateRandomUA = () => {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115."
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// 🟢 Ruta de scraping
app.get("/get-jobs", async (req, res) => {
  try {
    console.log("🔄 Iniciando Puppeteer...");

    // 🔵 Iniciar Puppeteer con argumentos para Railway
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const query = req.query.query || "software"; // Recibe el query como parámetro
    const customUA = generateRandomUA();

    // 🔵 Abrir página de LinkedIn
    const page1 = await browser.newPage();
    await page1.setViewport({ width: 1920, height: 1080 });
    await page1.setUserAgent(customUA);

    await page1.goto(`https://www.linkedin.com/jobs/search?keywords=${query}&location=Spain&geoId=105646813&f_TPR=r604800&position=1&pageNum=0`);

    // 🔵 Extraer empleos de LinkedIn
    const linkedinJobs = await page1.evaluate(() => {
      return Array.from(document.querySelectorAll(".jobs-search__results-list li")).map(job => ({
        title: job.querySelector(".base-search-card__title")?.innerText.trim() || "No title",
        company: job.querySelector(".base-search-card__subtitle a")?.innerText.trim() || "No company",
        location: job.querySelector(".job-search-card__location")?.innerText.trim() || "No location",
        link: job.querySelector(".base-card__full-link")?.href || "#"
      }));
    });

    console.log(`✅ LinkedIn: ${linkedinJobs.length} empleos encontrados`);

    // 🔵 Abrir página de InfoJobs
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1920, height: 1080 });
    await page2.setUserAgent(customUA);

    await page2.goto(`https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${query}&searchByType=country&segmentId=&page=1&sortBy=PUBLICATION_DATE&onlyForeignCountry=false&countryIds=17&sinceDate=ANY`);

    await page2.waitForSelector("main div div ul .ij-List-item", { timeout: 60000 }); // Espera hasta 60s

    // 🔵 Extraer empleos de InfoJobs
    const infojobsJobs = await page2.evaluate(() => {
      return Array.from(document.querySelectorAll("main div div ul .ij-List-item"))
        .map(job => {
          if (job.querySelector(".ij-CampaignsLogosSimple") || job.querySelector(".ij-OfferList-banner")) {
            return null;
          }
          return {
            title: job.querySelector(".ij-OfferCardContent-description-title a")?.innerText.trim() || "No title",
            company: job.querySelector(".ij-OfferCardContent-description-subtitle a")?.innerText.trim() || "No company",
            location: job.querySelector(".ij-OfferCardContent-description-list-item span")?.innerText.trim() || "No location",
            link: job.querySelector(".ij-OfferCardContent-description-title a")?.href || "#",
            salary: job.querySelector(".ij-OfferCardContent-description-salary-no-information")?.innerText.trim() || "No salary information"
          };
        })
        .filter(job => job !== null);
    });

    console.log(`✅ InfoJobs: ${infojobsJobs.length} empleos encontrados`);

    await browser.close(); // 🔴 IMPORTANTE: Cerrar Puppeteer

    // 🔵 Responder con los empleos encontrados
    res.json({ linkedin: linkedinJobs, infojobs: infojobsJobs });

  } catch (error) {
    console.error("❌ Error en /get-jobs:", error);
    res.status(500).json({ error: "Error al obtener los trabajos" });
  }
});

// 🟢 Servir `index.html`
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🟢 Iniciar Servidor
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${port}`);
});
