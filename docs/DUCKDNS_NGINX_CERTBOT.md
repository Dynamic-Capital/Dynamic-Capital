# Nginx and Let's Encrypt for DuckDNS

These steps install Nginx, enable HTTPS with Certbot, and force all traffic to
your DuckDNS domain (replace `example.duckdns.org` with your own).

1. **Install Nginx**
   ```bash
   sudo apt update
   sudo apt install nginx
   sudo systemctl enable --now nginx
   ```

2. **Allow HTTP/HTTPS through UFW**
   ```bash
   sudo ufw allow 'Nginx Full'
   ```

3. **Create a web root**
   ```bash
   sudo mkdir -p /var/www/example
   sudo chown -R $USER:$USER /var/www/example
   ```

4. **Configure Nginx** Create `/etc/nginx/sites-available/example`:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name example.duckdns.org;
       root /var/www/example;

       location / {
           proxy_pass http://127.0.0.1:3000;  # adjust to your backend
       }
   }

   server {
       listen 80 default_server;
       listen [::]:80 default_server;
       return 301 https://example.duckdns.org$request_uri;
   }
   ```
   Then enable the site and reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/example /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Install Certbot**
   ```bash
   sudo snap install core
   sudo snap refresh core
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

6. **Request a certificate and enable HTTPS**
   ```bash
   sudo certbot --nginx -d example.duckdns.org
   ```
   Certbot updates Nginx with an HTTPS server block.

7. **Force HTTP to HTTPS** Ensure the port-80 block contains:
   ```nginx
   return 301 https://example.duckdns.org$request_uri;
   ```
   Reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **Verify redirect and HTTPS**
   - Visit `http://example.duckdns.org`; it should redirect to
     `https://example.duckdns.org`.
   - Check in your browser that the certificate is valid.

9. **Confirm automatic certificate renewal**
   ```bash
   systemctl list-timers | grep certbot
   sudo certbot renew --dry-run
   ```

These steps secure the DuckDNS domain with automatic HTTPS certificates.

## Docker-based setup

This project also ships with a containerized Nginx and Certbot configuration.
From the repository root, obtain the initial certificate (covering the root,
`www`, and `api` subdomains) and start the services:

```bash
DOMAIN=example.duckdns.org EMAIL=you@example.com scripts/init-letsencrypt.sh
docker compose up -d nginx certbot
```

The `certbot` service renews certificates automatically and Nginx forces all
traffic to `https://example.duckdns.org`.
