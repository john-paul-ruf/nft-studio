#!/usr/bin/env node

/**
 * CLI utility to convert settings files to project format
 * Usage: node convertSettings.js <settings-file-path> [output-project-path]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import SettingsToProjectConverter from './SettingsToProjectConverter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🤠 Settings to Project Converter');
        console.log('');
        console.log('Usage: node convertSettings.js <settings-file-path> [output-project-path]');
        console.log('');
        console.log('Examples:');
        console.log('  node convertSettings.js ./hoz-5cbbmr1-settings.json');
        console.log('  node convertSettings.js ./hoz-5cbbmr1-settings.json ./converted-project.json');
        console.log('');
        process.exit(1);
    }

    const settingsPath = args[0];
    const outputPath = args[1];

    try {
        // Check if settings file exists
        const absoluteSettingsPath = path.resolve(settingsPath);
        console.log(`📄 Reading settings file: ${absoluteSettingsPath}`);
        
        const settingsContent = await fs.readFile(absoluteSettingsPath, 'utf8');
        const settings = JSON.parse(settingsContent);

        // Validate settings file
        console.log('🔍 Validating settings file...');
        const validation = SettingsToProjectConverter.validateSettingsFile(settings);
        
        if (validation.length > 0) {
            console.error('❌ Settings file validation failed:');
            validation.forEach(error => console.error(`  - ${error}`));
            process.exit(1);
        }

        // Get conversion summary
        const summary = SettingsToProjectConverter.getConversionSummary(settings);
        console.log('📊 Conversion Summary:');
        console.log(`  Project Name: ${summary.summary.projectName}`);
        console.log(`  Effects Count: ${summary.summary.effectsCount}`);
        console.log(`  Frame Count: ${summary.summary.numFrames}`);
        console.log(`  Resolution: ${summary.summary.resolution}`);
        console.log(`  Artist: ${summary.summary.artist}`);
        console.log(`  Has Color Scheme: ${summary.summary.hasColorScheme ? 'Yes' : 'No'}`);
        console.log('');

        // Convert settings to project
        console.log('🔄 Converting settings to project format...');
        const projectData = await SettingsToProjectConverter.convertSettingsToProject(settings);

        // Determine output path
        let finalOutputPath;
        if (outputPath) {
            finalOutputPath = path.resolve(outputPath);
        } else {
            const settingsDir = path.dirname(absoluteSettingsPath);
            const settingsBasename = path.basename(absoluteSettingsPath, '.json');
            const projectBasename = settingsBasename.replace('-settings', '-project');
            finalOutputPath = path.join(settingsDir, `${projectBasename}.json`);
        }

        // Write converted project
        console.log(`💾 Writing project file: ${finalOutputPath}`);
        await fs.writeFile(finalOutputPath, JSON.stringify(projectData, null, 2), 'utf8');

        console.log('');
        console.log('✅ Conversion completed successfully!');
        console.log(`📁 Project file saved to: ${finalOutputPath}`);
        console.log('');
        console.log('🎭 Converted Effects:');
        projectData.effects.forEach((effect, index) => {
            console.log(`  ${index + 1}. ${effect.registryKey} (${effect.type})`);
        });

    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the CLI
main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});