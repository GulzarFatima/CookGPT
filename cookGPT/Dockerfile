FROM php:8.2-cli

WORKDIR /var/www/html
COPY . .

EXPOSE 8080

# ✅ Serve from current folder (not just /public)
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]

