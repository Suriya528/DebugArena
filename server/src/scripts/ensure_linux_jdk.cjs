// Auto-installs portable OpenJDK 17 on Linux cloud environments (e.g. Render, Railway)
// when no system javac is present. Runs during "npm run build".
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function ensureLinuxJava() {
  if (process.platform !== 'linux') {
    return;
  }

  // 1. Check if javac is already available in PATH
  try {
    const version = execSync('javac -version', { stdio: 'pipe', encoding: 'utf8' });
    console.log('[JDK CHECK] Host system already has Java compiler:', version.trim());
    return;
  } catch {
    // javac not in PATH
  }

  // 2. Check if already downloaded in local .jdk
  const projectRoot = path.resolve(__dirname, '..', '..');
  const localJdk = path.join(projectRoot, '.jdk');
  const javacPath = path.join(localJdk, 'bin', 'javac');

  if (fs.existsSync(javacPath)) {
    console.log('[JDK CHECK] Local portable OpenJDK already present at:', javacPath);
    return;
  }

  console.log('[JDK SETUP] No host Java compiler found. Installing portable OpenJDK 17 for cloud judge...');
  try {
    fs.mkdirSync(localJdk, { recursive: true });
    const tarUrl = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz';
    execSync(`curl -sSL "${tarUrl}" | tar -xz -C "${localJdk}" --strip-components=1`, {
      stdio: 'inherit'
    });

    if (fs.existsSync(javacPath)) {
      console.log('[JDK SETUP] Portable OpenJDK 17 installed successfully at:', javacPath);
    } else {
      console.warn('[JDK SETUP] Warning: javac binary not found after extraction.');
    }
  } catch (err) {
    console.warn('[JDK SETUP] Could not download portable JDK automatically:', err.message);
  }
}

ensureLinuxJava();
