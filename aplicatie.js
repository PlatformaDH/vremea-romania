const FUS = "Europe/Bucharest";
const CHEIE_LOCATIE = "vremea-locatie-v2";
const LOCATIE_IMPLICITA = { judet: "Botosani", localitate: "Botoșani" };

const CODURI_VREME = {
  0: "Senin",
  1: "Predominant senin",
  2: "Parțial noros",
  3: "Înnorat",
  45: "Ceață",
  48: "Ceață cu chiciură",
  51: "Burniță ușoară",
  53: "Burniță",
  55: "Burniță puternică",
  56: "Burniță înghețată",
  57: "Burniță înghețată puternică",
  61: "Ploaie slabă",
  63: "Ploaie",
  65: "Ploaie puternică",
  66: "Ploaie înghețată",
  67: "Ploaie înghețată puternică",
  71: "Ninsoare slabă",
  73: "Ninsoare",
  75: "Ninsoare puternică",
  77: "Granule de zăpadă",
  80: "Averse slabe",
  81: "Averse",
  82: "Averse puternice",
  85: "Averse de zăpadă",
  86: "Averse de zăpadă puternice",
  95: "Furtună",
  96: "Furtună cu grindină",
  99: "Furtună cu grindină puternică",
};

const ZILE_SAPTAMANA = [
  "duminică",
  "luni",
  "marți",
  "miercuri",
  "joi",
  "vineri",
  "sâmbătă",
];

const selectorJudet = document.getElementById("judet");
const selectorLocalitate = document.getElementById("localitate");
const campFiltru = document.getElementById("filtru-localitate");

let dateLocatii = { judete: [], localitati: {} };

