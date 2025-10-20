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
  { key:'logoHorizontal', label:'Horizontal logo' },
  { key:'gridBg', label:'Grid background' },
  { key:'touchBg', label:'Touch background' }
];

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

// Scroll to top button logic
const scrollBtn = document.createElement('button');
scrollBtn.className = 'scroll-top hidden';
scrollBtn.setAttribute('aria-label', 'Scroll to top');
scrollBtn.innerHTML = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.7 14.7a1 1 0 0 1 0-1.4l4.6-4.6a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 1 1-1.4 1.4L12 10.41l-3.9 3.9a1 1 0 0 1-1.4 0z"/>
  </svg>
`;
document.body.appendChild(scrollBtn);

scrollBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// mostra/nascondi il pulsante quando si scorre
window.addEventListener('scroll', () => {
  const show = window.scrollY > 200;
  scrollBtn.classList.toggle('hidden', !show);
});

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

const wait = ms => new Promise(r => setTimeout(r, ms));

function scrollToBottom(){
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

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

  // progressive reveal
  images.forEach(async (src, idx) => {
    const card = document.createElement('div');
    card.className = 'card-img loading';
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `#${idx+1}`;
    grid.appendChild(card);

    scrollToBottom();
    await wait(5000); // 5s per image

    const img = document.createElement('img');
    img.src = src;
    img.alt = `${label} ${idx+1}`;
    img.addEventListener('click', () => openLightbox(img.src));

    const x = document.createElement('div');
    x.className = 'btn-x';
    x.textContent = '❌';
    x.title = 'Regenerate this image';

    const selector = document.createElement('label');
    selector.className = 'selector';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `pick-${categoryKey}`;
    radio.value = src;
    radio.addEventListener('change', () => {
      selected[categoryKey] = radio.value;
      // evidenzia la card selezionata
      [...grid.querySelectorAll('.card-img')].forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      refreshDownloadButton();
    });
    const sTxt = document.createElement('span');
    sTxt.textContent = 'Select';
    selector.appendChild(radio);
    selector.appendChild(sTxt);

    x.addEventListener('click', async () => {
      const wasSelected = selected[categoryKey] === radio.value;
      await regenerateImage(card, categoryKey);

      const newSrc = card.querySelector('img').src.replace(location.origin, '');
      radio.value = newSrc;

      // Se l'immagine era selezionata prima della rigenerazione
      if (wasSelected) {
        // rimuovi selezione visiva e logica
        selected[categoryKey] = null;
        card.classList.remove('selected');
        radio.checked = false;
        refreshDownloadButton();
      }
    });

    card.classList.remove('loading');
    card.appendChild(img);
    card.appendChild(badge);
    card.appendChild(x);
    card.appendChild(selector);

    scrollToBottom();
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

    await wait(5000);
    if (!data?.image) {
      alert('No more images available in this folder.');
      return;
    }
    img.src = data.image;
    const i = available[categoryKey].indexOf(currentSrc);
    if (i >= 0) available[categoryKey][i] = data.image;
  } catch (e) {
    console.error(e); alert('Error while regenerating');
  } finally {
    cardEl.classList.remove('loading');
    cardEl.classList.add('regenerated');
    setTimeout(() => cardEl.classList.remove('regenerated'), 1500);
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

  // === Custom color picker ===
  const customWrap = document.createElement('div');
  customWrap.className = 'swatch custom-picker';
  customWrap.title = 'Choose custom color';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#ed1c24'; // default red
  colorInput.className = 'color-input';

  const label = document.createElement('div');
  label.className = 'hex';
  label.textContent = 'Custom';

  colorInput.addEventListener('input', () => {
    selectedColor = colorInput.value;
    [...wrap.children].forEach(c => c.classList.remove('selected'));
    customWrap.classList.add('selected');
    refreshDownloadButton();
  });

  customWrap.appendChild(colorInput);
  customWrap.appendChild(label);
  wrap.appendChild(customWrap);
}

function refreshDownloadButton(){
  const allPicked = Object.values(selected).every(Boolean);
  downloadBtn.disabled = !(allPicked && selectedColor);
}

async function generate(){
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  generateBtn.classList.add('is-loading');

  // reset UI
  rowsContainer.innerHTML = '';
  resultsSection.classList.remove('hidden');

  selected = { logo:null, logoHorizontal:null, gridBg:null, touchBg:null };
  selectedColor = null;

  const colorsSection = $('#colorsSection');
  const colorSwatches = $('#colorSwatches');
  if (colorsSection) colorsSection.classList.add('hidden');
  if (colorSwatches) colorSwatches.innerHTML = '';

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
    colors = data.colors || [];

    for (const cat of CATS){
      const row = buildRow(cat.key, cat.label, available[cat.key]);
      rowsContainer.appendChild(row);
      scrollToBottom();
      await wait(5000 * (available[cat.key]?.length || 1));
    }

    renderColors(colors);
    if (colorsSection) colorsSection.classList.remove('hidden');
    refreshDownloadButton();
  } catch(e){
    console.error(e); alert('Error while generating');
  } finally {
    generateBtn.disabled = false;
    generateBtn.classList.remove('is-loading');
    generateBtn.textContent = 'OK, generate';
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
    console.error(e); alert('Error while downloading ZIP');
  }
}

generateBtn.addEventListener('click', generate);
downloadBtn.addEventListener('click', downloadZip);
