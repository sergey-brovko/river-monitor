FROM node:18-alpine

WORKDIR /app

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Переменные окружения
ENV REACT_APP_API_URL=http://localhost:8000
ENV NODE_ENV=development

# Открываем порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Запуск в dev режиме (без сборки)
CMD ["npm", "start"]