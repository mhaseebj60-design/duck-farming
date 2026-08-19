import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const DEFAULT_SETTINGS = {
  price: 1500,
  eggs: 1,
  lifetime: 80,
  status: "Active",
};

const DEFAULT_CUSTOMERS = [
  {
    id: 1,
    name: "Demo Customer",
    email: "customer@example.com",
    ducks: 1,
    eggs: 0,
    earnings: 0,
  },
];

const DEFAULT_PAYMENTS = [
  {
    id: 1,
    customer: "Demo Customer",
    email: "customer@example.com",
    amount: 1500,
    status: "Pending",
    date: new Date().toLocaleDateString(),
  },
];

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [customers, setCustomers] = useState(DEFAULT_CUSTOMERS);
  const [payments, setPayments] = useState(DEFAULT_PAYMENTS);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    loadSavedData();

    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  function loadSavedData() {
    try {
      const savedSettings = localStorage.getItem("duck_settings");
      const savedCustomers = localStorage.getItem("duck_customers");
      const savedPayments = localStorage.getItem("duck_payments");

      if (savedSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...JSON.parse(savedSettings),
        });
      }

      if (savedCustomers) {
        setCustomers(JSON.parse(savedCustomers));
      }

      if (savedPayments) {
        setPayments(JSON.parse(savedPayments));
      }
    } catch (error) {
      console.error("Could not load saved data:", error);
    }
  }

  function saveSettings(updatedSettings) {
    setSettings(updatedSettings);
    localStorage.setItem("duck_settings", JSON.stringify(updatedSettings));
    showMessage("Website settings saved successfully.");
  }

  function saveCustomers(updatedCustomers) {
    setCustomers(updatedCustomers);
    localStorage.setItem("duck_customers", JSON.stringify(updatedCustomers));
  }

  function savePayments(updatedPayments) {
    setPayments(updatedPayments);
    localStorage.setItem("duck_payments", JSON.stringify(updatedPayments));
  }

  function showMessage(text) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    setLoginError("");

    if (!supabase) {
      setLoginError(
        "Supabase is not configured correctly. Check src/supabaseClient.js."
      );
      return;
    }

    if (!adminEmail || !adminPassword) {
      setLoginError("Enter your admin email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      setLoginError(error.message);
      return;
    }

    setUser(data.user);
    setAdminEmail("");
    setAdminPassword("");
    setPage("admin");
    showMessage("Admin login successful.");
  }

  async function handleAdminLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setPage("home");
  }

  function updateSetting(field, value) {
    const updated = {
      ...settings,
      [field]: value,
    };

    saveSettings(updated);
  }

  function addCustomer(event) {
    event.preventDefault();

    if (!newCustomer.name.trim() || !newCustomer.email.trim()) {
      showMessage("Enter customer name and email.");
      return;
    }

    const customer = {
      id: Date.now(),
      name: newCustomer.name.trim(),
      email: newCustomer.email.trim(),
      ducks: 0,
      eggs: 0,
      earnings: 0,
    };

    const updated = [...customers, customer];

    saveCustomers(updated);

    setNewCustomer({
      name: "",
      email: "",
    });

    showMessage("Customer added.");
  }

  function deleteCustomer(id) {
    const updated = customers.filter((customer) => customer.id !== id);
    saveCustomers(updated);
    showMessage("Customer removed.");
  }

  function updateCustomer(id, field, value) {
    const updated = customers.map((customer) =>
      customer.id === id
        ? {
            ...customer,
            [field]: Number(value),
          }
        : customer
    );

    saveCustomers(updated);
  }

  function approvePayment(id) {
    const payment = payments.find((item) => item.id === id);

    if (!payment) return;

    const updatedPayments = payments.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "Approved",
          }
        : item
    );

    savePayments(updatedPayments);

    const customer = customers.find(
      (item) => item.email === payment.email
    );

    if (customer) {
      const updatedCustomers = customers.map((item) =>
        item.email === payment.email
          ? {
              ...item,
              ducks: item.ducks + 1,
            }
          : item
      );

      saveCustomers(updatedCustomers);
    }

    showMessage("Payment approved.");
  }

  function rejectPayment(id) {
    const updated = payments.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "Rejected",
          }
        : item
    );

    savePayments(updated);
    showMessage("Payment rejected.");
  }

  function addDemoPayment() {
    const customer = customers[0];

    if (!customer) {
      showMessage("Add a customer first.");
      return;
    }

    const payment = {
      id: Date.now(),
      customer: customer.name,
      email: customer.email,
      amount: settings.price,
      status: "Pending",
      date: new Date().toLocaleDateString(),
    };

    savePayments([...payments, payment]);
    showMessage("Payment added.");
  }

  function isAdmin() {
    return Boolean(user);
  }

  if (page === "admin" && !isAdmin()) {
    return (
      <AdminLogin
        email={adminEmail}
        password={adminPassword}
        setEmail={setAdminEmail}
        setPassword={setAdminPassword}
        error={loginError}
        onLogin={handleAdminLogin}
        onBack={() => setPage("home")}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div
          className="brand"
          onClick={() => setPage("home")}
          role="button"
          tabIndex={0}
        >
          <span className="brand-icon">🦆</span>

          <div>
            <strong>Duck Farming</strong>
            <small>SMART DUCK FARMING</small>
          </div>
        </div>

        <nav className="navigation">
          <button onClick={() => setPage("home")}>Home</button>

          {user ? (
            <>
              <button onClick={() => setPage("admin")}>Admin Dashboard</button>
              <button className="logout-button" onClick={handleAdminLogout}>
                Logout
              </button>
            </>
          ) : (
            <button
              className="login-button"
              onClick={() => {
                setPage("admin");
                setLoginError("");
              }}
            >
              Admin Login
            </button>
          )}
        </nav>
      </header>

      {message && <div className="toast">{message}</div>}

      {page === "home" ? (
        <HomePage settings={settings} onAdmin={() => setPage("admin")} />
      ) : (
        <AdminDashboard
          settings={settings}
          updateSetting={updateSetting}
          customers={customers}
          addCustomer={addCustomer}
          newCustomer={newCustomer}
          setNewCustomer={setNewCustomer}
          deleteCustomer={deleteCustomer}
          updateCustomer={updateCustomer}
          payments={payments}
          approvePayment={approvePayment}
          rejectPayment={rejectPayment}
          addDemoPayment={addDemoPayment}
          onLogout={handleAdminLogout}
        />
      )}

      <footer className="site-footer">
        <p>© 2026 Duck Farming. All rights reserved.</p>
      </footer>
    </div>
  );
}

