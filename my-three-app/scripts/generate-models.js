#!/usr/bin/env node

/**
 * Auto-Discovery Model Generator
 *
 * Automatically scans for GLTF/GLB model files and generates React components
 * using gltfjsx with bone type definitions.
 *
 * Features:
 * - Auto-discovers all models in assets/models/
 * - Maps folder structure to component structure
 * - Generates TypeScript components with bone types
 * - Watch mode for auto-regeneration
 * - Error handling and progress reporting
 *
 * Usage:
 *   node scripts/generate-models.js           # Generate all models once
 *   node scripts/generate-models.js --watch   # Watch for changes
 *   node scripts/generate-models.js --dry-run # Preview without generating
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  inputDir: 'public/assets/models/',
  outputDir: 'src/components/',
  extensions: ['.gltf', '.glb'],
  nameSuffix: 'Model',
  excludePatterns: ['**/test/**', '**/*.backup.*'],
  debounceMs: 500,
};

const configPath = path.join(__dirname, '..', 'models.config.js');
let customConfig = {};
if (fs.existsSync(configPath)) {
  try {
    customConfig = await import(configPath);
    customConfig = customConfig.default || customConfig;
    console.log('📝 Loaded custom config from models.config.js');
  } catch (err) {
    console.warn('⚠️  Failed to load models.config.js:', err.message);
  }
}

const config = { ...CONFIG, ...customConfig };

const args = process.argv.slice(2);
const flags = {
  watch: args.includes('--watch') || args.includes('-w'),
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  only: args.find(arg => arg.startsWith('--only='))?.split('=')[1] || null,
};

function findModelFiles(dir, baseDir = dir) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      results.push(...findModelFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      // Check if file has valid extension
      if (config.extensions.includes(ext)) {
        // Check exclude patterns
        const relativePath = path.relative(baseDir, fullPath);
        const shouldExclude = config.excludePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(relativePath);
        });

        if (!shouldExclude) {
          results.push(fullPath);
        }
      }
    }
  }

  return results;
}

