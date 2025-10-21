# Usa un'immagine Python leggera
FROM python:3.12-slim

# Imposta la directory di lavoro all'interno del container
WORKDIR /app

# Copia tutto (tranne ciò che è escluso in .dockerignore)
COPY . .

# Installa Flask e Flask-CORS
RUN pip install --no-cache-dir flask flask-cors

# Espone la porta dell'app Flask
EXPOSE 5000

# Comando di avvio
CMD ["python", "app.py"]
