#!/usr/bin/env node

/**
 * Check what routes Express has registered
 */

const express = require('express');

// Load the actual server
require('./server.js');

// After a delay, check what routes exist
setTimeout(() => {
  console.log('\n=== Checking registered routes ===\n');

  // This won't work because app is private, but let's try a different approach
  const fs = require('fs');
  const content = fs.readFileSync('server.js', 'utf8');

  // Find all app.get, app.post calls
  const routes = content.match(/^app\.(get|post|put|delete)\(['"])/gm);
  console.log(`Found ${routes.length} routes in server.js:`);
  routes.slice(0, 20).forEach(r => console.log('  ' + r));

  // Specifically check for /api/crawl
  const crawlRoute = routes.find(r => r.includes('/api/crawl'));
  if (crawlRoute) {
    console.log('\n✅ /api/crawl route IS DEFINED in the code');
  } else {
    console.log('\n❌ /api/crawl route NOT FOUND in the code');
  }

}, 1000);