function normalizeaza(text) {
  return text
    .toLocaleLowerCase("ro-RO")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function escapeazaHtml(text) {
  return text.replace(/[&<>"']/g, (caracter) => {
    const harta = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return harta[caracter];
  });
}

function citesteLocatieSalvata() {
  try {
    const brut = localStorage.getItem(CHEIE_LOCATIE);
    if (!brut) {
      return { ...LOCATIE_IMPLICITA };
    }
    const parsed = JSON.parse(brut);
    if (!parsed.judet || !parsed.localitate) {
      return { ...LOCATIE_IMPLICITA };
    }
    return parsed;
  } catch {
    return { ...LOCATIE_IMPLICITA };
  }
}

function salveazaLocatie(judet, localitate) {
  localStorage.setItem(CHEIE_LOCATIE, JSON.stringify({ judet, localitate }));
}

function numeJudet(id) {
  return dateLocatii.judete.find((j) => j.id === id)?.nume ?? id;
}

function localitatiDinJudet(idJudet) {
  return dateLocatii.localitati[idJudet] ?? [];
}

function completeazaJudete(idSelectat) {
  selectorJudet.innerHTML = dateLocatii.judete
    .map(
      (judet) =>
        `<option value="${escapeazaHtml(judet.id)}"${
          judet.id === idSelectat ? " selected" : ""
        }>${escapeazaHtml(judet.nume)}</option>`
    )
    .join("");
}

function completeazaLocalitati(idJudet, numeSelectat, filtru = "") {
  const cautare = normalizeaza(filtru.trim());
  const lista = localitatiDinJudet(idJudet).filter((loc) =>
    cautare ? normalizeaza(loc.n).includes(cautare) : true
  );

  const existaSelectia = lista.find(
    (loc) => normalizeaza(loc.n) === normalizeaza(numeSelectat)
  );
  const ales = existaSelectia
    ? existaSelectia.n
    : alegeLocalitateImplicita(idJudet, lista);

  selectorLocalitate.innerHTML = lista
    .map(
      (loc) =>
        `<option value="${escapeazaHtml(loc.n)}"${
          loc.n === ales ? " selected" : ""
        }>${escapeazaHtml(loc.n)}</option>`
    )
    .join("");

  if (!lista.length) {
    selectorLocalitate.innerHTML =
      '<option value="">Nu am găsit localități</option>';
  }
}

function alegeLocalitateImplicita(idJudet, lista) {
  const numeJud = numeJudet(idJudet);
  const dupaNume = lista.find(
    (loc) => normalizeaza(loc.n) === normalizeaza(numeJud)
  );
  return dupaNume?.n ?? lista[0]?.n ?? "";
}

function locatieCurenta() {
  const idJudet = selectorJudet.value;
  const nume = selectorLocalitate.value;
  const gasita = localitatiDinJudet(idJudet).find(
    (loc) => normalizeaza(loc.n) === normalizeaza(nume)
  );
  return {
    judet: idJudet,
    numeJudet: numeJudet(idJudet),
    localitate: nume,
    lat: gasita?.lat,
    lng: gasita?.lng,
  };
}

function formateazaOra(data) {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: FUS,
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function formateazaDataCompleta(data) {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: FUS,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function descriere(cod) {
  return CODURI_VREME[cod] ?? "Vreme variabilă";
}

function esteNoapte(ora) {
  return ora.getHours() < 6 || ora.getHours() >= 20;
}

function actualizeazaTema(cod, data) {
  document.body.classList.toggle("noapte", esteNoapte(data));
  const ploua = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(cod);
  document.body.classList.toggle("ploaie", ploua);
}

function cardDetaliu(eticheta, valoare) {
  return `<article class="card"><small>${eticheta}</small><strong>${valoare}</strong></article>`;
}

async function incarcaVremea(lat, lng) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("timezone", FUS);
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day"
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,weather_code,precipitation_probability"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max"
  );

  const raspuns = await fetch(url);
  if (!raspuns.ok) {
    throw new Error("Nu am putut prelua datele meteo.");
  }
  return raspuns.json();
}

function afiseazaAntet(locatie) {
  const esteCapitala = locatie.judet === "Bucuresti";
  document.getElementById("eticheta").textContent = esteCapitala
    ? "Municipiul București · România"
    : `Județul ${locatie.numeJudet} · România`;
  document.getElementById("titlu-localitate").textContent = locatie.localitate;
  document.title = `Vremea în ${locatie.localitate}`;
}

function afiseaza(date) {
  const acum = date.current;
  const moment = new Date(acum.time);
  actualizeazaTema(acum.weather_code, moment);

  document.getElementById("ora-locala").textContent = formateazaDataCompleta(moment);

  document.getElementById("panou-acum").innerHTML = `
    <p class="temperatura">${Math.round(acum.temperature_2m)}<span>°</span></p>
    <div class="descriere">
      <h2>${descriere(acum.weather_code)}</h2>
      <p>Se simte ca ${Math.round(acum.apparent_temperature)}° · ${
        acum.is_day ? "zi" : "noapte"
      }</p>
    </div>
  `;

  const detalii = document.getElementById("detalii");
  detalii.hidden = false;
  detalii.innerHTML = [
    cardDetaliu("Umiditate", `${acum.relative_humidity_2m}%`),
    cardDetaliu("Vânt", `${Math.round(acum.wind_speed_10m)} km/h`),
    cardDetaliu("Presiune", `${Math.round(acum.surface_pressure)} hPa`),
    cardDetaliu(
      "Răsărit / apus",
      `${formateazaOra(new Date(date.daily.sunrise[0]))} · ${formateazaOra(
        new Date(date.daily.sunset[0])
      )}`
    ),
  ].join("");

  const acumIndex = date.hourly.time.findIndex((t) => new Date(t) >= moment);
  const start = acumIndex < 0 ? 0 : acumIndex;
  const oreHtml = date.hourly.time.slice(start, start + 12).map((t, i) => {
    const idx = start + i;
    const d = new Date(t);
    return `<article class="ora-card">
      <p class="cand">${i === 0 ? "acum" : formateazaOra(d)}</p>
      <strong class="val">${Math.round(date.hourly.temperature_2m[idx])}°</strong>
      <p class="cand">${date.hourly.precipitation_probability[idx] ?? 0}%</p>
    </article>`;
  });

  document.getElementById("ore").hidden = false;
  document.getElementById("banda-ore").innerHTML = oreHtml.join("");

  const lista = date.daily.time.map((zi, i) => {
    const d = new Date(zi);
    const nume =
      i === 0 ? "astăzi" : i === 1 ? "mâine" : ZILE_SAPTAMANA[d.getDay()];
    return `<li class="zi">
      <span class="nume">${nume}</span>
      <span class="text">${descriere(date.daily.weather_code[i])}</span>
      <span class="temp">${Math.round(date.daily.temperature_2m_min[i])}° / ${Math.round(
        date.daily.temperature_2m_max[i]
      )}°</span>
    </li>`;
  });

  document.getElementById("zile").hidden = false;
  document.getElementById("lista-zile").innerHTML = lista.join("");
}

async function actualizeazaVremea() {
  const locatie = locatieCurenta();
  if (locatie.lat == null || locatie.lng == null) {
    document.getElementById("panou-acum").innerHTML =
      '<p class="eroare">Alege un județ și o localitate.</p>';
    return;
  }

  salveazaLocatie(locatie.judet, locatie.localitate);
  afiseazaAntet(locatie);
  document.getElementById("panou-acum").innerHTML =
    '<p class="stare">Se încarcă vremea…</p>';

  try {
    const date = await incarcaVremea(locatie.lat, locatie.lng);
    afiseaza(date);
  } catch (eroare) {
    document.getElementById("panou-acum").innerHTML =
      `<p class="eroare">${eroare.message} Verifică conexiunea și reîncearcă.</p>`;
  }
}

selectorJudet.addEventListener("change", () => {
  campFiltru.value = "";
  completeazaLocalitati(selectorJudet.value, alegeLocalitateImplicita(selectorJudet.value, localitatiDinJudet(selectorJudet.value)));
  actualizeazaVremea();
});

selectorLocalitate.addEventListener("change", () => {
  actualizeazaVremea();
});

campFiltru.addEventListener("input", () => {
  completeazaLocalitati(
    selectorJudet.value,
    selectorLocalitate.value,
    campFiltru.value
  );
});

campFiltru.addEventListener("keydown", (eveniment) => {
  if (eveniment.key === "Enter") {
    eveniment.preventDefault();
    actualizeazaVremea();
  }
});

document.getElementById("form-locatie").addEventListener("submit", (eveniment) => {
  eveniment.preventDefault();
});

async function porneste() {
  try {
    const raspuns = await fetch("localitati.json");
    if (!raspuns.ok) {
      throw new Error("Nu am putut încărca lista de localități.");
    }
    dateLocatii = await raspuns.json();
  } catch (eroare) {
    document.getElementById("panou-acum").innerHTML =
      `<p class="eroare">${eroare.message}</p>`;
    return;
  }

  const salvata = citesteLocatieSalvata();
  const idJudet = dateLocatii.localitati[salvata.judet]
    ? salvata.judet
    : LOCATIE_IMPLICITA.judet;

  completeazaJudete(idJudet);
  completeazaLocalitati(idJudet, salvata.localitate);
  await actualizeazaVremea();
}

porneste();
