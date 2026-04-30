const API_KEY = 'AIzaSyDdGA33ML6QtSNKCdLRRY16u4QNinZPujM';
const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.0-flash'];

async function test() {
    for (let m of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
            });
            console.log(m, res.status);
        } catch (e) {
            console.log(m, 'Error', e.message);
        }
    }
}
test();
