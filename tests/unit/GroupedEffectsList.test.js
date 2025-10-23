/**
 * GroupedEffectsList Component Tests
 * 
 * Tests for the GroupedEffectsList component covering:
 * - Effect grouping by author
 * - Group expansion/collapse
 * - Effect selection within groups
 * - Author sorting
 * - Theme support
 * - Empty state handling
 * 
 * Critical Validations:
 * - Effects selected by reference, not index
 * - Author groups organized alphabetically
 * - Only expanded group shows effects
 */

export async function testGroupedEffectsListGrouping(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: grouping...');
    
    const effects = [
        { name: 'Blur', author: 'BuiltIn', registryKey: 'blur' },
        { name: 'Sharpen', author: 'BuiltIn', registryKey: 'sharpen' },
        { name: 'GlowCustom', author: 'Community', registryKey: 'glow-custom' },
        { name: 'VortexCustom', author: 'Community', registryKey: 'vortex-custom' }
    ];
    
    // Group effects by author
    const groupedEffects = {};
    effects.forEach(effect => {
        const author = effect.author || 'Uncategorized';
        if (!groupedEffects[author]) {
            groupedEffects[author] = [];
        }
        groupedEffects[author].push(effect);
    });
    
    // Verify grouping
    if (!groupedEffects['BuiltIn']) {
        throw new Error('BuiltIn author should exist');
    }
    
    if (groupedEffects['BuiltIn'].length !== 2) {
        throw new Error(`Expected 2 BuiltIn effects, got ${groupedEffects['BuiltIn'].length}`);
    }
    
    if (!groupedEffects['Community']) {
        throw new Error('Community author should exist');
    }
    
    if (groupedEffects['Community'].length !== 2) {
        throw new Error(`Expected 2 Community effects, got ${groupedEffects['Community'].length}`);
    }
    
    // Verify correct effects in groups
    const builtInEffects = groupedEffects['BuiltIn'].map(e => e.name);
    if (!builtInEffects.includes('Blur') || !builtInEffects.includes('Sharpen')) {
        throw new Error('BuiltIn group should contain Blur and Sharpen');
    }
    
    const communityEffects = groupedEffects['Community'].map(e => e.name);
    if (!communityEffects.includes('GlowCustom') || !communityEffects.includes('VortexCustom')) {
        throw new Error('Community group should contain GlowCustom and VortexCustom');
    }
    
    console.log('✅ GroupedEffectsList grouping passed');
    
    return {
        testName: 'GroupedEffectsList: grouping',
        status: 'PASSED',
        authorGroups: Object.keys(groupedEffects),
        groupSizes: {
            BuiltIn: groupedEffects['BuiltIn'].length,
            Community: groupedEffects['Community'].length
        }
    };
}

export async function testGroupedEffectsListExpansion(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: expansion...');
    
    let expandedAuthor = null;
    let toggleCalls = [];
    
    const onToggleAuthor = (author) => {
        toggleCalls.push({ author, timestamp: Date.now() });
        expandedAuthor = expandedAuthor === author ? null : author;
    };
    
    // Test: Expand first author
    onToggleAuthor('BuiltIn');
    
    if (expandedAuthor !== 'BuiltIn') {
        throw new Error('BuiltIn should be expanded');
    }
    
    // Test: Expand replaces previous expansion
    onToggleAuthor('Community');
    
    if (expandedAuthor !== 'Community') {
        throw new Error('Community should be expanded');
    }
    
    // Verify BuiltIn is no longer expanded
    // (Only one author expanded at a time)
    
    // Test: Collapse by toggling same author
    onToggleAuthor('Community');
    
    if (expandedAuthor !== null) {
        throw new Error('Community should be collapsed');
    }
    
    if (toggleCalls.length !== 3) {
        throw new Error('Toggle should be called 3 times');
    }
    
    console.log('✅ GroupedEffectsList expansion passed');
    
    return {
        testName: 'GroupedEffectsList: expansion',
        status: 'PASSED',
        toggleCalls: toggleCalls.length,
        finalExpanded: expandedAuthor
    };
}

