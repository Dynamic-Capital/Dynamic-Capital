# Nginx and Let's Encrypt for DuckDNS

These steps install Nginx, enable HTTPS with Certbot, and force all traffic to your DuckDNS domain `dynamiccapital.duckdns.org`.

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
   sudo mkdir -p /var/www/dynamiccapital
   sudo chown -R $USER:$USER /var/www/dynamiccapital
   ```

4. **Configure Nginx**
   Create `/etc/nginx/sites-available/dynamiccapital`:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name dynamiccapital.duckdns.org;
       root /var/www/dynamiccapital;

       location / {
           proxy_pass http://127.0.0.1:3000;  # adjust to your backend
       }
   }

   server {
       listen 80 default_server;
       listen [::]:80 default_server;
       return 301 https://dynamiccapital.duckdns.org$request_uri;
   }
   ```
   Then enable the site and reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dynamiccapital /etc/nginx/sites-enabled/
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
   sudo certbot --nginx -d dynamiccapital.duckdns.org
   ```
   Certbot updates Nginx with an HTTPS server block.

7. **Force HTTP to HTTPS**
   Ensure the port-80 block contains:
   ```nginx
   return 301 https://dynamiccapital.duckdns.org$request_uri;
   ```
   Reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **Verify and renew**
   - Visit `http://dynamiccapital.duckdns.org`; it should redirect to `https://dynamiccapital.duckdns.org`.
   - Confirm certificate renewal is scheduled:
     ```bash
     systemctl list-timers | grep certbot
     sudo certbot renew --dry-run
     ```

These steps secure the DuckDNS domain with automatic HTTPS certificates.
