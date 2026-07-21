const $ = (selector) => document.querySelector(selector);
const photos = [];
let objectModel;
let ocrWorker;

const COLOR_WORDS = {
  kirmizi: "red", bordo: "red", mavi: "blue", lacivert: "blue",
  yesil: "green", sari: "yellow", turuncu: "orange", mor: "purple",
  pembe: "pink", siyah: "black", beyaz: "white", gri: "gray",
  kahverengi: "brown"
};

const CONCEPTS = [
  {
    tag: "ruhsat",
    aliases: ["ruhsat", "arac ruhsati", "araba ruhsati", "tescil belgesi", "trafik belgesi"],
    strong: ["arac tescil", "motorlu arac trafik belgesi", "tescil belgesi", "vehicle registration"],
    clues: ["plaka", "sasi", "motor no", "tescil tarihi", "markasi", "model yili", "arac sinifi"],
    minClues: 2
  },
  {
    tag: "kartvizit",
    aliases: ["kartvizit", "is karti", "business card", "iletisim karti"],
    strong: ["business card"],
    clues: ["telefon", "phone", "mobile", "email", "e posta", "www", "com", "adres"],
    minClues: 3
  },
  {
    tag: "kimlik",
    aliases: ["kimlik", "kimlik karti", "nufus cuzdan", "tc kimlik"],
    strong: ["turkiye cumhuriyeti kimlik karti", "identity card", "tc kimlik no"],
    clues: ["kimlik no", "soyadi", "dogum tarihi", "nationality", "seri no"],
    minClues: 2
  },
  {
    tag: "ehliyet",
    aliases: ["ehliyet", "surucu belgesi", "driver license"],
    strong: ["surucu belgesi", "driving licence", "driver license"],
    clues: ["surucu", "sinifi", "verilis tarihi", "gecerlilik tarihi"],
    minClues: 2
  },
  {
    tag: "pasaport",
    aliases: ["pasaport", "passport"],
    strong: ["passport", "pasaport", "p tur"],
    clues: ["nationality", "date of birth", "date of expiry", "surname"],
    minClues: 2
  },
  {
    tag: "fatura",
    aliases: ["fatura", "e fatura", "invoice", "elektrik faturasi", "su faturasi", "dogalgaz faturasi"],
    strong: ["e fatura", "e arsiv fatura", "invoice", "fatura no"],
    clues: ["kdv", "vergi", "toplam", "tutar", "odenek", "son odeme", "fatura tarihi"],
    minClues: 2
  },
  {
    tag: "fis",
    aliases: ["fis", "market fisi", "alisveris fisi", "receipt", "makbuz"],
    strong: ["mali degeri yoktur", "bilgi fisi", "receipt", "makbuz"],
    clues: ["kdv", "toplam", "nakit", "para ustu", "pos", "islem no"],
    minClues: 2
  },
  {
    tag: "kart",
    aliases: ["banka karti", "kredi karti", "kart"],
    strong: ["credit card", "debit card"],
    clues: ["valid thru", "gecerlilik", "visa", "mastercard", "kart no"],
    minClues: 2
  },
  {
    tag: "recete",
    aliases: ["recete", "ilac recetesi", "prescription"],
    strong: ["recete", "prescription"],
    clues: ["hasta", "doktor", "ilac", "doz", "saglik"],
    minClues: 2
  },
  {
    tag: "diploma",
    aliases: ["diploma", "mezuniyet belgesi", "sertifika", "certificate"],
    strong: ["diploma", "mezuniyet belgesi", "certificate of"],
    clues: ["universitesi", "fakultesi", "mezun", "basariyla"],
    minClues: 2
  },
  {
    tag: "sozlesme",
    aliases: ["sozlesme", "kontrat", "agreement", "contract"],
    strong: ["sozlesme", "contract", "agreement"],
    clues: ["taraflar", "madde", "imza", "yururluk"],
    minClues: 2
  },
  {
    tag: "kartvizit",
    aliases: [],
    strong: [],
    clues: [],
    minClues: 99,
    detector: "contact"
  },
  {
    tag: "plaka",
    aliases: ["plaka", "arac plakasi", "license plate"],
    strong: [],
    clues: [],
    minClues: 99,
    detector: "plate"
  }
];

