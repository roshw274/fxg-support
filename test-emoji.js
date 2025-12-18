// Test file to verify emoji IDs
// Run this with: node test-emoji.js

const EMOJI = require('./emoji');

console.log('Testing emoji IDs from emoji.js:\n');

for (const [name, emoji] of Object.entries(EMOJI)) {
    console.log(`${name}: ${emoji}`);
}

console.log('\n✅ If you see the emoji codes above, the emoji.js file is working correctly.');
console.log('⚠️  If emojis don\'t display in Discord, the bot needs to be in the server where these emojis exist.');
console.log('\nTo fix emoji display issues:');
console.log('1. Make sure the bot is in the server that has these custom emojis');
console.log('2. Verify the emoji IDs match your server\'s emoji IDs');
console.log('3. Check that the emojis haven\'t been deleted from your server');
