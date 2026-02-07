# Mora Jai Daily - AWS Deployment Guide

A Wordle-style daily puzzle game. New puzzle every day at midnight UTC!

## Architecture Options

### Option 1: Static Hosting (Recommended - Cheapest)
Since this is a static site with no backend, you can host it for nearly free.

**Best for:** Simple setup, minimal cost ($0-5/month)

### Option 2: EC2 Instance
Full control, can add features later.

**Best for:** If you want to expand with leaderboards, user accounts, etc.

---

## Option 1: AWS S3 + CloudFront (Static Hosting)

### Step 1: Build the App

```bash
# On your local machine
cd mora-jai-daily
npm install
npm run build
```

This creates a `dist/` folder with static files.

### Step 2: Create S3 Bucket

```bash
# Replace with your domain name
BUCKET_NAME="morajai.yourdomain.com"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Set bucket policy for public access
cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json

# Upload files
aws s3 sync dist/ s3://$BUCKET_NAME --delete
```

### Step 3: Set Up CloudFront (CDN + HTTPS)

1. Go to AWS Console → CloudFront → Create Distribution
2. Origin domain: `$BUCKET_NAME.s3-website-us-east-1.amazonaws.com`
3. Origin protocol: HTTP only
4. Viewer protocol policy: Redirect HTTP to HTTPS
5. Alternate domain names (CNAMEs): `morajai.yourdomain.com`
6. SSL Certificate: Request one via ACM (see below)
7. Default root object: `index.html`

### Step 4: Request SSL Certificate

1. Go to AWS Console → Certificate Manager
2. Request a public certificate
3. Domain: `morajai.yourdomain.com`
4. Validation method: DNS
5. Add the CNAME records to your DNS provider
6. Wait for validation (usually 5-30 minutes)

### Step 5: Configure Your Domain

Add these DNS records at your domain registrar:

```
Type: CNAME
Name: morajai
Value: d1234567890.cloudfront.net (your CloudFront domain)
```

### Step 6: Automate Deployments

Create a deploy script:

```bash
#!/bin/bash
# deploy.sh
npm run build
aws s3 sync dist/ s3://morajai.yourdomain.com --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
echo "Deployed!"
```

### Cost Estimate (S3 + CloudFront)
- S3: ~$0.50/month
- CloudFront: Free tier covers 1TB/month
- **Total: ~$1-5/month**

---

## Option 2: EC2 Instance

### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose:
   - **AMI:** Ubuntu 24.04 LTS
   - **Instance type:** t3.micro (free tier eligible) or t3.small
   - **Key pair:** Create or use existing
   - **Security group:** Allow HTTP (80), HTTPS (443), SSH (22)
   - **Storage:** 8GB gp3

### Step 2: Connect and Set Up

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 3: Deploy the App

```bash
# Create app directory
sudo mkdir -p /var/www/morajai
sudo chown ubuntu:ubuntu /var/www/morajai

# Clone/upload your code
cd /var/www/morajai
# Upload your mora-jai-daily folder here

# Install and build
cd mora-jai-daily
npm install
npm run build

# The built files are in dist/
```

### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/morajai
```

Add:

```nginx
server {
    listen 80;
    server_name morajai.yourdomain.com;
    root /var/www/morajai/mora-jai-daily/dist;
    index index.html;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/morajai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Point Your Domain

1. Go to your domain registrar
2. Add an A record:
   ```
   Type: A
   Name: morajai
   Value: YOUR_EC2_PUBLIC_IP
   ```

### Step 6: Set Up SSL (Free with Let's Encrypt)

```bash
# Wait for DNS to propagate (check with: dig morajai.yourdomain.com)
sudo certbot --nginx -d morajai.yourdomain.com

# Auto-renewal is set up automatically
# Test it:
sudo certbot renew --dry-run
```

### Step 7: Set Up Auto-Deploy (Optional)

Create a simple deploy script on the server:

```bash
# /var/www/morajai/deploy.sh
#!/bin/bash
cd /var/www/morajai/mora-jai-daily
git pull  # if using git
npm install
npm run build
echo "Deployed at $(date)"
```

### Cost Estimate (EC2)
- t3.micro: Free tier first year, then ~$8/month
- t3.small: ~$15/month
- EBS storage: ~$1/month
- **Total: $0-20/month**

---

## Option 3: AWS Amplify (Easiest)

### Step 1: Push to GitHub

```bash
cd mora-jai-daily
git init
git add .
git commit -m "Initial commit"
gh repo create mora-jai-daily --public --push
```

### Step 2: Connect Amplify

1. Go to AWS Console → Amplify
2. Click "New app" → "Host web app"
3. Choose GitHub and authorize
4. Select your repository
5. Amplify auto-detects the build settings
6. Click "Save and deploy"

### Step 3: Add Custom Domain

1. In Amplify console → Domain management
2. Add domain → Enter your domain
3. Follow the DNS configuration instructions

### Cost Estimate (Amplify)
- Build minutes: 1000 free/month
- Hosting: 15GB served free/month
- **Total: $0-5/month**

---

## Quick Comparison

| Feature | S3+CloudFront | EC2 | Amplify |
|---------|---------------|-----|---------|
| Cost | $1-5/mo | $0-20/mo | $0-5/mo |
| Setup | Medium | Complex | Easy |
| SSL | Manual | Certbot | Automatic |
| CI/CD | Manual | Manual | Built-in |
| Scaling | Automatic | Manual | Automatic |
| Future expansion | Limited | Unlimited | Limited |

**Recommendation:** 
- For simplicity: **Amplify**
- For lowest cost: **S3 + CloudFront**
- For future features: **EC2**

---

## Local Development

```bash
cd mora-jai-daily
npm install
npm run dev
```

Visit http://localhost:5173

---

## Updating the Puzzle Algorithm

The daily puzzle is generated client-side using a seeded random number generator based on the date. To change difficulty progression, edit `src/puzzle.js`:

```javascript
// In getDailyPuzzle()
if (puzzleNum % 7 === 0) {
  difficulty = 'expert';    // Every Sunday
} else if (puzzleNum % 7 === 6) {
  difficulty = 'hard';      // Every Saturday
} else if (puzzleNum % 3 === 0) {
  difficulty = 'medium';    // Every 3rd day
} else {
  difficulty = 'easy';      // Default
}
```

---

## Troubleshooting

### "Page not found" on refresh
Make sure your server is configured to serve `index.html` for all routes (SPA routing).

### SSL certificate not working
- Check DNS propagation: `dig morajai.yourdomain.com`
- Wait up to 48 hours for DNS changes

### Puzzle not changing at midnight
The puzzle uses UTC time. Make sure your system clock is correct.

### Stats not saving
LocalStorage might be disabled. Check browser settings.