function parseModelPath(modelPath) {
  const inputDir = path.resolve(config.inputDir);
  const relativePath = path.relative(inputDir, modelPath);
  const parsedPath = path.parse(relativePath);

  // Extract category from folder (e.g., "player" -> "Player")
  const category = parsedPath.dir
    ? parsedPath.dir.split(path.sep)[0].charAt(0).toUpperCase() +
      parsedPath.dir.split(path.sep)[0].slice(1)
    : 'Models';

  // Generate component name (e.g., "Adventurer" + "Model" -> "AdventurerModel")
  const componentName = parsedPath.name + config.nameSuffix;

  // Generate output path
  const outputDir = path.join(
    config.outputDir,
    category
  );

  const outputFile = path.join(
    outputDir,
    componentName + '.tsx'
  );

  return {
    inputPath: modelPath,
    outputPath: outputFile,
    outputDir,
    category,
    componentName,
    relativePath,
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTime(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

function applyTypeScriptFixes(content) {
  return content
    .replace(/useGraph\(clone\) as GLTFResult/g, 'useGraph(clone) as unknown as GLTFResult')
    .replace(/React\.useRef<THREE\.Group>\(\)/g, 'React.useRef<THREE.Group>(null!)')
    .replace(/JSX\.IntrinsicElements\[['"]group['"]\]/g, "React.ComponentProps<'group'>")
    .replace(/React\.forwardRef<BoneRefs, JSX\.IntrinsicElements\['group'\]>/g, "React.forwardRef<any, React.ComponentProps<'group'>>");
}

function addDefaultExport(content) {
  if (content.includes('export default Model')) return content;
  return content.replace(/(}\))\n\n(useGLTF\.preload)/, '$1\n\nexport default Model\n\n$2');
}

function fixModelPath(content, relativePath, inputPath) {
  const publicPath = '/assets/models/' + relativePath.replace(/\\/g, '/');
  const modelFileName = path.basename(inputPath);

  return content
    .replace(new RegExp(`useGLTF\\(['"\`]/${modelFileName}['"\`]\\)`, 'g'), `useGLTF('${publicPath}')`)
    .replace(new RegExp(`useGLTF\\.preload\\(['"\`]/${modelFileName}['"\`]\\)`, 'g'), `useGLTF.preload('${publicPath}')`);
}

async function generateModel(modelInfo) {
  const { inputPath, outputPath, outputDir, componentName, relativePath } = modelInfo;

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check if file already exists and is newer (unless force flag)
    if (!flags.force && fs.existsSync(outputPath)) {
      const modelStat = fs.statSync(inputPath);
      const outputStat = fs.statSync(outputPath);

      if (outputStat.mtime > modelStat.mtime) {
        console.log(`⏭️  Skipping ${componentName} (already up-to-date)`);
        return { success: true, skipped: true };
      }
    }

    const command = `npx gltfjsx "${inputPath}" --output "${outputPath}" --types --bones`;
    const { stderr } = await execAsync(command);

    if (stderr && !stderr.includes('warning')) {
      throw new Error(stderr);
    }

    let content = fs.readFileSync(outputPath, 'utf-8');

    content = applyTypeScriptFixes(content);
    content = addDefaultExport(content);
    content = fixModelPath(content, relativePath, inputPath);

    fs.writeFileSync(outputPath, content, 'utf-8');

    console.log(`✅ Generated ${componentName}.tsx`);
    return { success: true, skipped: false };

  } catch (error) {
    console.error(`❌ Failed to generate ${componentName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function generateAllModels() {
  const startTime = Date.now();

  console.log('\n🔍 Scanning for model files...\n');

  // Find all model files
  const inputDir = path.resolve(config.inputDir);
  const modelFiles = findModelFiles(inputDir);

  if (modelFiles.length === 0) {
    console.log('⚠️  No model files found in', config.inputDir);
    return;
  }

  // Parse all model paths
  let modelInfos = modelFiles.map(parseModelPath);

  // Filter by --only flag if provided
  if (flags.only) {
    modelInfos = modelInfos.filter(info =>
      info.category.toLowerCase() === flags.only.toLowerCase()
    );

    if (modelInfos.length === 0) {
      console.log(`⚠️  No models found in category: ${flags.only}`);
      return;
    }

    console.log(`📁 Filtering to category: ${flags.only}\n`);
  }

  console.log(`Found ${modelInfos.length} model file(s):\n`);

  // Show what will be generated
  modelInfos.forEach((info, index) => {
    console.log(`  ${index + 1}. ${info.relativePath}`);
    console.log(`     → ${path.relative(process.cwd(), info.outputPath)}\n`);
  });

  // Dry run mode - exit without generating
  if (flags.dryRun) {
    console.log('🏃 Dry run mode - no files were actually generated\n');
    return;
  }

  console.log('⚙️  Generating components...\n');

  // Generate all models
  const results = {
    total: modelInfos.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < modelInfos.length; i++) {
    const info = modelInfos[i];
    console.log(`[${i + 1}/${modelInfos.length}] Generating ${info.componentName}...`);

    const result = await generateModel(info);

    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else {
        results.success++;
      }
    } else {
      results.failed++;
      results.errors.push({
        model: info.componentName,
        error: result.error,
      });
    }
  }

  // Show summary
  const duration = Date.now() - startTime;
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Generated: ${results.success}`);
  if (results.skipped > 0) {
    console.log(`⏭️  Skipped:   ${results.skipped} (already up-to-date)`);
  }
  if (results.failed > 0) {
    console.log(`❌ Failed:    ${results.failed}`);
    console.log('\nErrors:');
    results.errors.forEach(({ model, error }) => {
      console.log(`  - ${model}: ${error}`);
    });
  }
  console.log(`⏱️  Duration:  ${formatTime(duration)}`);
  console.log('='.repeat(50) + '\n');
}

async function generateSingleModel(modelPath) {
  console.log(`\n🔄 Change detected: ${path.basename(modelPath)}`);

  const modelInfo = parseModelPath(modelPath);
  const result = await generateModel(modelInfo);

  if (result.success && !result.skipped) {
    console.log('✨ Regeneration complete!\n');
  }
}

async function watchModels() {
  let chokidar;
  try {
    chokidar = await import('chokidar');
  } catch (err) {
    console.error('❌ Watch mode requires chokidar package');
    console.error('   Install with: npm install --save-dev chokidar');
    process.exit(1);
  }

  console.log('👀 Watch mode enabled\n');
  console.log(`Watching: ${config.inputDir}**/*.{${config.extensions.join(',')}}`);
  console.log('Press Ctrl+C to stop\n');

  await generateAllModels();

  console.log('👀 Watching for changes...\n');

  const watchPattern = path.join(
    config.inputDir,
    `**/*{${config.extensions.join(',')}}`
  );

  const watcher = chokidar.default.watch(watchPattern, {
    ignored: config.excludePatterns,
    persistent: true,
    ignoreInitial: true,
  });

  const pendingRegens = new Map();

  const scheduleRegen = (filePath) => {
    if (pendingRegens.has(filePath)) {
      clearTimeout(pendingRegens.get(filePath));
    }

    const timeout = setTimeout(() => {
      pendingRegens.delete(filePath);
      generateSingleModel(filePath);
    }, config.debounceMs);

    pendingRegens.set(filePath, timeout);
  };

  watcher
    .on('change', scheduleRegen)
    .on('add', scheduleRegen)
    .on('error', error => console.error('❌ Watcher error:', error));
}

async function main() {
  console.log('🎨 Model Component Generator\n');
  console.log('Configuration:');
  console.log(`  Input:  ${config.inputDir}`);
  console.log(`  Output: ${config.outputDir}`);
  console.log(`  Suffix: ${config.nameSuffix}`);

  if (flags.watch) {
    await watchModels();
  } else {
    await generateAllModels();
  }
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