function AdminLogin({
  email,
  password,
  setEmail,
  setPassword,
  error,
  onLogin,
  onBack,
}) {
  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-logo">🦆</div>

        <h1>Admin Login</h1>

        <p className="login-subtitle">
          Sign in to manage your Duck Farming website.
        </p>

        <form onSubmit={onLogin}>
          <label>Admin Email</label>

          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <div className="error-box">{error}</div>}

          <button className="primary-button" type="submit">
            Login to Dashboard
          </button>
        </form>

        <button className="back-button" onClick={onBack}>
          ← Back to Website
        </button>
      </div>
    </div>
  );
}

function HomePage({ settings, onAdmin }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-text">
          <span className="badge">DUCK FARMING PLATFORM</span>

          <h1>
            Own a duck.
            <br />
            <span>Earn eggs every 24 hours.</span>
          </h1>

          <p>
            Buy a premium duck, submit payment proof, and let the system track
            its lifetime and egg production.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() => alert("Farming purchase flow can be connected next.")}
            >
              🛒 Start Farming
            </button>

            <button
              className="secondary-button"
              onClick={() => alert("Customer login can be connected next.")}
            >
              Customer Login
            </button>
          </div>
        </div>

        <div className="duck-image">🦆</div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>🥚</span>
          <div>
            <strong>{settings.eggs} egg</strong>
            <small>every 24 hours</small>
          </div>
        </div>

        <div className="stat-card">
          <span>📅</span>
          <div>
            <strong>{settings.lifetime} days</strong>
            <small>duck lifetime</small>
          </div>
        </div>

        <div className="stat-card">
          <span>🛡️</span>
          <div>
            <strong>Admin review</strong>
            <small>payment approval</small>
          </div>
        </div>

        <div className="stat-card">
          <span>💰</span>
          <div>
            <strong>Egg wallet</strong>
            <small>track earnings</small>
          </div>
        </div>
      </section>

      <section className="product-section">
        <div className="section-heading">
          <div>
            <small>AVAILABLE NOW</small>
            <h2>Premium Duck</h2>
          </div>

          <span
            className={
              settings.status === "Active"
                ? "status-active"
                : "status-inactive"
            }
          >
            {settings.status}
          </span>
        </div>

        <div className="product-card">
          <div className="product-duck">🦆</div>

          <div className="product-info">
            <h3>Premium Duck</h3>

            <p>
              One duck · {settings.lifetime}-day lifetime ·{" "}
              {settings.eggs} egg every 24 hours
            </p>
          </div>

          <div className="product-price">
            <small>Current price</small>
            <strong>Rs {Number(settings.price).toLocaleString()}</strong>

            <button
              disabled={settings.status !== "Active"}
              onClick={() =>
                alert(
                  settings.status === "Active"
                    ? "Purchase flow can be connected next."
                    : "Duck farming is currently inactive."
                )
              }
            >
              {settings.status === "Active" ? "Get Started →" : "Unavailable"}
            </button>
          </div>
        </div>
      </section>

      <section className="info-section">
        <h2>How Duck Farming Works</h2>

        <div className="info-grid">
          <div>
            <span>1</span>
            <h3>Buy a Duck</h3>
            <p>Choose the available premium duck package.</p>
          </div>

          <div>
            <span>2</span>
            <h3>Submit Payment</h3>
            <p>Send your payment proof for admin review.</p>
          </div>

          <div>
            <span>3</span>
            <h3>Earn Eggs</h3>
            <p>
              Your duck produces {settings.eggs} egg every 24 hours during its{" "}
              {settings.lifetime}-day lifetime.
            </p>
          </div>
        </div>
      </section>

      {!onAdmin && null}
    </main>
  );
}

