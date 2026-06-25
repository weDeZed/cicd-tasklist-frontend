# Étape 1 : Construction (Builder)
FROM node:20-alpine AS builder
WORKDIR /app

# On copie d'abord les fichiers de dépendances pour optimiser le cache Docker
COPY package*.json ./
RUN npm install

# On copie le reste du code source
COPY . .

# On compile l'application (le dossier de sortie sera généralement "dist" ou "build")
RUN npm run build

# Étape 2 : Serveur Nginx (Production)
FROM nginx:alpine

# On supprime la page par défaut de Nginx
RUN rm -rf /usr/share/nginx/html/*

# On copie les fichiers compilés depuis l'étape 1 vers le dossier que Nginx expose
# Note : remplace "dist" par "build" si tu utilises Create React App au lieu de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Si tu as une configuration Nginx personnalisée, décommente la ligne ci-dessous
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# On expose le port 80
EXPOSE 80

# On lance Nginx
CMD ["nginx", "-g", "daemon off;"]