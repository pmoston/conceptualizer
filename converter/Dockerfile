FROM node:22-alpine

RUN apk add --no-cache \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-deu \
    tesseract-ocr-data-eng \
    ttf-dejavu \
    font-liberation \
    font-noto \
    vips

# Use /root so the LibreOffice profile persists in the image layer (not ephemeral /tmp)
ENV HOME=/root

# Pre-initialize the LibreOffice profile during build.
# Without this, the first conversion at runtime triggers first-run setup and exits
# before producing any output.
RUN soffice --headless --norestore --nofirststartwizard --version

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY server.js ./

EXPOSE 3001
CMD ["sh", "-c", "mkdir -p /app/uploads && chmod 777 /app/uploads && node server.js"]
