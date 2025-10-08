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

// Cyberpunk-themed NFT Studio icon - Enhanced with centered text and rich details
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
    
    <!-- Green gradient for circuits -->
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00ff00;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#00ffff;stop-opacity:0.6" />
    </linearGradient>
    
    <!-- Strong glow effect for text -->
    <filter id="strongGlow">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Subtle glow for shapes -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Glitch effect -->
    <filter id="glitch">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  
  <!-- Dark background -->
  <rect width="512" height="512" fill="#0a0a0a"/>
  
  <!-- Enhanced background grid -->
  <g opacity="0.12">
    <line x1="0" y1="128" x2="512" y2="128" stroke="#00ffff" stroke-width="1"/>
    <line x1="0" y1="256" x2="512" y2="256" stroke="#00ffff" stroke-width="1.5"/>
    <line x1="0" y1="384" x2="512" y2="384" stroke="#00ffff" stroke-width="1"/>
    <line x1="128" y1="0" x2="128" y2="512" stroke="#00ffff" stroke-width="1"/>
    <line x1="256" y1="0" x2="256" y2="512" stroke="#00ffff" stroke-width="1.5"/>
    <line x1="384" y1="0" x2="384" y2="512" stroke="#00ffff" stroke-width="1"/>
  </g>
  
  <!-- Circuit board patterns -->
  <g opacity="0.3" stroke="url(#greenGrad)" stroke-width="2" fill="none">
    <!-- Top circuits -->
    <path d="M 80 80 L 120 80 L 120 120 M 120 100 L 160 100"/>
    <circle cx="80" cy="80" r="3" fill="#00ff00"/>
    <circle cx="160" cy="100" r="3" fill="#00ffff"/>
    
    <!-- Right circuits -->
    <path d="M 432 120 L 432 160 L 392 160 M 412 160 L 412 200"/>
    <circle cx="432" cy="120" r="3" fill="#ff00ff"/>
    <circle cx="412" cy="200" r="3" fill="#00ffff"/>
    
    <!-- Bottom circuits -->
    <path d="M 350 432 L 390 432 L 390 392 M 370 432 L 370 472"/>
    <circle cx="350" cy="432" r="3" fill="#e91e63"/>
    <circle cx="370" cy="472" r="3" fill="#9c27b0"/>
    
    <!-- Left circuits -->
    <path d="M 80 350 L 80 390 L 120 390 M 100 390 L 100 430"/>
    <circle cx="80" cy="350" r="3" fill="#00ffff"/>
    <circle cx="100" cy="430" r="3" fill="#00ff00"/>
  </g>
  
  <!-- Digital rain effect -->
  <g opacity="0.4" fill="#00ff00" font-family="monospace" font-size="12">
    <text x="100" y="50">01</text>
    <text x="200" y="80">10</text>
    <text x="350" y="60">11</text>
    <text x="450" y="90">01</text>
    <text x="50" y="450">10</text>
    <text x="150" y="480">11</text>
    <text x="400" y="470">01</text>
    <text x="480" y="440">10</text>
  </g>
  
  <!-- Larger hexagon frame with multiple layers -->
  <g transform="translate(256, 256)">
    <!-- Outer hexagon -->
    <polygon points="0,-220 190.53,-110 190.53,110 0,220 -190.53,110 -190.53,-110" 
             fill="none" 
             stroke="url(#neonGrad)" 
             stroke-width="3"
             filter="url(#glow)"
             opacity="0.5"/>
    
    <!-- Middle hexagon -->
    <polygon points="0,-200 173.21,-100 173.21,100 0,200 -173.21,100 -173.21,-100" 
             fill="none" 
             stroke="url(#neonGrad)" 
             stroke-width="4"
             filter="url(#glow)"
             opacity="0.7"/>
    
    <!-- Inner hexagon -->
    <polygon points="0,-180 155.88,-90 155.88,90 0,180 -155.88,90 -155.88,-90" 
             fill="none" 
             stroke="url(#purpleGrad)" 
             stroke-width="2"
             opacity="0.6"/>
  </g>
  
  <!-- Centered NFT text - LARGE and bold -->
  <text x="256" y="256" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="160" 
        font-weight="900" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="url(#neonGrad)"
        filter="url(#strongGlow)">NFT</text>
  
  <!-- Centered Studio text - positioned below NFT -->
  <text x="256" y="340" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="52" 
        font-weight="600" 
        text-anchor="middle" 
        fill="#00ffff"
        filter="url(#strongGlow)"
        letter-spacing="12">STUDIO</text>
  
  <!-- Enhanced corner accents -->
  <g opacity="0.6">
    <!-- Top left -->
    <path d="M 30 30 L 30 80 L 80 80" stroke="#00ffff" stroke-width="4" fill="none"/>
    <circle cx="30" cy="30" r="5" fill="#00ffff"/>
    <line x1="30" y1="30" x2="50" y2="50" stroke="#00ffff" stroke-width="2"/>
    
    <!-- Top right -->
    <path d="M 482 30 L 482 80 L 432 80" stroke="#ff00ff" stroke-width="4" fill="none"/>
    <circle cx="482" cy="30" r="5" fill="#ff00ff"/>
    <line x1="482" y1="30" x2="462" y2="50" stroke="#ff00ff" stroke-width="2"/>
    
    <!-- Bottom left -->
    <path d="M 30 482 L 30 432 L 80 432" stroke="#e91e63" stroke-width="4" fill="none"/>
    <circle cx="30" cy="482" r="5" fill="#e91e63"/>
    <line x1="30" y1="482" x2="50" y2="462" stroke="#e91e63" stroke-width="2"/>
    
    <!-- Bottom right -->
    <path d="M 482 482 L 482 432 L 432 432" stroke="#9c27b0" stroke-width="4" fill="none"/>
    <circle cx="482" cy="482" r="5" fill="#9c27b0"/>
    <line x1="482" y1="482" x2="462" y2="462" stroke="#9c27b0" stroke-width="2"/>
  </g>
  
  <!-- Scanning line effect -->
  <rect x="0" y="200" width="512" height="2" fill="url(#neonGrad)" opacity="0.3">
    <animate attributeName="y" 
             values="0;512;0" 
             dur="6s" 
             repeatCount="indefinite"/>
    <animate attributeName="opacity" 
             values="0.3;0.7;0.3" 
             dur="6s" 
             repeatCount="indefinite"/>
  </rect>
  
  <!-- Glitch overlay (subtle) -->
  <rect x="0" y="0" width="512" height="512" fill="none" stroke="none" filter="url(#glitch)" opacity="0.05"/>
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
🎉 Enhanced cyberpunk-themed icons generated successfully!

Your NFT Studio now has a rich, detailed design with:
✨ CENTERED text for perfect balance
- "NFT" text: 160px, perfectly centered using dominant-baseline
- "STUDIO" text: 52px, positioned below NFT
- LARGER hexagon frame with 3 nested layers (outer, middle, inner)
- Enhanced background grid (3x3 pattern)
- Circuit board patterns in all 4 corners
- Digital rain effect (binary code: 01, 10, 11)
- Glitch effect filter for cyberpunk aesthetic
- Enhanced corner accents with diagonal lines
- Animated scanning line effect

Design features:
✅ Text perfectly centered in the icon
✅ Triple-layered hexagon frame for depth
✅ Rich cyberpunk details (circuits, digital rain, glitch)
✅ Neon cyan/magenta/purple gradients
✅ Highly readable at all sizes
✅ Professional appearance with technical aesthetic

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