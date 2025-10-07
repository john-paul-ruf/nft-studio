import { pathToFileURL } from 'url';

async function testPluginLoad() {
    try {
        const pluginPath = '/Users/the.phoenix/WebstormProjects/my-nft-zencoder-generated-effects-plugin/plugin.js';
        const pluginUrl = pathToFileURL(pluginPath).href;
        
        console.log('Loading plugin from:', pluginUrl);
        
        const pluginModule = await import(pluginUrl);
        
        console.log('Plugin loaded successfully!');
        console.log('Exports:', Object.keys(pluginModule));
        
        if (pluginModule.register) {
            console.log('Found register function');
            console.log('Register function type:', typeof pluginModule.register);
        }
        
    } catch (error) {
        console.error('Failed to load plugin:', error.message);
        console.error('Stack:', error.stack);
    }
}

testPluginLoad();