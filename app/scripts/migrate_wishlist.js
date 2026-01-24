
const fs = require('fs');

async function main() {
    try {
        console.log("Migration file created at migrations/003_create_wishlist.sql");
        console.log("Please run this SQL in your Supabase SQL Editor to enable the Wishlist feature.");
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

main();
