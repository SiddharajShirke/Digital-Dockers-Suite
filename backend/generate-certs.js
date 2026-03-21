const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, '..', 'ssl');
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
}

const attrs = [{ name: 'commonName', value: 'localhost' }];

(async () => {
    try {
        const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });
        // if selfsigned.generate is async in this version
        const result = pems.then ? await pems : pems;
        
        fs.writeFileSync(path.join(sslDir, 'cert.pem'), result.cert);
        fs.writeFileSync(path.join(sslDir, 'key.pem'), result.private);
        
        console.log('SSL certificates generated successfully in ' + sslDir);
    } catch (error) {
        console.error('Error generating certs:', error);
    }
})();
