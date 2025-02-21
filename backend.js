import express from "express";
import puppeteer from "puppeteer-extra";
import cors from "cors";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 8080 // Railway asigna un puerto dinámico

const generateRandomUA = () => {
  // Array of random user agents
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.",
    "Mozilla/5.0 (Windows NT 6.1; rv:109.0) Gecko/20100101 Firefox/115.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.3",
    "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 OPR/95.0.0.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.3"
  ];
  // Get a random index based on the length of the user agents array 
  const randomUAIndex = Math.floor(Math.random() * userAgents.length);
  // Return a random user agent using the index above
  return userAgents[randomUAIndex];
}

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
    const page1 = await browser.newPage();
  const query = req.query.query || "software"; // Recibe el query como parámetro

  const customUA = generateRandomUA();
  await page1.setViewport({ width: 1920, height: 1080 });
  await page1.setUserAgent(customUA);



  await page1.goto(`https://www.linkedin.com/jobs/search?keywords=${query}&location=Spain&geoId=105646813&f_TPR=r604800&position=1&pageNum=0`);

  const linkedinJobs = await page1.evaluate(() => {
    return Array.from(document.querySelectorAll(".jobs-search__results-list li")).map(job => ({
      title: job.querySelector(".base-search-card__title")?.innerText.trim(),
      company: job.querySelector(".base-search-card__subtitle a")?.innerText.trim(),
      location: job.querySelector(".job-search-card__location")?.innerText.trim(),
      link: job.querySelector(".base-card__full-link")?.href
    }));
  });



  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1920, height: 1080 });
  await page2.setUserAgent(customUA);

  await page2.goto(`https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${query}&searchByType=country&segmentId=&page=1&sortBy=PUBLICATION_DATE&onlyForeignCountry=false&countryIds=17&sinceDate=ANY`)


  await page2.waitForSelector("main div div ul .ij-List-item", { timeout: 300000 }); // Espera 5 minutos (300,000 ms)

  const infojobsJobs = await page2.evaluate(() => {
    return Array.from(document.querySelectorAll("main div div ul .ij-List-item")).map(job => {
      // Si encontramos alguna de las clases no deseadas, retornamos null para no incluir ese trabajo
      if (job.querySelector(".ij-CampaignsLogosSimple") ||
        job.querySelector(".ij-OfferList-banner--firstPromoted") ||
        job.querySelector(".ij-OfferList-banner")) {
        return null;
      }

      return {
        title: job.querySelector(".ij-OfferCardContent-description-title a")?.innerText?.trim() || 'No title',
        company: job.querySelector(".ij-OfferCardContent-description-subtitle a")?.innerText?.trim() || 'No company',
        location: job.querySelector(".ij-OfferCardContent-description-list-item span")?.innerText?.trim() || 'No location',
        link: job.querySelector(".ij-OfferCardContent-description-title a")?.href || 'No link',
        salary: job.querySelector(".ij-OfferCardContent-description-salary-no-information")?.innerText?.trim() || 'No salary information'
      };
    }).filter(job => job !== null); // Elimina los elementos nulos del array
  });


  const jobs = {
    linkedin: linkedinJobs,
    infojobs: infojobsJobs
  };



  res.json(jobs);  // Devuelve los resultados como JSON
  console.log(customUA)

});

// 🟢 Servir `index.html`
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🟢 Iniciar Servidor
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
