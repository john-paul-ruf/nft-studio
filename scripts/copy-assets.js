#!/usr/bin/env node

/**
 * Cross-platform asset copying script for NFT Studio
 * Handles HTML and icon copying for all platforms
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const iconsDir = path.join(rootDir, 'icons');

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
    try {
        await fs.copyFile(src, dest);
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`Warning: Could not copy ${src} to ${dest}: ${error.message}`);
        }
        return false;
    }
}

async function copyDirectory(src, dest) {
    try {
        await ensureDir(dest);
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await copyFile(srcPath, destPath);
            }
        }
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`Warning: Could not copy directory ${src}: ${error.message}`);
        }
        return false;
    }
}

async function copyAssets() {
    console.log('📦 Copying assets to dist directory...');
    
    // Ensure dist directory exists
    await ensureDir(distDir);
    
    // Copy index.html
    const distIndexPath = path.join(distDir, 'index.html');
    const templatePath = path.join(rootDir, 'index.template.html');
    
    // Try to copy existing dist/index.html first (for webpack dev server)
    const existingIndexCopied = await copyFile(distIndexPath, distIndexPath);
    
    if (!existingIndexCopied) {
        // If not exists, copy from template
        const templateCopied = await copyFile(templatePath, distIndexPath);
        if (templateCopied) {
            console.log('✅ Copied index.html from template');
        } else {
            console.error('❌ Failed to copy index.html');
            process.exit(1);
        }
    }
    
    // Copy icons directory
    const distIconsDir = path.join(distDir, 'icons');
    const iconsCopied = await copyDirectory(iconsDir, distIconsDir);
    
    if (iconsCopied) {
        console.log('✅ Copied icons directory');
    } else {
        console.log('⚠️ Icons directory not found or empty - using defaults');
    }
    
    console.log('✅ Asset copying complete');
}

// Run the script
copyAssets().catch(error => {
    console.error('❌ Error copying assets:', error);
    process.exit(1);
});