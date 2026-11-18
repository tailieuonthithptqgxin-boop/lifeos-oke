async function test() {
  const r = await fetch('http://localhost:3000/');
  const html = await r.text();
  console.log('Status:', r.status);
  const re = /src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    console.log('Script src:', m[1]);
  }
}
test().catch(console.error);