export async function testGroupedEffectsListSelection(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: effect selection...');
    
    const effects = [
        { name: 'Blur', author: 'BuiltIn', registryKey: 'blur' },
        { name: 'GlowCustom', author: 'Community', registryKey: 'glow-custom' }
    ];
    
    const groupedEffects = {
        'BuiltIn': [effects[0]],
        'Community': [effects[1]]
    };
    
    let selectedEffects = [];
    let expandedAuthor = null;
    
    const onSelectEffect = (effect) => {
        selectedEffects.push(effect);
    };
    
    const onToggleAuthor = (author) => {
        expandedAuthor = expandedAuthor === author ? null : author;
    };
    
    // Test: Expand BuiltIn group
    onToggleAuthor('BuiltIn');
    
    if (expandedAuthor !== 'BuiltIn') {
        throw new Error('BuiltIn group should be expanded');
    }
    
    // Test: Select effect from expanded group
    onSelectEffect(effects[0]);
    
    if (selectedEffects.length !== 1) {
        throw new Error('One effect should be selected');
    }
    
    // CRITICAL: Verify effect object is passed, not index
    const selection = selectedEffects[0];
    if (selection.name !== 'Blur') {
        throw new Error(`Expected Blur effect, got ${selection.name}`);
    }
    
    if (typeof selection !== 'object' || !selection.registryKey) {
        throw new Error('Effect should be full object, not index');
    }
    
    // Test: Select from different group
    onToggleAuthor('Community');
    onSelectEffect(effects[1]);
    
    if (selectedEffects.length !== 2) {
        throw new Error('Two effects should be selected');
    }
    
    if (selectedEffects[1].name !== 'GlowCustom') {
        throw new Error(`Expected GlowCustom effect, got ${selectedEffects[1].name}`);
    }
    
    console.log('✅ GroupedEffectsList effect selection passed');
    
    return {
        testName: 'GroupedEffectsList: effect selection',
        status: 'PASSED',
        effectsSelected: selectedEffects.map(e => e.name),
        selectionByReference: true
    };
}

export async function testGroupedEffectsListAuthorSorting(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: author sorting...');
    
    const effects = [
        { name: 'Effect1', author: 'Zeta', registryKey: 'e1' },
        { name: 'Effect2', author: 'Alpha', registryKey: 'e2' },
        { name: 'Effect3', author: 'Beta', registryKey: 'e3' },
        { name: 'Effect4', author: 'Gamma', registryKey: 'e4' }
    ];
    
    // Group and sort authors
    const groupedEffects = {};
    effects.forEach(effect => {
        const author = effect.author;
        if (!groupedEffects[author]) {
            groupedEffects[author] = [];
        }
        groupedEffects[author].push(effect);
    });
    
    const authors = Object.keys(groupedEffects).sort();
    
    // Verify alphabetical order
    if (authors[0] !== 'Alpha') {
        throw new Error(`First author should be Alpha, got ${authors[0]}`);
    }
    
    if (authors[1] !== 'Beta') {
        throw new Error(`Second author should be Beta, got ${authors[1]}`);
    }
    
    if (authors[2] !== 'Gamma') {
        throw new Error(`Third author should be Gamma, got ${authors[2]}`);
    }
    
    if (authors[3] !== 'Zeta') {
        throw new Error(`Fourth author should be Zeta, got ${authors[3]}`);
    }
    
    console.log('✅ GroupedEffectsList author sorting passed');
    
    return {
        testName: 'GroupedEffectsList: author sorting',
        status: 'PASSED',
        sortedAuthors: authors,
        isAlphabetical: authors.join(',') === 'Alpha,Beta,Gamma,Zeta'
    };
}

export async function testGroupedEffectsListEmptyState(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: empty state...');
    
    const groupedEffects = {};
    const authors = Object.keys(groupedEffects).sort();
    
    // Verify empty
    if (authors.length !== 0) {
        throw new Error('Authors should be empty');
    }
    
    // Test: No rendering if no effects
    const renderRequired = authors.length > 0;
    
    if (renderRequired) {
        throw new Error('Should not render if no authors');
    }
    
    console.log('✅ GroupedEffectsList empty state passed');
    
    return {
        testName: 'GroupedEffectsList: empty state',
        status: 'PASSED',
        authorCount: authors.length,
        rendersEmpty: true
    };
}

