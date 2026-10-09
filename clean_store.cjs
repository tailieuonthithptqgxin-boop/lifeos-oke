const fs = require('fs');
let code = fs.readFileSync('src/lib/store.tsx', 'utf8');

// There are duplicate keys at the end of the return statement
code = code.replace(/markNotificationRead,\n\s*clearAllNotifications,\n\s*completeTaskWithLinks,\n\s*removeFromCart,\n\s*addToCart,\n\s*checkout,\n\s*upgradePlan/g, "");

fs.writeFileSync('src/lib/store.tsx', code);
console.log("Store cleaned.");
