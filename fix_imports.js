const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'src');

function fixImports(content) {
    let newContent = content;
    
    const replacements = [
        // screens and features to features
        { regex: /from\s+['"](?:\.\.\/)+screens\/(.*?)['"]/g, replacement: "from '@features/$1'" },
        { regex: /from\s+['"](?:\.\.\/)+features\/(.*?)['"]/g, replacement: "from '@features/$1'" },
        
        // components, constants, types, theme to shared
        { regex: /from\s+['"](?:\.\.\/)+components\/(.*?)['"]/g, replacement: "from '@shared/components/$1'" },
        { regex: /from\s+['"](?:\.\.\/)+constants(.*?)['"]/g, replacement: "from '@shared/utils'" },
        { regex: /from\s+['"](?:\.\.\/)+types\/(.*?)['"]/g, replacement: "from '@shared/types/$1'" },
        { regex: /from\s+['"](?:\.\.\/)+theme\/(.*?)['"]/g, replacement: "from '@shared/theme/$1'" },
        
        // api, repositories, mocks to data
        { regex: /from\s+['"](?:\.\.\/)+api\/(.*?)['"]/g, replacement: "from '@data/datasources/$1'" },
        { regex: /from\s+['"](?:\.\.\/)+repositories\/(.*?)['"]/g, replacement: "from '@data/repositories/$1'" },
        { regex: /from\s+['"](?:\.\.\/)+mocks\/(.*?)['"]/g, replacement: "from '@data/mocks/$1'" },
        
        // store, navigation to app
        { regex: /from\s+['"](?:\.\.\/)+store(.*?)['"]/g, replacement: "from '@app/store$1'" },
        { regex: /from\s+['"](?:\.\.\/)+navigation\/(.*?)['"]/g, replacement: "from '@app/navigation/$1'" }
    ];

    for (const { regex, replacement } of replacements) {
        newContent = newContent.replace(regex, replacement);
    }
    return newContent;
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            const original = fs.readFileSync(fullPath, 'utf8');
            const fixed = fixImports(original);
            if (original !== fixed) {
                fs.writeFileSync(fullPath, fixed, 'utf8');
                console.log(`Fixed: ${fullPath}`);
            }
        }
    }
}

walk(rootDir);