function AdminDashboard({
  settings,
  updateSetting,
  customers,
  addCustomer,
  newCustomer,
  setNewCustomer,
  deleteCustomer,
  updateCustomer,
  payments,
  approvePayment,
  rejectPayment,
  addDemoPayment,
  onLogout,
}) {
  const pendingPayments = payments.filter(
    (payment) => payment.status === "Pending"
  ).length;

  const approvedPayments = payments.filter(
    (payment) => payment.status === "Approved"
  ).length;

  const totalEarnings = customers.reduce(
    (total, customer) => total + Number(customer.earnings || 0),
    0
  );

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="badge">ADMIN AREA</span>
          <h1>Admin Dashboard</h1>
          <p>Manage your Duck Farming website from one place.</p>
        </div>

        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <section className="admin-stats">
        <div className="admin-stat">
          <span>🦆</span>
          <strong>{customers.length}</strong>
          <small>Customers</small>
        </div>

        <div className="admin-stat">
          <span>💳</span>
          <strong>{pendingPayments}</strong>
          <small>Pending Payments</small>
        </div>

        <div className="admin-stat">
          <span>✅</span>
          <strong>{approvedPayments}</strong>
          <small>Approved Payments</small>
        </div>

        <div className="admin-stat">
          <span>💰</span>
          <strong>Rs {totalEarnings.toLocaleString()}</strong>
          <small>Total Earnings</small>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Duck Settings</h2>
            <p>These settings control what customers see on the website.</p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="setting-item">
            <label>Duck Price (Rs)</label>

            <input
              type="number"
              min="0"
              value={settings.price}
              onChange={(event) =>
                updateSetting("price", Number(event.target.value))
              }
            />
          </div>

          <div className="setting-item">
            <label>Eggs Every 24 Hours</label>

            <input
              type="number"
              min="0"
              value={settings.eggs}
              onChange={(event) =>
                updateSetting("eggs", Number(event.target.value))
              }
            />
          </div>

          <div className="setting-item">
            <label>Duck Lifetime (Days)</label>

            <input
              type="number"
              min="1"
              value={settings.lifetime}
              onChange={(event) =>
                updateSetting("lifetime", Number(event.target.value))
              }
            />
          </div>

          <div className="setting-item">
            <label>Farming Status</label>

            <select
              value={settings.status}
              onChange={(event) =>
                updateSetting("status", event.target.value)
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Customer Management</h2>
            <p>Add customers and manage their duck and egg balances.</p>
          </div>
        </div>

        <form className="customer-form" onSubmit={addCustomer}>
          <input
            type="text"
            placeholder="Customer name"
            value={newCustomer.name}
            onChange={(event) =>
              setNewCustomer({
                ...newCustomer,
                name: event.target.value,
              })
            }
          />

          <input
            type="email"
            placeholder="Customer email"
            value={newCustomer.email}
            onChange={(event) =>
              setNewCustomer({
                ...newCustomer,
                email: event.target.value,
              })
            }
          />

          <button className="primary-button" type="submit">
            + Add Customer
          </button>
        </form>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Ducks</th>
                <th>Eggs</th>
                <th>Earnings</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>

                  <td>
                    <input
                      className="small-input"
                      type="number"
                      min="0"
                      value={customer.ducks}
                      onChange={(event) =>
                        updateCustomer(
                          customer.id,
                          "ducks",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      className="small-input"
                      type="number"
                      min="0"
                      value={customer.eggs}
                      onChange={(event) =>
                        updateCustomer(
                          customer.id,
                          "eggs",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      className="small-input"
                      type="number"
                      min="0"
                      value={customer.earnings}
                      onChange={(event) =>
                        updateCustomer(
                          customer.id,
                          "earnings",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <button
                      className="danger-button"
                      onClick={() => deleteCustomer(customer.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>Payment Management</h2>
            <p>Review customer payments and approve or reject them.</p>
          </div>

          <button className="secondary-button" onClick={addDemoPayment}>
            + Add Test Payment
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.customer}</td>
                    <td>{payment.email}</td>
                    <td>Rs {Number(payment.amount).toLocaleString()}</td>
                    <td>{payment.date}</td>

                    <td>
                      <span
                        className={
                          payment.status === "Approved"
                            ? "payment-approved"
                            : payment.status === "Rejected"
                            ? "payment-rejected"
                            : "payment-pending"
                        }
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td>
                      {payment.status === "Pending" ? (
                        <div className="action-buttons">
                          <button
                            className="approve-button"
                            onClick={() => approvePayment(payment.id)}
                          >
                            Approve
                          </button>

                          <button
                            className="danger-button"
                            onClick={() => rejectPayment(payment.id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="completed-text">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card warning-card">
        <h2>Important</h2>

        <p>
          The settings, customers and payments in this version are saved in
          this browser using localStorage. They are useful for testing the
          dashboard, but they are not yet shared with other customers.
        </p>

        <p>
          For a real production system, these records should be moved into
          Supabase tables with proper admin permissions and Row Level Security.
        </p>
      </section>
    </main>
  );
}

export default App;
