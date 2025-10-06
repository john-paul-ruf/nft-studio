#!/usr/bin/env node

/**
 * Icon Generation Script for NFT Studio
 * 
 * This script generates all required icons for different platforms.
 * Uses the cyberpunk-themed SVG design for NFT Studio.
 * 
 * Required icon formats:
 * - macOS: .icns (multiple resolutions)
 * - Windows: .ico (16x16, 32x32, 48x48, 256x256)
 * - Linux: .png (256x256 or 512x512)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'icons');

// Cyberpunk-themed NFT Studio icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Neon gradient for main elements -->
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00ffff;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ff00ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00ffff;stop-opacity:1" />
    </linearGradient>
    
    <!-- Purple gradient for accent -->
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#e91e63;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#9c27b0;stop-opacity:1" />
    </linearGradient>
    
    <!-- Glitch effect filter -->
    <filter id="glitch">
      <feColorMatrix in="SourceGraphic" mode="matrix" 
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="red"/>
      <feOffset in="red" dx="2" dy="0" result="redOffset"/>
      <feColorMatrix in="SourceGraphic" mode="matrix" 
        values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyan"/>
      <feOffset in="cyan" dx="-2" dy="0" result="cyanOffset"/>
      <feBlend mode="screen" in="redOffset" in2="cyanOffset" result="glitch1"/>
      <feBlend mode="screen" in="glitch1" in2="SourceGraphic"/>
    </filter>
    
    <!-- Glow effect -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Dark background with subtle grid -->
  <rect width="512" height="512" fill="#0a0a0a"/>
  
  <!-- Background grid pattern -->
  <g opacity="0.1">
    <line x1="0" y1="128" x2="512" y2="128" stroke="#00ffff" stroke-width="1"/>
    <line x1="0" y1="256" x2="512" y2="256" stroke="#00ffff" stroke-width="1"/>
    <line x1="0" y1="384" x2="512" y2="384" stroke="#00ffff" stroke-width="1"/>
    <line x1="128" y1="0" x2="128" y2="512" stroke="#00ffff" stroke-width="1"/>
    <line x1="256" y1="0" x2="256" y2="512" stroke="#00ffff" stroke-width="1"/>
    <line x1="384" y1="0" x2="384" y2="512" stroke="#00ffff" stroke-width="1"/>
  </g>
  
  <!-- Circuit board patterns -->
  <g opacity="0.3">
    <path d="M 50 256 L 100 256 L 100 200 L 150 200" stroke="#00ffff" stroke-width="2" fill="none"/>
    <circle cx="150" cy="200" r="4" fill="#00ffff"/>
    <path d="M 462 256 L 412 256 L 412 312 L 362 312" stroke="#ff00ff" stroke-width="2" fill="none"/>
    <circle cx="362" cy="312" r="4" fill="#ff00ff"/>
    <path d="M 256 50 L 256 100 L 312 100 L 312 150" stroke="#e91e63" stroke-width="2" fill="none"/>
    <circle cx="312" cy="150" r="4" fill="#e91e63"/>
    <path d="M 256 462 L 256 412 L 200 412 L 200 362" stroke="#9c27b0" stroke-width="2" fill="none"/>
    <circle cx="200" cy="362" r="4" fill="#9c27b0"/>
  </g>
  
  <!-- Main hexagon frame -->
  <g transform="translate(256, 256)">
    <!-- Outer hexagon with glow -->
    <polygon points="0,-140 121.24,-70 121.24,70 0,140 -121.24,70 -121.24,-70" 
             fill="none" 
             stroke="url(#neonGrad)" 
             stroke-width="3"
             filter="url(#glow)"
             opacity="0.8"/>
    
    <!-- Inner hexagon -->
    <polygon points="0,-120 103.92,-60 103.92,60 0,120 -103.92,60 -103.92,-60" 
             fill="#0a0a0a" 
             stroke="url(#purpleGrad)" 
             stroke-width="2"
             opacity="0.9"/>
    
    <!-- Second inner hexagon for depth -->
    <polygon points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" 
             fill="none" 
             stroke="#00ffff" 
             stroke-width="1"
             opacity="0.5"
             stroke-dasharray="5,5"/>
  </g>
  
  <!-- NFT text with glitch effect -->
  <g filter="url(#glitch)">
    <text x="256" y="260" 
          font-family="Courier New, monospace" 
          font-size="80" 
          font-weight="bold" 
          text-anchor="middle" 
          fill="url(#neonGrad)"
          filter="url(#glow)">NFT</text>
  </g>
  
  <!-- Studio text with cyberpunk style -->
  <text x="256" y="320" 
        font-family="Courier New, monospace" 
        font-size="32" 
        font-weight="300" 
        text-anchor="middle" 
        fill="#00ffff"
        opacity="0.9"
        letter-spacing="8">STUDIO</text>
  
  <!-- Corner circuit elements -->
  <g opacity="0.6">
    <!-- Top left -->
    <path d="M 30 30 L 30 80 L 80 80" stroke="#00ffff" stroke-width="2" fill="none"/>
    <circle cx="30" cy="30" r="3" fill="#00ffff"/>
    
    <!-- Top right -->
    <path d="M 482 30 L 482 80 L 432 80" stroke="#ff00ff" stroke-width="2" fill="none"/>
    <circle cx="482" cy="30" r="3" fill="#ff00ff"/>
    
    <!-- Bottom left -->
    <path d="M 30 482 L 30 432 L 80 432" stroke="#e91e63" stroke-width="2" fill="none"/>
    <circle cx="30" cy="482" r="3" fill="#e91e63"/>
    
    <!-- Bottom right -->
    <path d="M 482 482 L 482 432 L 432 432" stroke="#9c27b0" stroke-width="2" fill="none"/>
    <circle cx="482" cy="482" r="3" fill="#9c27b0"/>
  </g>
  
  <!-- Scanning line effect -->
  <rect x="0" y="200" width="512" height="2" fill="url(#neonGrad)" opacity="0.3">
    <animate attributeName="y" 
             values="0;512;0" 
             dur="8s" 
             repeatCount="indefinite"/>
    <animate attributeName="opacity" 
             values="0.3;0.6;0.3" 
             dur="8s" 
             repeatCount="indefinite"/>
  </rect>
  
  <!-- Digital rain effect dots -->
  <g opacity="0.2">
    <circle cx="100" cy="150" r="1" fill="#00ff00">
      <animate attributeName="cy" values="0;512" dur="5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="200" cy="300" r="1" fill="#00ff00">
      <animate attributeName="cy" values="0;512" dur="6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="300" cy="50" r="1" fill="#00ff00">
      <animate attributeName="cy" values="0;512" dur="4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="400" cy="400" r="1" fill="#00ff00">
      <animate attributeName="cy" values="0;512" dur="7s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`;

async function generateIcons() {
    console.log('🎨 Generating cyberpunk-themed icons for NFT Studio...');
    
    // Ensure icons directory exists
    await fs.mkdir(iconsDir, { recursive: true });
    
    // Create SVG icon
    const svgPath = path.join(iconsDir, 'icon.svg');
    await fs.writeFile(svgPath, svgIcon);
    console.log('✅ Created icon.svg (cyberpunk themed)');
    
    // Create PNG icons for different sizes using sharp
    const sizes = [16, 32, 64, 128, 256, 512, 1024];
    const pngBuffers = {};
    
    for (const size of sizes) {
        const pngPath = path.join(iconsDir, `icon-${size}.png`);
        const buffer = await sharp(Buffer.from(svgIcon))
            .resize(size, size, {
                kernel: sharp.kernel.lanczos3,
                fit: 'contain',
                background: { r: 10, g: 10, b: 10, alpha: 0 }
            })
            .png()
            .toBuffer();
        
        await fs.writeFile(pngPath, buffer);
        pngBuffers[size] = buffer;
        console.log(`✅ Created icon-${size}.png`);
    }
    
    // Create main PNG icon (for Linux) - use 512x512
    await fs.writeFile(path.join(iconsDir, 'icon.png'), pngBuffers[512]);
    console.log('✅ Created icon.png (Linux - 512x512)');
    
    // Create ICO file for Windows (multi-resolution)
    // For now, we'll create a simple 256x256 PNG as ICO placeholder
    // Proper ICO creation would require additional libraries
    const icoPath = path.join(iconsDir, 'icon.ico');
    await fs.writeFile(icoPath, pngBuffers[256]);
    console.log('✅ Created icon.ico (Windows - placeholder, use electron-icon-builder for proper ICO)');
    
    // Create ICNS for macOS
    // Check if we're on macOS and iconutil is available
    const icnsPath = path.join(iconsDir, 'icon.icns');
    const iconsetPath = path.join(iconsDir, 'icon.iconset');
    
    try {
        // Create iconset directory for macOS
        await fs.mkdir(iconsetPath, { recursive: true });
        
        // macOS iconset requires specific sizes and naming
        const macSizes = [
            { size: 16, name: 'icon_16x16.png' },
            { size: 32, name: 'icon_16x16@2x.png' },
            { size: 32, name: 'icon_32x32.png' },
            { size: 64, name: 'icon_32x32@2x.png' },
            { size: 128, name: 'icon_128x128.png' },
            { size: 256, name: 'icon_128x128@2x.png' },
            { size: 256, name: 'icon_256x256.png' },
            { size: 512, name: 'icon_256x256@2x.png' },
            { size: 512, name: 'icon_512x512.png' },
            { size: 1024, name: 'icon_512x512@2x.png' }
        ];
        
        for (const { size, name } of macSizes) {
            const buffer = pngBuffers[size] || await sharp(Buffer.from(svgIcon))
                .resize(size, size, {
                    kernel: sharp.kernel.lanczos3,
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10, alpha: 0 }
                })
                .png()
                .toBuffer();
            
            await fs.writeFile(path.join(iconsetPath, name), buffer);
        }
        
        // Try to use iconutil if available (macOS only)
        if (process.platform === 'darwin') {
            try {
                execSync(`iconutil -c icns ${iconsetPath} -o ${icnsPath}`, { stdio: 'pipe' });
                console.log('✅ Created icon.icns (macOS - using iconutil)');
                // Clean up iconset directory
                await fs.rm(iconsetPath, { recursive: true, force: true });
            } catch (e) {
                // iconutil not available or failed
                console.log('⚠️  iconutil not available, using PNG fallback for .icns');
                await fs.writeFile(icnsPath, pngBuffers[512]);
            }
        } else {
            // Not on macOS, create placeholder
            await fs.writeFile(icnsPath, pngBuffers[512]);
            console.log('✅ Created icon.icns (placeholder - run on macOS for proper ICNS)');
        }
    } catch (error) {
        console.error('Error creating ICNS:', error);
        // Fallback to PNG
        await fs.writeFile(icnsPath, pngBuffers[512]);
        console.log('✅ Created icon.icns (fallback)');
    }
    
    console.log(`
🎉 Cyberpunk-themed icons generated successfully!

Your NFT Studio now has a cool cyberpunk aesthetic with:
- Neon cyan and magenta gradients
- Hexagonal frame design
- Circuit board patterns
- Glitch effects on the NFT text
- Animated scanning lines (in SVG)
- Matrix-style digital rain effect

The icons have been generated in all required formats:
- SVG: Original vector graphic with animations
- PNG: Multiple resolutions (16x16 to 1024x1024)
- ICO: Windows icon (placeholder - for better quality use electron-icon-builder)
- ICNS: macOS icon ${process.platform === 'darwin' ? '(properly generated)' : '(placeholder - generate on macOS)'}

To improve Windows ICO generation, you can install:
npm install --save-dev electron-icon-builder

Then run:
npx electron-icon-builder --input=icons/icon.svg --output=icons --flatten
`);
}

generateIcons().catch(console.error);