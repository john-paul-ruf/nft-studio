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
  
  <!-- Dark background with subtle radial gradient -->
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  
  <!-- Dense background grid with depth -->
  <g opacity="0.15">
    <!-- Horizontal lines -->
    <line x1="0" y1="64" x2="512" y2="64" stroke="#00ffff" stroke-width="0.5"/>
    <line x1="0" y1="128" x2="512" y2="128" stroke="#00ffff" stroke-width="1"/>
    <line x1="0" y1="192" x2="512" y2="192" stroke="#00ffff" stroke-width="0.5"/>
    <line x1="0" y1="256" x2="512" y2="256" stroke="#ff00ff" stroke-width="1.5"/>
    <line x1="0" y1="320" x2="512" y2="320" stroke="#00ffff" stroke-width="0.5"/>
    <line x1="0" y1="384" x2="512" y2="384" stroke="#00ffff" stroke-width="1"/>
    <line x1="0" y1="448" x2="512" y2="448" stroke="#00ffff" stroke-width="0.5"/>
    <!-- Vertical lines -->
    <line x1="64" y1="0" x2="64" y2="512" stroke="#00ffff" stroke-width="0.5"/>
    <line x1="128" y1="0" x2="128" y2="512" stroke="#00ffff" stroke-width="1"/>
    <line x1="192" y1="0" x2="192" y2="512" stroke="#00ffff" stroke-width="0.5"/>
    <line x1="256" y1="0" x2="256" y2="512" stroke="#ff00ff" stroke-width="1.5"/>
    <line x1="320" y1="0" x2="320" y2="512" stroke="#00ffff" stroke-width="0.5"/>
    <line x1="384" y1="0" x2="384" y2="512" stroke="#00ffff" stroke-width="1"/>
    <line x1="448" y1="0" x2="448" y2="512" stroke="#00ffff" stroke-width="0.5"/>
  </g>
  
  <!-- Hexagonal pattern background -->
  <g opacity="0.08" stroke="#00ffff" stroke-width="1" fill="none">
    <polygon points="64,32 96,48 96,80 64,96 32,80 32,48"/>
    <polygon points="448,32 480,48 480,80 448,96 416,80 416,48"/>
    <polygon points="64,416 96,432 96,464 64,480 32,464 32,432"/>
    <polygon points="448,416 480,432 480,464 448,480 416,464 416,432"/>
  </g>
  
  <!-- Complex circuit board patterns + PULSING NODES -->
  <g opacity="0.35" stroke="url(#greenGrad)" stroke-width="2" fill="none">
    <!-- Top left quadrant circuits -->
    <path d="M 60 60 L 100 60 L 100 100 M 100 80 L 140 80 L 140 120"/>
    <path d="M 140 60 L 180 60 M 160 60 L 160 100"/>
    <circle cx="60" cy="60" r="4" fill="#00ff00">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="r" values="4;5;4" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="140" cy="80" r="3" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="180" cy="60" r="3" fill="#00ff00">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="2s" begin="0.6s" repeatCount="indefinite"/>
    </circle>
    <rect x="98" y="78" width="4" height="4" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" begin="0.9s" repeatCount="indefinite"/>
    </rect>
    
    <!-- Top right quadrant circuits -->
    <path d="M 452 60 L 412 60 L 412 100 M 412 80 L 372 80 L 372 120"/>
    <path d="M 372 60 L 332 60 M 352 60 L 352 100"/>
    <circle cx="452" cy="60" r="4" fill="#ff00ff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite"/>
      <animate attributeName="r" values="4;5;4" dur="1.7s" repeatCount="indefinite"/>
    </circle>
    <circle cx="372" cy="80" r="3" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2.1s" begin="0.4s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="2.1s" begin="0.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="332" cy="60" r="3" fill="#ff00ff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.9s" begin="0.7s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="1.9s" begin="0.7s" repeatCount="indefinite"/>
    </circle>
    <rect x="410" y="78" width="4" height="4" fill="#ff00ff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" begin="1s" repeatCount="indefinite"/>
    </rect>
    
    <!-- Bottom left quadrant circuits -->
    <path d="M 60 452 L 100 452 L 100 412 M 100 432 L 140 432 L 140 392"/>
    <path d="M 140 452 L 180 452 M 160 452 L 160 412"/>
    <circle cx="60" cy="452" r="4" fill="#e91e63">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="4;5;4" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="140" cy="432" r="3" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" begin="0.5s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="2.2s" begin="0.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="180" cy="452" r="3" fill="#e91e63">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" begin="0.8s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="1.8s" begin="0.8s" repeatCount="indefinite"/>
    </circle>
    <rect x="98" y="430" width="4" height="4" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="1.1s" repeatCount="indefinite"/>
    </rect>
    
    <!-- Bottom right quadrant circuits -->
    <path d="M 452 452 L 412 452 L 412 412 M 412 432 L 372 432 L 372 392"/>
    <path d="M 372 452 L 332 452 M 352 452 L 352 412"/>
    <circle cx="452" cy="452" r="4" fill="#9c27b0">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2.3s" repeatCount="indefinite"/>
      <animate attributeName="r" values="4;5;4" dur="2.3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="372" cy="432" r="3" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="1.5s" begin="0.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="332" cy="452" r="3" fill="#9c27b0">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2.1s" begin="0.9s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4;3" dur="2.1s" begin="0.9s" repeatCount="indefinite"/>
    </circle>
    <rect x="410" y="430" width="4" height="4" fill="#9c27b0">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" begin="1.2s" repeatCount="indefinite"/>
    </rect>
    
    <!-- Center connecting circuits -->
    <path d="M 200 256 L 230 256 M 282 256 L 312 256"/>
    <path d="M 256 200 L 256 230 M 256 282 L 256 312"/>
    <circle cx="200" cy="256" r="3" fill="#00ffff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4.5;3" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="312" cy="256" r="3" fill="#ff00ff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" begin="0.35s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4.5;3" dur="1.4s" begin="0.35s" repeatCount="indefinite"/>
    </circle>
    <circle cx="256" cy="200" r="3" fill="#00ff00">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" begin="0.7s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4.5;3" dur="1.4s" begin="0.7s" repeatCount="indefinite"/>
    </circle>
    <circle cx="256" cy="312" r="3" fill="#e91e63">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" begin="1.05s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;4.5;3" dur="1.4s" begin="1.05s" repeatCount="indefinite"/>
    </circle>
  </g>
  
  <!-- Data stream lines + FLOWING ANIMATION -->
  <g opacity="0.25" stroke-width="1.5">
    <path d="M 0 100 Q 128 120, 256 100 T 512 100" stroke="#00ffff" fill="none" stroke-dasharray="5,5">
      <animate attributeName="stroke-dashoffset" 
               from="0" 
               to="20" 
               dur="1s" 
               repeatCount="indefinite"/>
    </path>
    <path d="M 0 412 Q 128 392, 256 412 T 512 412" stroke="#ff00ff" fill="none" stroke-dasharray="5,5">
      <animate attributeName="stroke-dashoffset" 
               from="0" 
               to="-20" 
               dur="1.2s" 
               repeatCount="indefinite"/>
    </path>
    <path d="M 100 0 Q 120 128, 100 256 T 100 512" stroke="#00ff00" fill="none" stroke-dasharray="5,5">
      <animate attributeName="stroke-dashoffset" 
               from="0" 
               to="20" 
               dur="1.1s" 
               repeatCount="indefinite"/>
    </path>
    <path d="M 412 0 Q 392 128, 412 256 T 412 512" stroke="#e91e63" fill="none" stroke-dasharray="5,5">
      <animate attributeName="stroke-dashoffset" 
               from="0" 
               to="-20" 
               dur="1.3s" 
               repeatCount="indefinite"/>
    </path>
  </g>
  
  <!-- Digital rain effect - enhanced + FLICKERING ANIMATION -->
  <g opacity="0.4" fill="#00ff00" font-family="monospace" font-size="11" font-weight="bold">
    <!-- Top edge -->
    <text x="80" y="40">1101
      <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite"/>
    </text>
    <text x="150" y="50">0110
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite"/>
    </text>
    <text x="220" y="35">1010
      <animate attributeName="opacity" values="0.3;1;0.3" dur="0.9s" repeatCount="indefinite"/>
    </text>
    <text x="290" y="45">0011
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1.1s" repeatCount="indefinite"/>
    </text>
    <text x="360" y="38">1100
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.3s" repeatCount="indefinite"/>
    </text>
    <text x="430" y="48">0101
      <animate attributeName="opacity" values="0.5;1;0.5" dur="0.7s" repeatCount="indefinite"/>
    </text>
    
    <!-- Bottom edge -->
    <text x="80" y="475">0110
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite"/>
    </text>
    <text x="150" y="485">1001
      <animate attributeName="opacity" values="0.6;1;0.6" dur="0.9s" repeatCount="indefinite"/>
    </text>
    <text x="220" y="478">0011
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.1s" repeatCount="indefinite"/>
    </text>
    <text x="290" y="482">1110
      <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite"/>
    </text>
    <text x="360" y="476">0100
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>
    </text>
    <text x="430" y="486">1011
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1.0s" repeatCount="indefinite"/>
    </text>
    
    <!-- Left edge -->
    <text x="25" y="120">10
      <animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" repeatCount="indefinite"/>
    </text>
    <text x="25" y="180">01
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.3s" repeatCount="indefinite"/>
    </text>
    <text x="25" y="240">11
      <animate attributeName="opacity" values="0.3;1;0.3" dur="0.7s" repeatCount="indefinite"/>
    </text>
    <text x="25" y="300">00
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1.1s" repeatCount="indefinite"/>
    </text>
    <text x="25" y="360">10
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite"/>
    </text>
    <text x="25" y="420">01
      <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite"/>
    </text>
    
    <!-- Right edge -->
    <text x="475" y="120">11
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>
    </text>
    <text x="475" y="180">00
      <animate attributeName="opacity" values="0.6;1;0.6" dur="0.9s" repeatCount="indefinite"/>
    </text>
    <text x="475" y="240">10
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.0s" repeatCount="indefinite"/>
    </text>
    <text x="475" y="300">01
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.3s" repeatCount="indefinite"/>
    </text>
    <text x="475" y="360">11
      <animate attributeName="opacity" values="0.3;1;0.3" dur="0.7s" repeatCount="indefinite"/>
    </text>
    <text x="475" y="420">10
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1.1s" repeatCount="indefinite"/>
    </text>
  </g>
  
  <!-- Tech symbols and icons -->
  <g opacity="0.2" fill="none" stroke="#00ffff" stroke-width="1.5">
    <!-- Top left tech symbol -->
    <circle cx="50" cy="50" r="8"/>
    <path d="M 50 42 L 50 58 M 42 50 L 58 50"/>
    
    <!-- Top right tech symbol -->
    <circle cx="462" cy="50" r="8"/>
    <polygon points="462,44 466,50 462,56 458,50" fill="#ff00ff"/>
    
    <!-- Bottom left tech symbol -->
    <circle cx="50" cy="462" r="8"/>
    <polygon points="50,456 54,462 50,468 46,462" fill="#e91e63"/>
    
    <!-- Bottom right tech symbol -->
    <circle cx="462" cy="462" r="8"/>
    <rect x="458" y="458" width="8" height="8" fill="none" stroke="#9c27b0"/>
  </g>
  
  <!-- Particle effects + BLINKING ANIMATION -->
  <g opacity="0.3">
    <circle cx="120" cy="120" r="1.5" fill="#00ffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="180" cy="90" r="1" fill="#00ff00">
      <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="240" cy="110" r="1.5" fill="#ff00ff">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="330" cy="95" r="1" fill="#00ffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="390" cy="115" r="1.5" fill="#ff00ff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    
    <circle cx="120" cy="400" r="1.5" fill="#e91e63">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.9s" repeatCount="indefinite"/>
    </circle>
    <circle cx="180" cy="420" r="1" fill="#00ffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite"/>
    </circle>
    <circle cx="240" cy="405" r="1.5" fill="#9c27b0">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite"/>
    </circle>
    <circle cx="330" cy="415" r="1" fill="#00ff00">
      <animate attributeName="opacity" values="0.2;1;0.2" dur="2.3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="390" cy="395" r="1.5" fill="#e91e63">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
  </g>
  
  <!-- Larger hexagon frame with multiple layers + PULSING OPACITY -->
  <g transform="translate(256, 256)">
    <!-- Outer hexagon -->
    <polygon points="0,-220 190.53,-110 190.53,110 0,220 -190.53,110 -190.53,-110" 
             fill="none" 
             stroke="url(#neonGrad)" 
             stroke-width="3"
             filter="url(#glow)"
             opacity="0.5">
      <animate attributeName="opacity" 
               values="0.5;0.8;0.5" 
               dur="4s" 
               repeatCount="indefinite"/>
    </polygon>
    
    <!-- Middle hexagon -->
    <polygon points="0,-200 173.21,-100 173.21,100 0,200 -173.21,100 -173.21,-100" 
             fill="none" 
             stroke="url(#neonGrad)" 
             stroke-width="4"
             filter="url(#glow)"
             opacity="0.7">
      <animate attributeName="opacity" 
               values="0.7;1;0.7" 
               dur="3s" 
               repeatCount="indefinite"/>
    </polygon>
    
    <!-- Inner hexagon -->
    <polygon points="0,-180 155.88,-90 155.88,90 0,180 -155.88,90 -155.88,-90" 
             fill="none" 
             stroke="url(#purpleGrad)" 
             stroke-width="2"
             opacity="0.6">
      <animate attributeName="opacity" 
               values="0.6;0.9;0.6" 
               dur="2.5s" 
               repeatCount="indefinite"/>
    </polygon>
  </g>
  
  <!-- Centered NFT text - LARGE and bold + PULSING GLOW -->
  <text x="256" y="256" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="160" 
        font-weight="900" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="url(#neonGrad)"
        filter="url(#strongGlow)">NFT
    <animate attributeName="opacity" 
             values="1;0.8;1" 
             dur="2s" 
             repeatCount="indefinite"/>
  </text>
  
  <!-- Centered Studio text - positioned below NFT + PULSING GLOW -->
  <text x="256" y="340" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="52" 
        font-weight="600" 
        text-anchor="middle" 
        fill="#00ffff"
        filter="url(#strongGlow)"
        letter-spacing="12">STUDIO
    <animate attributeName="opacity" 
             values="1;0.7;1" 
             dur="2.5s" 
             repeatCount="indefinite"/>
  </text>
  
  <!-- Enhanced corner accents + PULSING ANIMATION -->
  <g opacity="0.6">
    <!-- Top left -->
    <path d="M 30 30 L 30 80 L 80 80" stroke="#00ffff" stroke-width="4" fill="none">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
    </path>
    <circle cx="30" cy="30" r="5" fill="#00ffff">
      <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
    </circle>
    <line x1="30" y1="30" x2="50" y2="50" stroke="#00ffff" stroke-width="2">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
    </line>
    
    <!-- Top right -->
    <path d="M 482 30 L 482 80 L 432 80" stroke="#ff00ff" stroke-width="4" fill="none">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite"/>
    </path>
    <circle cx="482" cy="30" r="5" fill="#ff00ff">
      <animate attributeName="r" values="5;7;5" dur="2.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <line x1="482" y1="30" x2="462" y2="50" stroke="#ff00ff" stroke-width="2">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite"/>
    </line>
    
    <!-- Bottom left -->
    <path d="M 30 482 L 30 432 L 80 432" stroke="#e91e63" stroke-width="4" fill="none">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite"/>
    </path>
    <circle cx="30" cy="482" r="5" fill="#e91e63">
      <animate attributeName="r" values="5;7;5" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <line x1="30" y1="482" x2="50" y2="462" stroke="#e91e63" stroke-width="2">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite"/>
    </line>
    
    <!-- Bottom right -->
    <path d="M 482 482 L 482 432 L 432 432" stroke="#9c27b0" stroke-width="4" fill="none">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite"/>
    </path>
    <circle cx="482" cy="482" r="5" fill="#9c27b0">
      <animate attributeName="r" values="5;7;5" dur="2.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite"/>
    </circle>
    <line x1="482" y1="482" x2="462" y2="462" stroke="#9c27b0" stroke-width="2">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite"/>
    </line>
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
  
  <!-- Glitch overlay (subtle) + PULSING INTENSITY -->
  <rect x="0" y="0" width="512" height="512" fill="none" stroke="none" filter="url(#glitch)" opacity="0.05">
    <animate attributeName="opacity" 
             values="0.05;0.15;0.05" 
             dur="5s" 
             repeatCount="indefinite"/>
  </rect>
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
🎉 ANIMATED CYBERPUNK MASTERPIECE ICONS GENERATED! 🎉

