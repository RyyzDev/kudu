FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependensi (hanya dependency production)
RUN npm ci --omit=dev

# Copy seluruh source code
COPY . .

# Expose port aplikasi
EXPOSE 3000

# Jalankan server
CMD ["node", "src/index.js"]