const OBJECT_RULES = {
  araba: ["car", "sports car", "racer", "minivan", "jeep", "cab", "vehicle", "car wheel", "convertible"],
  motosiklet: ["motor scooter", "moped", "motorcycle"],
  bisiklet: ["bicycle", "mountain bike"],
  kedi: ["cat", "tabby", "kitten", "tiger cat", "persian cat", "siamese cat"],
  kopek: ["dog", "puppy", "retriever", "terrier", "shepherd", "poodle", "spaniel"],
  kus: ["bird", "parrot", "eagle", "owl", "hen", "cock"],
  cicek: ["flower", "daisy", "rose", "sunflower"],
  yemek: ["plate", "pizza", "burger", "food", "dish", "restaurant"],
  insan: ["person", "groom", "bride", "suit", "jersey"],
  deniz: ["sea", "ocean", "seashore", "beach", "lakeside"],
  dag: ["mountain", "valley", "cliff", "volcano"],
  bina: ["building", "palace", "church", "mosque", "house"],
  bilgisayar: ["laptop", "computer", "desktop computer", "monitor", "notebook"],
  telefon: ["cellular telephone", "mobile phone", "smartphone"],
  kitap: ["book", "notebook", "comic book"],
  belge: ["document", "envelope", "menu", "web site"]
};

const OBJECT_ALIASES = {
  araba: ["araba", "otomobil", "arac", "car"],
  motosiklet: ["motosiklet", "motor"],
  bisiklet: ["bisiklet"],
  kedi: ["kedi"],
  kopek: ["kopek"],
  kus: ["kus"],
  cicek: ["cicek"],
  yemek: ["yemek", "tabak", "restoran"],
  insan: ["insan", "kisi", "adam", "kadin", "cocuk"],
  deniz: ["deniz", "sahil", "plaj", "gol"],
  dag: ["dag", "manzara"],
  bina: ["bina", "ev", "yapi"],
  bilgisayar: ["bilgisayar", "laptop", "ekran"],
  telefon: ["telefon", "cep telefonu"],
  kitap: ["kitap", "defter"],
  belge: ["belge", "dokuman", "evrak", "kagit"]
};

const STOP_WORDS = new Set([
  "bir", "bu", "su", "ile", "olan", "icinde", "fotograf", "fotografi",
  "fotograflar", "resim", "resmi", "cekilen", "cektigim", "bul", "getir",
  "goster", "ara", "once", "onceki", "gecen", "yil", "yili", "ay", "gun",
  "tarihli", "renkli", "ait"
]);

function norm(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9@.+]+/g, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const needle = norm(phrase);
  return needle && (" " + text + " ").includes(" " + needle + " ");
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function resizedCanvas(image, maxSize) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function pixelColor(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  const value = max / 255;
  const saturation = max === 0 ? 0 : delta / max;
  if (value < 0.2) return "black";
  if (saturation < 0.12 && value > 0.82) return "white";
  if (saturation < 0.18) return "gray";
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  if (hue < 0) hue += 360;
  if (hue < 15 || hue >= 345) return value < 0.45 ? "brown" : "red";
  if (hue < 45) return value < 0.5 ? "brown" : "orange";
  if (hue < 70) return "yellow";
  if (hue < 170) return "green";
  if (hue < 260) return "blue";
  if (hue < 315) return "purple";
  return "pink";
}

function colorProfile(image) {
  const canvas = resizedCanvas(image, 72);
  const data = canvas.getContext("2d", { willReadFrequently: true })
    .getImageData(0, 0, canvas.width, canvas.height).data;
  const counts = {};
  let total = 0, vivid = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 100) continue;
    const color = pixelColor(data[i], data[i + 1], data[i + 2]);
    counts[color] = (counts[color] || 0) + 1;
    total++;
    if (!["white", "gray", "black"].includes(color)) vivid++;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const colors = ranked
    .filter(([color, count]) => count / total >= 0.07 || (!["white", "gray", "black"].includes(color) && count / Math.max(1, vivid) >= 0.16))
    .map(([color]) => color);
  return { primary: ranked[0]?.[0] || "gray", colors };
}