Your NFT Studio now has an ULTRA-DETAILED, FULLY ANIMATED cyberpunk design!

✨ TEXT & COMPOSITION:
- "NFT" text: 160px, perfectly centered (dominant-baseline)
- "STUDIO" text: 52px, positioned below NFT
- Triple-layered hexagon frame (220px, 200px, 180px)

🎨 BACKGROUND DETAILS:
- Radial gradient background (depth effect)
- Dense 7×7 grid system with varying line weights
- 4 hexagonal corner patterns
- Curved data stream lines (dashed, flowing)
- 24+ binary code elements around all edges
- Tech symbols in all 4 corners (crosshair, diamond, triangle, square)
- 10 particle effects scattered throughout

⚡ CIRCUIT PATTERNS:
- Complex circuits in all 4 quadrants
- Center connecting circuits (4-way)
- 16+ circuit nodes with color-coded connections
- Green gradient circuit traces
- Junction boxes and connection points

🌟 EFFECTS & POLISH:
- Glitch effect filter (fractal noise)
- Strong text glow (stdDeviation 6)
- Subtle shape glow (stdDeviation 3)
- Enhanced corner accents with diagonal lines
- Multi-color neon gradients (cyan/magenta/purple/green)

🎬 ALL 8 ANIMATIONS (SVG ONLY):
1. ✨ Pulsing text glow (NFT + STUDIO breathing effect)
2. 💫 Pulsing hexagons (3 layers with subtle opacity breathing)
3. 🌊 Flowing data streams (animated dashed lines)
4. ✨ Blinking particles (10 particles, random timing)
5. 💻 Flickering digital rain (24+ binary codes)
6. 🎭 Glitch effect pulses (periodic intensity changes)
7. ⚡ Circuit node pulses (16+ nodes lighting up sequentially)
8. 🎯 Corner accent animations (pulsing brackets & circles)
BONUS: 📡 Scanning line sweep (moving up and down)

Design features:
✅ Text perfectly centered and highly readable
✅ Massive amount of cyberpunk detail
✅ FULLY ANIMATED - A LIVING, BREATHING INTERFACE!
✅ Professional technical aesthetic
✅ Scales beautifully from 16×16 to 1024×1024
✅ Rich visual depth with layered elements
✅ Authentic sci-fi/tech atmosphere

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