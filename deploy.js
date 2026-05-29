const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log("🚀 Starting deployment to GitHub Pages...");

try {
    const distPath = path.join(__dirname, 'dist');
    
    if (!fs.existsSync(distPath)) {
        throw new Error("The 'dist' directory does not exist. Run 'npm run predeploy' first.");
    }

    // פתרון הנתיבים ב-HTML
    const htmlPath = path.join(distPath, 'index.html');
    if (fs.existsSync(htmlPath)) {
        console.log("📝 Fixing asset paths in index.html for GitHub Pages...");
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        if (!htmlContent.includes('/MultiplicationApp/_expo')) {
            htmlContent = htmlContent.replace(/src="\/\_expo/g, 'src="/MultiplicationApp/_expo');
            htmlContent = htmlContent.replace(/href="\/\_expo/g, 'href="/MultiplicationApp/_expo');
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');
        }
    }

    // --- הפתרון הקריטי ל-Windows ו-GitHub Pages ---
    // יצירת קובץ .nojekyll כדי ש-GitHub לא יתעלם מתיקיית _expo
    const noJekyllPath = path.join(distPath, '.nojekyll');
    fs.writeFileSync(noJekyllPath, '');
    console.log("🔒 Created .nojekyll file to bypass Jekyll build filters.");
    // ------------------------------------------------

    // שינוי נתיב עבודה זמני לתוך תיקיית dist
    process.chdir(distPath);

    console.log("📦 Initializing temporary Git repository inside 'dist'...");
    
    if (fs.existsSync('.git')) {
        fs.rmSync('.git', { recursive: true, force: true });
    }

    execSync('git init'); 
    execSync('git config core.longpaths true');
    execSync('git checkout -b gh-pages');

    console.log("📝 Staging and committing web assets...");
    execSync('git add -A'); 
    execSync('git commit -m "Deploy to GitHub Pages" --allow-empty');

    console.log("🌐 Pushing directly to GitHub...");
    const repoUrl = "https://github.com/ArtiumAizin/MultiplicationApp.git";
    
    execSync(`git push ${repoUrl} gh-pages --force`);

    console.log("🎉 App successfully published to GitHub Pages!");

} catch (error) {
    console.error("❌ Deployment failed:");
    console.error(error.message);
}