function inferTags(ocrText, labels, fileName) {
  const text = norm(fileName + " " + ocrText + " " + labels.join(" "));
  const tags = new Set();
  if (norm(ocrText).length > 25) tags.add("belge");

  for (const rule of CONCEPTS) {
    const strongHit = rule.strong.some(value => text.includes(norm(value)));
    const clueCount = rule.clues.filter(value => text.includes(norm(value))).length;
    if (strongHit || clueCount >= rule.minClues) tags.add(rule.tag);
  }

  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(ocrText);
  const hasPhone = /(?:\+?90|0)?\s*5\d{2}(?:[\s.-]*\d{3}){2}/.test(ocrText);
  const hasWeb = /\b(?:www\.|https?:|[\w-]+\.(?:com|net|org|com\.tr))\b/i.test(ocrText);
  if ((hasEmail && hasPhone) || (hasPhone && hasWeb) || (hasEmail && hasWeb)) tags.add("kartvizit");

  const plateText = norm(ocrText).replace(/\s+/g, " ").toUpperCase();
  if (/\b\d{2}\s?[A-Z]{1,3}\s?\d{2,4}\b/.test(plateText)) tags.add("plaka");

  for (const [tag, needles] of Object.entries(OBJECT_RULES)) {
    if (needles.some(needle => text.includes(norm(needle)))) tags.add(tag);
  }

  if (text.includes("screenshot") || text.includes("ekran goruntusu") || text.includes("img_")) {
    tags.add("ekran");
  }
  return [...tags];
}

function parseQuery(raw) {
  let text = norm(raw)
    .replace(/\bbir\b/g, "1")
    .replace(/\biki\b/g, "2")
    .replace(/\buc\b/g, "3")
    .replace(/\bdort\b/g, "4")
    .replace(/\bbes\b/g, "5");

  const tokens = text.split(" ").filter(Boolean);
  const colorWord = Object.keys(COLOR_WORDS).find(word => tokens.includes(word));
  const tags = new Set();
  const consumed = new Set();

  for (const concept of CONCEPTS) {
    for (const alias of concept.aliases) {
      if (containsPhrase(text, alias)) {
        tags.add(concept.tag);
        norm(alias).split(" ").forEach(word => consumed.add(word));
      }
    }
  }
  for (const [tag, aliases] of Object.entries(OBJECT_ALIASES)) {
    for (const alias of aliases) {
      if (containsPhrase(text, alias)) {
        tags.add(tag);
        norm(alias).split(" ").forEach(word => consumed.add(word));
      }
    }
  }

  let year = null;
  const yearsAgo = text.match(/(\d+)\s*yil\s*once/);
  const explicitYear = text.match(/\b(20\d{2})\b/);
  if (yearsAgo) year = new Date().getFullYear() - Number(yearsAgo[1]);
  else if (text.includes("gecen yil")) year = new Date().getFullYear() - 1;
  else if (text.includes("bu yil")) year = new Date().getFullYear();
  else if (explicitYear) year = Number(explicitYear[1]);

  const terms = tokens.filter(token =>
    !STOP_WORDS.has(token) &&
    !consumed.has(token) &&
    token !== colorWord &&
    !/^\d+$/.test(token)
  );

  return {
    raw: text,
    color: colorWord ? COLOR_WORDS[colorWord] : null,
    year,
    tags: [...tags],
    terms
  };
}

function rankPhoto(photo, query) {
  const searchable = norm(photo.fileName + " " + photo.ocrText + " " + photo.labels.join(" "));
  const reasons = [];
  let score = 0;

  const tagHits = query.tags.filter(tag => photo.tags.includes(tag));
  if (query.tags.length) {
    if (!tagHits.length) return null;
    score += 50 * tagHits.length / query.tags.length;
    reasons.push(tagHits.join(", "));
  }

  if (query.color) {
    if (!photo.colors.includes(query.color)) return null;
    score += 25;
    reasons.push("renk");
  }

  if (query.year) {
    if (photo.taken.getFullYear() !== query.year) return null;
    score += 25;
    reasons.push("tarih");
  }

  const termHits = query.terms.filter(term => searchable.includes(norm(term)));
  if (query.terms.length) {
    if (termHits.length < query.terms.length) return null;
    score += 35 * termHits.length / query.terms.length;
    if (termHits.length) reasons.push("yazı");
  }

  if (!query.tags.length && !query.color && !query.year && !query.terms.length) score = 1;
  return { photo, score: Math.min(100, Math.round(score)), reasons };
}

