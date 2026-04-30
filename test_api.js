const API_KEY = 'AIzaSyDdGA33ML6QtSNKCdLRRY16u4QNinZPujM';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
    })
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(res => console.log(JSON.stringify(res, null, 2)))
.catch(err => console.error(err));
