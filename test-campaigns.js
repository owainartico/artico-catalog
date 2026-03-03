const https = require('https');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('zoho-credentials.json', 'utf8'));

// Get access token
const tokenData = new URLSearchParams({
  refresh_token: creds.refresh_token,
  client_id: creds.client_id,
  client_secret: creds.client_secret,
  grant_type: 'refresh_token'
}).toString();

const tokenReq = https.request('https://accounts.zoho.com/oauth/v2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': tokenData.length
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tokenResp = JSON.parse(data);
    if (tokenResp.access_token) {
      // Get mailing lists
      const apiReq = https.request('https://campaigns.zoho.com/api/v1.1/getmailinglists?resfmt=JSON', {
        method: 'GET',
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokenResp.access_token}`
        }
      }, (apiRes) => {
        let apiData = '';
        apiRes.on('data', chunk => apiData += chunk);
        apiRes.on('end', () => {
          console.log('MAILING LISTS:');
          console.log(apiData);
        });
      });
      apiReq.end();
    } else {
      console.error('Token error:', data);
    }
  });
});

tokenReq.write(tokenData);
tokenReq.end();