function render() {
  const query = parseQuery($("#query").value);
  let results = photos
    .map(photo => rankPhoto(photo, query))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.photo.taken - a.photo.taken);

  const target = $("#results");
  if (!results.length) {
    target.innerHTML = '<div class="empty">' +
      (photos.length ? "Eşleşen fotoğraf bulunamadı." : "Henüz analiz edilmiş fotoğraf yok.") +
      "</div>";
    return;
  }

  target.innerHTML = results.map(result => {
    const photo = result.photo;
    const detail = result.score > 1
      ? result.score + "% · " + result.reasons.join(" · ")
      : (photo.tags.slice(0, 3).join(" · ") || photo.labels[0] || photo.primaryColor);
    return '<article class="photo"><img src="' + photo.url + '" alt="">' +
      '<div class="meta"><b>' + photo.taken.toLocaleDateString("tr-TR") +
      "</b><small>" + detail + "</small></div></article>";
  }).join("");
}

async function prepareModels() {
  $("#status").textContent = "Nesne modeli hazırlanıyor…";
  try {
    objectModel = objectModel || await mobilenet.load();
  } catch (error) {
    objectModel = null;
  }

  $("#status").textContent = "Türkçe belge okuma modeli hazırlanıyor…";
  try {
    ocrWorker = ocrWorker || await Tesseract.createWorker("tur+eng");
  } catch (error) {
    try {
      ocrWorker = ocrWorker || await Tesseract.createWorker("eng");
    } catch (_) {
      ocrWorker = null;
    }
  }
}

async function analyzeFile(file, index, total) {
  const url = URL.createObjectURL(file);
  const image = await loadImage(url);
  const profile = colorProfile(image);
  let labels = [];
  let ocrText = "";

  $("#status").textContent = (index + 1) + "/" + total + " · nesneler inceleniyor…";
  try {
    if (objectModel) labels = (await objectModel.classify(image, 5)).map(item => item.className);
  } catch (_) {}

  $("#status").textContent = (index + 1) + "/" + total + " · yazılar okunuyor…";
  try {
    if (ocrWorker) {
      const output = await ocrWorker.recognize(resizedCanvas(image, 1800));
      ocrText = output.data.text || "";
    }
  } catch (_) {}

  let taken = new Date(file.lastModified);
  try {
    const exif = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    if (exif?.DateTimeOriginal) taken = new Date(exif.DateTimeOriginal);
    else if (exif?.CreateDate) taken = new Date(exif.CreateDate);
  } catch (_) {}

  photos.push({
    url,
    fileName: file.name,
    labels,
    ocrText,
    taken,
    primaryColor: profile.primary,
    colors: profile.colors,
    tags: inferTags(ocrText, labels, file.name)
  });

  $("#status").textContent = (index + 1) + "/" + total + " fotoğraf analiz edildi";
  $("#bar").style.width = ((index + 1) / total * 100) + "%";
}

$("#photos").addEventListener("change", async event => {
  const files = [...event.target.files].slice(0, 30);
  if (!files.length) return;

  photos.forEach(photo => URL.revokeObjectURL(photo.url));
  photos.length = 0;
  $("#bar").style.width = "2%";

  await prepareModels();
  for (let index = 0; index < files.length; index++) {
    try {
      await analyzeFile(files[index], index, files.length);
    } catch (_) {
      $("#status").textContent = (index + 1) + ". fotoğraf analiz edilemedi; devam ediliyor…";
    }
  }
  $("#status").textContent = photos.length + " fotoğraf hazır";
  render();
});

$("#query").addEventListener("input", render);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
