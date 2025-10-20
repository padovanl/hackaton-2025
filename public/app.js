const $ = sel => document.querySelector(sel);

const rowsContainer = $('#rows');
const resultsSection = $('#results');
const generateBtn = $('#generateBtn');
const downloadBtn = $('#downloadBtn');

const festaNameInput = $('#festaName');
const descriptionInput = $('#description');
const styleSelect = $('#style');

let selected = { logo: null, logoHorizontal: null, gridBg: null, touchBg: null };
let available = { logo: [], logoHorizontal: [], gridBg: [], touchBg: [] };
let colors = [];
let selectedColor = null;

const CATS = [
  { key:'logo', label:'Logo' },
  { key:'logoHorizontal', label:'Logo Orizzontale' },
  { key:'gridBg', label:'Background Griglie' },
  { key:'touchBg', label:'Background Touch' }
];

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
function openLightbox(src){
  lightboxImg.src = src;
  lightbox.classList.remove('hidden');
}
function closeLightbox(){
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
}
lightbox?.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeLightbox(); });

function bindUploadPreview(inputId, previewId){
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if(!f){ preview.innerHTML = ''; return; }
    const url = URL.createObjectURL(f);
    preview.innerHTML = `<img src="${url}" alt="preview" />`;
  });
}
bindUploadPreview('logoUpload','logoPreview');
bindUploadPreview('logoHUpload','logoHPreview');

function radioValue(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function buildRow(categoryKey, label, images){
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.category = categoryKey;

  const title = document.createElement('div');
  title.className = 'row-title';
  title.textContent = label;
  row.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'grid';
  row.appendChild(grid);

  // Aggiungi le immagini con effetto progressivo
  images.forEach(async (src, idx) => {
    const card = document.createElement('div');
    card.className = 'card-img loading';
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `#${idx+1}`;
    grid.appendChild(card);

    // Aspetta 5 secondi prima di mostrare
    await wait(5000);

    const img = document.createElement('img');
    img.src = src;
    img.alt = `${label} ${idx+1}`;
    img.addEventListener('click', () => openLightbox(img.src));

    const x = document.createElement('div');
    x.className = 'btn-x';
    x.textContent = '❌';
    x.title = 'Rigenera questa immagine';

    const selector = document.createElement('label');
    selector.className = 'selector';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `pick-${categoryKey}`;
    radio.value = src;
    radio.addEventListener('change', () => {
      selected[categoryKey] = radio.value;
      refreshDownloadButton();
    });
    const sTxt = document.createElement('span');
    sTxt.textContent = 'Scegli';
    selector.appendChild(radio);
    selector.appendChild(sTxt);

    x.addEventListener('click', async () => {
      await regenerateImage(card, categoryKey);
      const currentSelected = selected[categoryKey];
      const newSrc = card.querySelector('img').src.replace(location.origin, '');
      if (currentSelected === src) {
        selected[categoryKey] = newSrc;
      }
      radio.value = newSrc;
    });

    card.classList.remove('loading');
    card.appendChild(img);
    card.appendChild(badge);
    card.appendChild(x);
    card.appendChild(selector);
  });

  return row;
}

async function regenerateImage(cardEl, categoryKey){
  cardEl.classList.add('loading');
  const img = cardEl.querySelector('img');
  const currentSrc = img.getAttribute('src').replace(location.origin, '');

  try {
    const exclude = [currentSrc];
    const res = await fetch('/api/regenerate', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ category: categoryKey, exclude })
    });
    const data = await res.json();

    await wait(5000); // 5 secondi di simulazione

    if (!data?.image) {
      alert('Non ci sono altre immagini disponibili in questa cartella.');
      return;
    }
    img.src = data.image;
    const i = available[categoryKey].indexOf(currentSrc);
    if (i >= 0) available[categoryKey][i] = data.image;
  } catch (e) {
    console.error(e); alert('Errore durante la rigenerazione');
  } finally {
    cardEl.classList.remove('loading');
  }
}

function renderColors(colorsArr){
  const wrap = $('#colorSwatches');
  wrap.innerHTML = '';
  colorsArr.forEach(hex => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = hex;
    sw.title = hex;
    const cap = document.createElement('div');
    cap.className = 'hex';
    cap.textContent = hex.toUpperCase();
    sw.appendChild(cap);
    sw.addEventListener('click', () => {
      selectedColor = hex;
      [...wrap.children].forEach(c => c.classList.remove('selected'));
      sw.classList.add('selected');
      refreshDownloadButton();
    });
    wrap.appendChild(sw);
  });
}

function refreshDownloadButton(){
  const allPicked = Object.values(selected).every(Boolean);
  downloadBtn.disabled = !(allPicked && selectedColor);
}

async function generate(){
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generazione in corso...';
  generateBtn.classList.add('is-loading');
  rowsContainer.innerHTML = '';
  resultsSection.classList.remove('hidden');

  const payload = {
    festaName: festaNameInput.value.trim(),
    description: descriptionInput.value.trim(),
    style: styleSelect.value,
    variant: (document.querySelector('input[name="variant"]:checked')||{}).value
  };

  try{
    const res = await fetch('/api/generate', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    available = {
      logo: data.images.logo || [],
      logoHorizontal: data.images.logoHorizontal || [],
      gridBg: data.images.gridBg || [],
      touchBg: data.images.touchBg || []
    };

    selected = { logo:null, logoHorizontal:null, gridBg:null, touchBg:null };
    selectedColor = null;
    colors = data.colors || [];

    // Popola progressivamente le righe
    for (const cat of CATS){
      const row = buildRow(cat.key, cat.label, available[cat.key]);
      rowsContainer.appendChild(row);
      await wait(5000 * (available[cat.key]?.length || 1)); // ogni immagine 5s
    }

    renderColors(colors);
    refreshDownloadButton();

  } catch(e){
    console.error(e); alert('Errore durante la generazione');
  } finally {
    generateBtn.disabled = false;
    generateBtn.classList.remove('is-loading');
    generateBtn.textContent = 'OK, genera (simulato)';
  }
}

async function downloadZip(){
  const payload = {
    selections: { ...selected },
    color: selectedColor,
    festaName: festaNameInput.value.trim(),
    description: descriptionInput.value.trim(),
    style: styleSelect.value,
    variant: (document.querySelector('input[name="variant"]:checked')||{}).value
  };

  try{
    const res = await fetch('/api/zip', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('ZIP failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (payload.festaName || 'pack').replace(/[^\w\-]+/g, '_');
    a.href = url; a.download = `${name}.zip`;
    document.body.appendChild(a);
    a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch(e){
    console.error(e); alert('Errore durante lo scaricamento ZIP');
  }
}

generateBtn.addEventListener('click', generate);
downloadBtn.addEventListener('click', downloadZip);
