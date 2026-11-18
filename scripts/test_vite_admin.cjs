async function test() {
  const r = await fetch('http://localhost:3000/src/components/AdminView.tsx');
  console.log('Status AdminView:', r.status);
  const text = await r.text();
  console.log('Length:', text.length);
  if (r.status !== 200) {
    console.log('Error text:', text);
  }
}
test().catch(console.error);
