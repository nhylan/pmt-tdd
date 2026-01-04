#!/usr/bin/env node
/**
 * PM-TDD: Test-First YAML Spec Runner
 *
 * Compiles YAML specs directly to Playwright commands.
 * Supports draft/active status for test-first workflow.
 */

const { chromium } = require('playwright');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

async function runSpec(specPath) {
    const specContent = fs.readFileSync(specPath, 'utf8');
    const spec = yaml.parse(specContent);

    const status = spec.status || 'draft';
    const statusIcon = status === 'active' ? '🔒' : '📝';

    console.log(`\n${statusIcon} [${status.toUpperCase()}] ${spec.feature}\n`);

    const browser = await chromium.launch({ headless: !!process.env.CI });
    const page = await browser.newPage();

    // Ensure screenshots directory exists
    const screenshotDir = path.join(path.dirname(specPath), '..', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    let passed = 0;
    let failed = 0;

    for (const scenario of spec.scenarios) {
        console.log(`  📋 ${scenario.name}`);

        try {
            for (const step of scenario.steps) {
                await executeStep(page, step);
            }
            console.log(`     ✅ PASSED\n`);
            passed++;
        } catch (error) {
            // Take screenshot on failure
            const screenshotName = `${path.basename(specPath, '.yaml')}-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            const screenshotPath = path.join(screenshotDir, screenshotName);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            console.log(`     ❌ FAILED: ${error.message}`);
            console.log(`     📸 Screenshot: ${screenshotPath}\n`);
            failed++;
        }
    }

    await browser.close();

    return { passed, failed, status };
}

async function executeStep(page, step) {
    const [action, value] = Object.entries(step)[0];
    console.log(`     → ${action}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);

    switch (action) {
        // Navigation
        case 'goto':
            await page.goto(value);
            break;

        // Clicks - text based
        case 'click':
            if (typeof value === 'string') {
                await page.getByText(value).click();
            } else {
                await page.click(value.selector);
            }
            break;

        // Clicks - role based (more stable)
        case 'click_button':
            await page.getByRole('button', { name: value }).click();
            break;

        case 'click_link':
            await page.getByRole('link', { name: value }).click();
            break;

        // Form inputs
        case 'fill':
            await page.fill(value.selector, value.value);
            break;

        case 'fill_field':
            await page.getByLabel(value.label).fill(value.value);
            break;

        case 'select':
            await page.getByLabel(value.label).selectOption(value.option);
            break;

        case 'check':
            await page.getByLabel(value).check();
            break;

        case 'uncheck':
            await page.getByLabel(value).uncheck();
            break;

        // Interactions
        case 'hover':
            await page.getByText(value).hover();
            break;

        case 'press':
            await page.keyboard.press(value);
            break;

        // Waits
        case 'wait':
            await page.waitForTimeout(value);
            break;

        case 'wait_for':
            await page.getByText(value).waitFor({ state: 'visible', timeout: 10000 });
            break;

        // Assertions
        case 'assert_visible':
            await page.getByText(value).waitFor({ state: 'visible', timeout: 5000 });
            break;

        case 'assert_hidden':
            await page.getByText(value).waitFor({ state: 'hidden', timeout: 5000 });
            break;

        case 'assert_url':
            const url = page.url();
            if (!url.includes(value)) {
                throw new Error(`URL "${url}" does not contain "${value}"`);
            }
            break;

        case 'assert_enabled':
            const enabledBtn = page.getByRole('button', { name: value });
            if (await enabledBtn.isDisabled()) {
                throw new Error(`Button "${value}" is disabled`);
            }
            break;

        case 'assert_disabled':
            const disabledBtn = page.getByRole('button', { name: value });
            if (await disabledBtn.isEnabled()) {
                throw new Error(`Button "${value}" is enabled`);
            }
            break;

        // Debug
        case 'screenshot':
            const dir = path.join(process.cwd(), 'screenshots');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            await page.screenshot({ path: path.join(dir, `${value}.png`), fullPage: true });
            break;

        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

// Main: run spec file(s)
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node run-spec.js <spec.yaml> [spec2.yaml ...]');
        console.log('       node run-spec.js specs/*.yaml');
        process.exit(1);
    }

    // Expand globs and collect all spec files
    const specFiles = args.map(arg => path.resolve(arg));

    const results = {
        active: { passed: 0, failed: 0 },
        draft: { passed: 0, failed: 0 }
    };

    for (const specFile of specFiles) {
        try {
            const result = await runSpec(specFile);
            results[result.status].passed += result.passed;
            results[result.status].failed += result.failed;
        } catch (err) {
            console.error(`Error running ${specFile}:`, err.message);
            results.draft.failed++;
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RESULTS');
    console.log('═'.repeat(50));
    console.log(`   🔒 Active:  ${results.active.passed} passed, ${results.active.failed} failed`);
    console.log(`   📝 Draft:   ${results.draft.passed} passed, ${results.draft.failed} failed`);
    console.log('═'.repeat(50));

    // Exit code only reflects active spec failures
    if (results.active.failed > 0) {
        console.log('\n❌ Build failed: active specs are broken\n');
        process.exit(1);
    } else if (results.draft.failed > 0) {
        console.log('\n⚠️  Build passed: draft specs pending implementation\n');
        process.exit(0);
    } else {
        console.log('\n✅ All specs passed\n');
        process.exit(0);
    }
}

main();
