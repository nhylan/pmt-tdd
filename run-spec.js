#!/usr/bin/env node
/**
 * Simple YAML Spec → Playwright Runner
 * 
 * Compiles YAML specs directly to Playwright commands.
 * No AI needed - explicit selectors/text.
 */

const { chromium } = require('playwright');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

async function runSpec(specPath) {
    // Read and parse YAML spec
    const specContent = fs.readFileSync(specPath, 'utf8');
    const spec = yaml.parse(specContent);

    console.log(`\n🧪 Running: ${spec.feature}\n`);

    // Launch browser
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    let passed = 0;
    let failed = 0;

    for (const scenario of spec.scenarios) {
        console.log(`  📋 Scenario: ${scenario.name}`);

        try {
            for (const step of scenario.steps) {
                await executeStep(page, step);
            }
            console.log(`     ✅ PASSED\n`);
            passed++;
        } catch (error) {
            console.log(`     ❌ FAILED: ${error.message}\n`);
            failed++;
        }
    }

    await browser.close();

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    return failed === 0;
}

async function executeStep(page, step) {
    // Each step is an object like { goto: "url" } or { click: "selector" }
    const [action, value] = Object.entries(step)[0];

    console.log(`     → ${action}: ${JSON.stringify(value)}`);

    switch (action) {
        case 'goto':
            await page.goto(value);
            break;

        case 'click':
            if (typeof value === 'string') {
                // Text-based click
                await page.getByText(value).click();
            } else {
                // Selector-based click
                await page.click(value.selector);
            }
            break;

        case 'fill':
            await page.fill(value.selector, value.value);
            break;

        case 'assert_visible':
            const content = await page.content();
            if (!content.includes(value)) {
                throw new Error(`Text "${value}" not found on page`);
            }
            break;

        case 'assert_url':
            const url = page.url();
            if (!url.includes(value)) {
                throw new Error(`URL "${url}" does not contain "${value}"`);
            }
            break;

        case 'wait':
            await page.waitForTimeout(value);
            break;

        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

// Main: run a spec file
const specPath = process.argv[2];
if (!specPath) {
    console.log('Usage: node run-spec.js <spec.yaml>');
    process.exit(1);
}

runSpec(path.resolve(specPath))
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
