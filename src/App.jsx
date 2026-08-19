function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="logo">🦆</div>
        <h1>Duck Farming</h1>
        <p>Welcome to our Duck Farming website</p>
      </header>

      <main className="content">
        <section className="hero">
          <h2>Welcome to Duck Farming</h2>
          <p>
            Learn about duck farming, feeding, care, housing and healthy
            duck production.
          </p>

          <button>Explore Duck Farming</button>
        </section>

        <section className="cards">
          <div className="card">
            <div className="icon">🏠</div>
            <h3>Duck Housing</h3>
            <p>Learn how to provide a safe and comfortable home for ducks.</p>
          </div>

          <div className="card">
            <div className="icon">🌾</div>
            <h3>Duck Feeding</h3>
            <p>Understand proper nutrition and feeding for healthy ducks.</p>
          </div>

          <div className="card">
            <div className="icon">💧</div>
            <h3>Duck Care</h3>
            <p>Simple tips for keeping your ducks healthy and active.</p>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2026 Duck Farming. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
