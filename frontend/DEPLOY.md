# Deployment and Custom Domain Setup

This guide explains how to attach a custom domain to your deployment host.

## 1. Environment Variables

Before building for production, set the following environment variable on your hosting provider:

```bash
VITE_SITE_URL=https://your-custom-domain.com
VITE_API_BASE_URL=https://api.your-custom-domain.com/v1
VITE_USE_MOCK=false
```

`VITE_SITE_URL` ensures all canonical meta tags, OpenGraph URLs, and absolute links resolve to your custom domain without hardcoding any host in source code.

## 2. Platform Specific Instructions

### Cloudflare Pages
1. Go to Pages and select your project.
2. Navigate to **Custom domains** and click **Set up a custom domain**.
3. Enter your domain (for example: `tickets.example.com`).
4. If your DNS is managed on Cloudflare, DNS records are added automatically.
5. If using an external registrar, create a CNAME record pointing to `<project>.pages.dev`.
6. SSL certificates are provisioned automatically.

### Vercel
1. Go to your Project Settings and select **Domains**.
2. Enter your custom domain name.
3. Follow the DNS prompt:
   - For an apex domain (e.g., `example.com`), add an `A` record pointing to `76.76.21.21`.
   - For a subdomain (e.g., `tickets.example.com`), add a `CNAME` record pointing to `cname.vercel-dns.com`.
4. Vercel automatically issues an SSL certificate once DNS propagates.

### Netlify
1. Go to **Site configuration** > **Domain management**.
2. Click **Add a domain** and enter your domain name.
3. Configure your DNS provider:
   - Add a CNAME record pointing to your Netlify site subdomain (`<site-name>.netlify.app`).
4. Netlify provisions Let's Encrypt SSL certificates automatically.

### AWS CloudFront + S3
1. Request a public certificate in AWS Certificate Manager (ACM) in region `us-east-1`.
2. Edit your CloudFront distribution settings:
   - Add your domain to **Alternate domain names (CNAMEs)**.
   - Attach the ACM certificate.
3. In Route 53 or your DNS registrar, create an `A` (Alias) or `CNAME` record pointing to your CloudFront distribution URL.

### Self-Hosted Nginx / VPS
1. Build the production assets:
   ```bash
   npm run build
   ```
2. Copy the `dist` folder to your web root (for example: `/var/www/tickets`).
3. Add a server block in `/etc/nginx/sites-available/tickets`:
   ```nginx
   server {
       server_name tickets.example.com;
       root /var/www/tickets;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
4. Obtain an SSL certificate using Certbot:
   ```bash
   sudo certbot --nginx -d tickets.example.com
   ```

## 3. Single Page Application Routing Note

When deploying, ensure your host redirects all 404 or unknown requests to `/index.html` so client-side React Router functions correctly.
