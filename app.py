from flask import Flask, send_from_directory, request, jsonify, send_file
from flask_cors import CORS
import os
import random
import re
import io
import zipfile
import time

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

ASSET_ROOT = os.path.join('public', 'assets')
CATEGORIES = {
    'logo': 'logo',
    'logoHorizontal': 'logo-horizontal',
    'gridBg': 'grid-bg',
    'touchBg': 'touch-bg'
}

ALLOWED_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}

PALETTE = [
    '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
    '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
    '#7CB342', '#C0CA33', '#FDD835', '#FB8C00', '#F4511E',
    '#546E7A', '#B71C1C', '#C62828', '#AD1457', '#6A1B9A'
]


def ensure_dirs():
    os.makedirs(ASSET_ROOT, exist_ok=True)
    for folder in CATEGORIES.values():
        os.makedirs(os.path.join(ASSET_ROOT, folder), exist_ok=True)


def read_asset_pool():
    pool = {}
    for key, folder in CATEGORIES.items():
        dir_path = os.path.join(ASSET_ROOT, folder)
        files = []
        if os.path.exists(dir_path):
            for f in os.listdir(dir_path):
                ext = os.path.splitext(f)[1].lower()
                if ext in ALLOWED_EXT:
                    files.append(f"/assets/{folder}/{f}")
        pool[key] = files
    return pool


def sample_many(arr, n):
    arr = list(arr)
    random.shuffle(arr)
    return arr[:n]


def sample_one(arr, exclude=None):
    exclude = set(exclude or [])
    cand = [x for x in arr if x not in exclude]
    return random.choice(cand) if cand else None


@app.route('/')
def index():
    return send_from_directory('public', 'index.html')


@app.post('/api/generate')
def api_generate():
    _ = request.get_json(silent=True) or {}
    pool = read_asset_pool()
    images = {key: sample_many(pool[key], 2) for key in CATEGORIES.keys()}
    colors = sample_many(PALETTE, 2)
    time.sleep(0.6)
    return jsonify({'images': images, 'colors': colors})


@app.post('/api/regenerate')
def api_regenerate():
    data = request.get_json(silent=True) or {}
    category = data.get('category')
    exclude = data.get('exclude', [])

    if category not in CATEGORIES:
        return jsonify({'error': 'Categoria non valida'}), 400

    pool = read_asset_pool()
    next_img = sample_one(pool.get(category, []), exclude=exclude)
    time.sleep(0.4)
    return jsonify({'image': next_img})


@app.post('/api/zip')
def api_zip():
    data = request.get_json(silent=True) or {}

    selections = data.get('selections', {})
    color = data.get('color', '#FF0000')
    festa_name = data.get('festaName', '')
    description = data.get('description', '')
    style = data.get('style', '')
    variant = data.get('variant', '')

    mem = io.BytesIO()
    with zipfile.ZipFile(mem, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for key, public_path in selections.items():
            if not public_path:
                continue
            disk_path = os.path.join('public', public_path.lstrip('/'))
            if os.path.exists(disk_path):
                _, ext = os.path.splitext(disk_path)
                zf.write(disk_path, arcname=f"{key}{ext}")
        meta = (
            f"Festa: {festa_name or '-'}\n"
            f"Descrizione: {description or '-'}\n"
            f"Stile: {style or '-'}\n"
            f"Variante: {variant or '-'}\n"
            f"Colore scelto: {color}\n"
        )
        zf.writestr('scelte.txt', meta)

    mem.seek(0)
    safe_name = re.sub(r'[^\w\-]+', '_', festa_name or 'pack')
    return send_file(mem, mimetype='application/zip', as_attachment=True, download_name=f"{safe_name}.zip")


if __name__ == '__main__':
    ensure_dirs()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
