# Zarah's Store — Deployment Guide

This is a fully static multi-vendor marketplace website. Because it does not require a build step, it is extremely easy and free to deploy online.

Here are the three easiest ways to launch the site:

---

## ⚡ Option 1: Netlify (Easiest - 1 Minute)
Netlify allows you to publish the site instantly without typing any commands.

1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Drag and drop the entire `multi_vendor_shop` folder onto the page.
3. Wait 10 seconds. Your site is live with a free custom link!
4. *(Optional)* Go to Site Settings to change the URL or connect a custom domain.

---

## 🚀 Option 2: Vercel CLI (Recommended - 2 Minutes)
Deploy directly from your command line using Vercel.

1. Open PowerShell or Terminal and install the Vercel tool:
   ```bash
   npm install -g vercel
   ```
2. Navigate to your project folder:
   ```bash
   cd multi_vendor_shop
   ```
3. Run the deployment command:
   ```bash
   vercel
   ```
4. Follow the prompts (press Enter to accept the defaults). Your site will deploy, and you'll get a production URL.

---

## 🐙 Option 3: GitHub Pages (Free Hosting with Code Backup)
Host the site directly from a GitHub repository.

1. Create a new repository on [GitHub](https://github.com).
2. Upload the project files to the repository.
3. Go to the repository **Settings** tab.
4. Click **Pages** in the sidebar.
5. Under **Build and deployment**, set the Source to **Deploy from a branch** and select the `main` branch.
6. Click Save. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.
