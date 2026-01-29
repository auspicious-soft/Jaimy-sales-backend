##############################################################################
# Backend Dockerfile (Canvas-safe)
##############################################################################

FROM node:18-bullseye

WORKDIR /app

# Install native dependencies required by canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package*.json ./

# Install node dependencies
RUN npm install

# Install ts-node & typescript globally
RUN npm install -g ts-node typescript

# Copy application source
COPY . .

EXPOSE 8000

CMD ["npm", "start"]
