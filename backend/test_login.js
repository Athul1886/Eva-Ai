

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'althaf11@gmail.com', password: 'password123' })
    });
    console.log(res.status);
    console.log(await res.json());
  } catch (err) {
    console.error(err);
  }
}
test();