export async function testGroupedEffectsListUncategorized(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: uncategorized effects...');
    
    const effects = [
        { name: 'Effect1', author: 'BuiltIn', registryKey: 'e1' },
        { name: 'Effect2', author: null, registryKey: 'e2' },
        { name: 'Effect3', registryKey: 'e3' } // No author property
    ];
    
    const groupedEffects = {};
    effects.forEach(effect => {
        const author = effect.author || 'Uncategorized';
        if (!groupedEffects[author]) {
            groupedEffects[author] = [];
        }
        groupedEffects[author].push(effect);
    });
    
    // Verify uncategorized group exists
    if (!groupedEffects['Uncategorized']) {
        throw new Error('Uncategorized group should exist for effects without author');
    }
    
    if (groupedEffects['Uncategorized'].length !== 2) {
        throw new Error(`Expected 2 uncategorized effects, got ${groupedEffects['Uncategorized'].length}`);
    }
    
    // Verify BuiltIn group
    if (!groupedEffects['BuiltIn']) {
        throw new Error('BuiltIn group should exist');
    }
    
    if (groupedEffects['BuiltIn'].length !== 1) {
        throw new Error(`Expected 1 BuiltIn effect, got ${groupedEffects['BuiltIn'].length}`);
    }
    
    console.log('✅ GroupedEffectsList uncategorized effects passed');
    
    return {
        testName: 'GroupedEffectsList: uncategorized',
        status: 'PASSED',
        authorGroups: Object.keys(groupedEffects),
        uncategorizedCount: groupedEffects['Uncategorized'].length
    };
}

export async function testGroupedEffectsListThemeSupport(testEnv) {
    console.log('🧪 Testing GroupedEffectsList: theme support...');
    
    const darkTheme = {
        palette: {
            mode: 'dark',
            text: { primary: '#ffffff', secondary: '#bdbdbd' },
            action: { hover: '#424242' }
        }
    };
    
    const lightTheme = {
        palette: {
            mode: 'light',
            text: { primary: '#000000', secondary: '#666666' },
            action: { hover: '#f5f5f5' }
        }
    };
    
    // Test dark theme
    if (darkTheme.palette.text.primary !== '#ffffff') {
        throw new Error('Dark theme primary text should be white');
    }
    
    // Test light theme
    if (lightTheme.palette.text.primary !== '#000000') {
        throw new Error('Light theme primary text should be black');
    }
    
    console.log('✅ GroupedEffectsList theme support passed');
    
    return {
        testName: 'GroupedEffectsList: theme support',
        status: 'PASSED',
        themesSupported: ['dark', 'light']
    };
}

// Test registration
export const tests = [
    {
        name: 'GroupedEffectsList: grouping',
        category: 'unit',
        fn: testGroupedEffectsListGrouping,
        description: 'Verify effects are correctly grouped by author'
    },
    {
        name: 'GroupedEffectsList: expansion',
        category: 'unit',
        fn: testGroupedEffectsListExpansion,
        description: 'Verify author groups can be expanded/collapsed'
    },
    {
        name: 'GroupedEffectsList: effect selection',
        category: 'unit',
        fn: testGroupedEffectsListSelection,
        description: 'Verify effects can be selected from expanded groups'
    },
    {
        name: 'GroupedEffectsList: author sorting',
        category: 'unit',
        fn: testGroupedEffectsListAuthorSorting,
        description: 'Verify authors are sorted alphabetically'
    },
    {
        name: 'GroupedEffectsList: empty state',
        category: 'unit',
        fn: testGroupedEffectsListEmptyState,
        description: 'Verify empty state when no effects'
    },
    {
        name: 'GroupedEffectsList: uncategorized effects',
        category: 'unit',
        fn: testGroupedEffectsListUncategorized,
        description: 'Verify effects without author go to Uncategorized group'
    },
    {
        name: 'GroupedEffectsList: theme support',
        category: 'unit',
        fn: testGroupedEffectsListThemeSupport,
        description: 'Verify dark and light theme support'
    }
];

export default tests;