import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const money = (v) => `Rs ${Number(v || 0).toLocaleString()}`;
const dateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next?.user) await loadProfile(next.user.id);
      else setProfile(null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    // Use the SECURITY DEFINER RPC first so profile RLS cannot block role detection.
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_profile");
    if (!rpcError && rpcData) {
      const p = Array.isArray(rpcData) ? (rpcData[0] || null) : rpcData;
      setProfile(p);
      return p;
    }

    // Fallback for projects where the RPC has not been deployed yet.
    const { data: fallback } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const p = fallback || null;
    setProfile(p);
    return p;
  }

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPage("home");
    flash("You are signed out.");
  }

  async function submitAuth(e) {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "phone") {
        if (!authPhone.trim()) throw new Error("Enter your phone number.");
        const { error } = await supabase.auth.signInWithOtp({ phone: authPhone.trim() });
        if (error) throw error;
        flash("OTP sent. Check your phone.");
        return;
      }

      if (!authEmail.trim() || !authPassword) throw new Error("Enter email and password.");

      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: { full_name: fullName.trim(), referral_code: referralCode.trim().toUpperCase() }
          }
        });
        if (error) throw error;
        if (data.user && data.session) {
          await loadProfile(data.user.id);
          setShowCustomerAuth(false);
          setPage("customer");
          flash("Account created.");
        } else {
          flash("Account created. Check your email if confirmation is enabled.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
        if (data.user) {
          const p = await loadProfile(data.user.id);
          setShowCustomerAuth(false);
          if (p?.role === "admin") {
            setPage("admin");
            flash("Welcome to Admin.");
          } else {
            setPage("customer");
            flash("Welcome back.");
          }
        }
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    }
  }

  if (loading) return <Splash />;

  const isAdmin = profile?.role === "admin";
  const isCustomer = Boolean(session?.user && profile && profile.role !== "admin");

  return (
    <div className="site">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>
          <span className="brand-mark">🦆</span>
          <span><b>DUCKORA</b><small>Premium Duck Farming</small></span>
        </button>
        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          {isCustomer && <button onClick={() => setPage("customer")}>My Farm</button>}
          {isAdmin && <button onClick={() => setPage("admin")}>Admin</button>}
          {!session && <button className="nav-cta" onClick={() => { setShowCustomerAuth(true); setAuthMode("login"); }}>Customer Login</button>}
          {!isAdmin && <button className="nav-ghost" onClick={() => setPage("admin")}>Admin Login</button>}
          {session && <button className="nav-ghost" onClick={signOut}>Logout</button>}
        </nav>
      </header>

      {notice && <div className="toast">{notice}</div>}

      {page === "admin" && !isAdmin ? (
        <AdminGate onBack={() => setPage("home")} />
      ) : page === "admin" ? (
        <AdminDashboard flash={flash} />
      ) : page === "customer" && isCustomer ? (
        <CustomerDashboard profile={profile} session={session} flash={flash} />
      ) : (
        <Home onStart={() => {
          if (isCustomer) setPage("customer");
          else { setShowCustomerAuth(true); setAuthMode("register"); }
        }} />
      )}

      <footer>
        <div><span className="brand-mark small">🦆</span> DUCKORA</div>
        <span>Secure farming dashboard • 2026</span>
      </footer>

      {showCustomerAuth && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          email={authEmail}
          setEmail={setAuthEmail}
          phone={authPhone}
          setPhone={setAuthPhone}
          password={authPassword}
          setPassword={setAuthPassword}
          name={fullName}
          setName={setFullName}
          referral={referralCode}
          setReferral={setReferralCode}
          error={authError}
          setError={setAuthError}
          onSubmit={submitAuth}
          onClose={() => setShowCustomerAuth(false)}
        />
      )}
    </div>
  );
}

function Splash() {
  return <div className="splash"><div className="splash-duck">🦆</div><h1>DUCKORA</h1><p>Preparing your farm...</p></div>;
}

function Home({ onStart }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">THE PREMIUM DIGITAL FARM</span>
          <h1>Own a duck.<br /><em>Grow your egg balance.</em></h1>
          <p>Choose from admin-created ducks, submit payment proof, receive your first egg after approval, and keep earning according to each duck's lifetime and egg schedule.</p>
          <div className="hero-actions">
            <button className="btn primary" onClick={onStart}>Start Farming <span>→</span></button>
            <button className="btn outline" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>How it works</button>
          </div>
          <div className="trust-row"><span>✓ Secure account</span><span>✓ Admin verified payments</span><span>✓ Withdrawable egg balance</span></div>
        </div>
        <div className="hero-art">
          <div className="glow"></div>
          <div className="duck-orb">🦆</div>
          <div className="floating-card top"><b>+1</b><span>Egg / 24h</span></div>
          <div className="floating-card bottom"><b>80</b><span>Days example</span></div>
        </div>
      </section>

      <section className="feature-strip">
        <Feature icon="🥚" title="Daily eggs" text="Each active duck follows its configured egg interval." />
        <Feature icon="🛡️" title="Verified payments" text="Every purchase is reviewed by your admin." />
        <Feature icon="↗" title="Referral rewards" text="A qualifying referral unlocks 1 egg/day for 3 days." />
        <Feature icon="💳" title="Withdraw" text="Use admin-defined egg rates and payment details." />
      </section>

      <section id="how" className="section">
        <div className="section-head"><span className="eyebrow">SIMPLE PROCESS</span><h2>From purchase to payout</h2></div>
        <div className="steps">
          <Step n="01" title="Create account" text="Register with email/password or use phone OTP when configured." />
          <Step n="02" title="Choose a duck" text="See the current names, prices, lifetime and egg interval set by admin." />
          <Step n="03" title="Pay & submit TID" text="Select a payment method and upload your payment slip." />
          <Step n="04" title="Get approved" text="Admin approval activates the duck and immediately credits 1 egg." />
          <Step n="05" title="Earn & withdraw" text="Eggs go to your wallet, including qualifying referral rewards." />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }) {
  return <article className="feature"><div className="feature-icon">{icon}</div><div><b>{title}</b><p>{text}</p></div></article>;
}
function Step({ n, title, text }) {
  return <article className="step"><span>{n}</span><h3>{title}</h3><p>{text}</p></article>;
}

function AuthModal(props) {
  const { mode, setMode, email, setEmail, phone, setPhone, password, setPassword, name, setName, referral, setReferral, error, onSubmit, onClose } = props;
  const phoneMode = mode === "phone";
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal auth-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <span className="eyebrow">CUSTOMER ACCESS</span>
        <h2>{phoneMode ? "Phone OTP" : mode === "register" ? "Create your farm account" : "Welcome back"}</h2>
        <p className="muted">{phoneMode ? "Enter your phone number and receive a verification code." : "Your farm, wallet, ducks and referrals stay tied to your account."}</p>
        <form onSubmit={onSubmit}>
          {mode === "register" && !phoneMode && <>
            <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
            <label>Referral ID (optional)<input value={referral} onChange={e => setReferral(e.target.value.toUpperCase())} placeholder="DUCK-XXXXXX" /></label>
          </>}
          {phoneMode ? (
            <label>Phone number<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92..." /></label>
          ) : (
            <>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></label>
            </>
          )}
          {error && <div className="error">{error}</div>}
          <button className="btn primary wide" type="submit">{phoneMode ? "Send OTP" : mode === "register" ? "Create account" : "Login"}</button>
        </form>
        <div className="auth-switch">
          {!phoneMode && <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create a new account" : "I already have an account"}</button>}
          <button onClick={() => setMode(phoneMode ? "login" : "phone")}>{phoneMode ? "Use email instead" : "Use phone OTP"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminGate({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!email.trim() || !password) throw new Error("Enter admin email and password.");

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (err) throw err;
      if (!data?.user) throw new Error("Login succeeded but no user session was returned.");

      const { data: rpcData, error: roleError } = await supabase.rpc("get_my_role");
      if (roleError) throw new Error(`Admin role check failed: ${roleError.message}`);

      const role = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (role !== "admin") {
        await supabase.auth.signOut();
        setError("This account is not an admin account.");
        return;
      }

      const p = await loadAdminProfile(data.user.id);
      if (p) {
        window.location.reload();
      } else {
        setError("Admin role verified, but the admin profile could not be loaded.");
        await supabase.auth.signOut();
      }
    } catch (err) {
      await supabase.auth.signOut().catch(() => {});
      setError(err.message || "Admin authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminProfile(userId) {
    const { data, error } = await supabase.rpc("get_my_profile");
    if (!error && data) return Array.isArray(data) ? (data[0] || null) : data;
    const { data: fallback } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return fallback || null;
  }

  return <main className="admin-gate"><div className="login-panel"><div className="brand-mark huge">🦆</div><span className="eyebrow">PRIVATE AREA</span><h1>Admin control center</h1><p className="muted">Manage ducks, payments, customers, referrals and withdrawals.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <div className="error">{error}</div>}<button className="btn primary wide" disabled={busy}>{busy ? "Signing in..." : "Enter Admin"}</button></form><button className="text-btn" onClick={onBack}>← Back to website</button></div></main>;
}

function CustomerDashboard({ profile, session, flash }) {
  const [ducks, setDucks] = useState([]);
  const [methods, setMethods] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, total_eggs: 0 });
  const [withdrawalOptions, setWithdrawalOptions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [buyDuck, setBuyDuck] = useState(null);
  const [buyForm, setBuyForm] = useState({ method: "", tid: "", slip: null });
  const [withdrawForm, setWithdrawForm] = useState({ option: "", eggs: "", payment_method: "JazzCash", account_holder_name: "", account_number: "" });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");

  const load = async () => {
    await supabase.rpc("claim_due_referral_eggs");
    const [{ data: d }, { data: m }, { data: p }, { data: w }, { data: o }, { data: wr }, { data: r }] = await Promise.all([
      supabase.from("ducks").select("*").eq("active", true).order("created_at"),
      supabase.from("payment_methods").select("*").eq("active", true).order("created_at"),
      supabase.from("duck_purchases").select("*, ducks(name,price,lifetime_days,egg_interval_hours)").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("egg_wallets").select("*").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("withdrawal_options").select("*").eq("active", true).order("min_eggs"),
      supabase.from("withdrawal_requests").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("referral_rewards").select("*").eq("referrer_id", session.user.id).order("created_at", { ascending: false })
    ]);
    setDucks(d || []); setMethods(m || []); setPurchases(p || []); setWallet(w || { balance: 0, total_eggs: 0 }); setWithdrawalOptions(o || []); setWithdrawals(wr || []); setReferrals(r || []);
  };

  useEffect(() => { load(); }, [session.user.id]);

  async function submitPurchase(e) {
    e.preventDefault(); if (!buyDuck) return;
    if (!buyForm.method || !buyForm.tid.trim() || !buyForm.slip) return flash("Select payment method, enter TID and upload the payment slip.");
    setBusy(true);
    try {
      const ext = buyForm.slip.name.split(".").pop() || "jpg";
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payment-slips").upload(path, buyForm.slip, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: purchase, error: pe } = await supabase.from("duck_purchases").insert({
        user_id: session.user.id, duck_id: buyDuck.id, amount: buyDuck.price, status: "pending"
      }).select().single();
      if (pe) throw pe;
      const { error } = await supabase.from("payment_requests").insert({
        user_id: session.user.id, duck_purchase_id: purchase.id, amount: buyDuck.price,
        payment_method: buyForm.method, transaction_id: buyForm.tid.trim(), payment_slip_path: path, status: "pending"
      });
      if (error) throw error;
      setBuyDuck(null); setBuyForm({ method: "", tid: "", slip: null }); flash("Payment proof submitted. Wait for admin approval."); await load();
    } catch (err) { flash(err.message || "Could not submit purchase."); }
    setBusy(false);
  }

  async function submitWithdrawal(e) {
    e.preventDefault();
    const option = withdrawalOptions.find(x => String(x.id) === String(withdrawForm.option));
    const eggs = Number(withdrawForm.eggs);
    if (!option) return flash("Choose a withdrawal rate.");
    if (!Number.isInteger(eggs) || eggs < option.min_eggs || eggs > option.max_eggs) return flash(`Enter ${option.min_eggs}–${option.max_eggs} eggs.`);
    if (eggs > Number(wallet.balance)) return flash("You do not have enough eggs.");
    if (!withdrawForm.account_holder_name.trim() || !withdrawForm.account_number.trim()) return flash("Enter account holder name and account number.");
    setBusy(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: session.user.id, eggs, rate_per_egg: option.rate_per_egg,
      amount: eggs * option.rate_per_egg, payment_method: withdrawForm.payment_method,
      account_holder_name: withdrawForm.account_holder_name.trim(), account_number: withdrawForm.account_number.trim(), status: "pending"
    });
    setBusy(false);
    if (error) flash(error.message); else { flash("Withdrawal request sent to admin."); setWithdrawForm({ option: "", eggs: "", payment_method: "JazzCash", account_holder_name: "", account_number: "" }); await load(); }
  }

  const selectedOption = withdrawalOptions.find(x => String(x.id) === String(withdrawForm.option));
  const active = purchases.filter(p => p.status === "active");

  return <main className="dashboard">
    <div className="dash-heading">
      <div><span className="eyebrow">MY FARM</span><h1>Hello, {profile.full_name || "Farmer"}</h1><p>Your customer ID: <b>{profile.customer_id || "Generating..."}</b></p></div>
      <div className="ref-box"><small>YOUR REFERRAL ID</small><b>{profile.customer_id}</b><button onClick={() => navigator.clipboard?.writeText(profile.customer_id)}>Copy</button></div>
    </div>

    <div className="dash-tabs">{["overview","buy","withdraw","referrals","history"].map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>

    {tab === "overview" && <><div className="metric-grid"><Metric title="Egg balance" value={wallet.balance} suffix="eggs" icon="🥚" /><Metric title="Lifetime eggs" value={wallet.total_eggs} suffix="eggs earned" icon="📈" /><Metric title="Active ducks" value={active.length} suffix="ducks" icon="🦆" /><Metric title="Referrals" value={referrals.length} suffix="qualifying rewards" icon="↗" /></div><section className="panel"><div className="panel-head"><h2>Active ducks</h2><button className="btn primary small" onClick={() => setTab("buy")}>Buy another duck</button></div>{active.length ? <div className="card-grid">{active.map(p => <DuckCard key={p.id} purchase={p} active />)}</div> : <Empty title="No active ducks yet" text="Choose a duck and submit your payment proof to start farming." action="Browse ducks" onClick={() => setTab("buy")} />}</section></>}

    {tab === "buy" && <section className="panel"><div className="panel-head"><div><span className="eyebrow">AVAILABLE NOW</span><h2>Choose your duck</h2></div></div><div className="card-grid">{ducks.map(d => <div className="duck-card" key={d.id}><div className="duck-visual">🦆</div><span className="pill">ACTIVE</span><h3>{d.name}</h3><div className="price">{money(d.price)}</div><div className="specs"><span>🥚 {d.egg_interval_hours}h</span><span>📅 {d.lifetime_days} days</span></div><button className="btn primary wide" onClick={() => setBuyDuck(d)}>Buy this duck</button></div>)}</div>{!ducks.length && <Empty title="No ducks are available" text="Admin has not published an active duck yet." />}</section>}

    {tab === "withdraw" && <section className="panel narrow"><span className="eyebrow">EGG PAYOUT</span><h2>Withdraw eggs</h2><p className="muted">Balance available: <b>{wallet.balance} eggs</b>. Choose one of the live rates set by admin.</p><form className="form-grid" onSubmit={submitWithdrawal}><label>Rate range<select value={withdrawForm.option} onChange={e => setWithdrawForm({ ...withdrawForm, option: e.target.value })}><option value="">Select rate</option>{withdrawalOptions.map(o => <option key={o.id} value={o.id}>{o.min_eggs}–{o.max_eggs} eggs • {money(o.rate_per_egg)}/egg</option>)}</select></label><label>Eggs to withdraw<input type="number" min="1" value={withdrawForm.eggs} onChange={e => setWithdrawForm({ ...withdrawForm, eggs: e.target.value })} placeholder={selectedOption ? `${selectedOption.min_eggs}–${selectedOption.max_eggs}` : "Amount"} /></label><label>Payment method<select value={withdrawForm.payment_method} onChange={e => setWithdrawForm({ ...withdrawForm, payment_method: e.target.value })}><option>JazzCash</option><option>Easypaisa</option><option>Bank Account</option></select></label><label>Account holder name<input value={withdrawForm.account_holder_name} onChange={e => setWithdrawForm({ ...withdrawForm, account_holder_name: e.target.value })} /></label><label className="full">Account number<input value={withdrawForm.account_number} onChange={e => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })} placeholder="Your receiving account number" /></label>{selectedOption && <div className="payout-preview"><span>{withdrawForm.eggs || 0} eggs × {money(selectedOption.rate_per_egg)}</span><b>{money(Number(withdrawForm.eggs || 0) * Number(selectedOption.rate_per_egg))}</b></div>}<button className="btn primary wide full" disabled={busy}>{busy ? "Sending..." : "Send withdrawal request"}</button></form><div className="request-list">{withdrawals.map(w => <RequestRow key={w.id} title={`${w.eggs} eggs • ${money(w.amount)}`} status={w.status} sub={`${w.payment_method} • ${w.account_number} • ${dateTime(w.created_at)}`} />)}</div></section>}

    {tab === "referrals" && <section className="panel"><div className="referral-hero"><div><span className="eyebrow">QUALIFYING REFERRALS</span><h2>Invite farmers. Earn referral eggs.</h2><p>Share your Customer ID. Your referred person must buy at least one duck and have that payment approved. Then you receive <b>1 egg every 24 hours for 3 days</b>. These referral eggs enter your normal balance and can be withdrawn.</p></div><div className="big-ref">{profile.customer_id}<button onClick={() => navigator.clipboard?.writeText(profile.customer_id)}>Copy ID</button></div></div><div className="request-list">{referrals.length ? referrals.map(r => <RequestRow key={r.id} title={`${r.earned_eggs || 0} / 3 referral eggs credited`} status={r.status} sub={`Starts ${dateTime(r.starts_at)} • ${dateTime(r.ends_at)}`} />) : <Empty title="No qualifying referrals yet" text="When a person using your referral ID buys and gets approved for a duck, the reward will appear here." />}</div></section>}

    {tab === "history" && <section className="panel"><h2>Duck & payment history</h2><div className="request-list">{purchases.map(p => <RequestRow key={p.id} title={`${p.ducks?.name || "Duck"} • ${money(p.amount)}`} status={p.status} sub={`Purchased ${dateTime(p.created_at)} • lifetime ${p.ducks?.lifetime_days || "—"} days`} />)}{!purchases.length && <Empty title="No purchase history" text="Your duck purchases will appear here." />}</div></section>}

    {buyDuck && <BuyModal duck={buyDuck} methods={methods} form={buyForm} setForm={setBuyForm} busy={busy} onClose={() => setBuyDuck(null)} onSubmit={submitPurchase} />}
  </main>;
}

function Metric({ title, value, suffix, icon }) { return <div className="metric"><span>{icon}</span><div><small>{title}</small><b>{Number(value || 0).toLocaleString()}</b><em>{suffix}</em></div></div>; }
function DuckCard({ purchase, active }) { return <div className="duck-card compact"><div className="duck-visual">🦆</div><span className="pill">{purchase.status}</span><h3>{purchase.ducks?.name}</h3><div className="specs"><span>🥚 every {purchase.ducks?.egg_interval_hours}h</span><span>📅 expires {purchase.expiry_date ? new Date(purchase.expiry_date).toLocaleDateString() : "—"}</span></div>{active && <div className="active-note">Farming active</div>}</div>; }
function RequestRow({ title, status, sub }) { return <div className="request-row"><div><b>{title}</b><small>{sub}</small></div><span className={`status ${String(status).toLowerCase()}`}>{status}</span></div>; }
function Empty({ title, text, action, onClick }) { return <div className="empty"><div>🦆</div><h3>{title}</h3><p>{text}</p>{action && <button className="btn primary" onClick={onClick}>{action}</button>}</div>; }

function BuyModal({ duck, methods, form, setForm, busy, onClose, onSubmit }) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal"><button className="modal-close" onClick={onClose}>×</button><span className="eyebrow">PURCHASE</span><h2>{duck.name}</h2><div className="buy-summary"><div className="duck-visual">🦆</div><div><b>{money(duck.price)}</b><span>{duck.lifetime_days} days • 1 egg every {duck.egg_interval_hours}h</span></div></div><form onSubmit={onSubmit}><label>Payment method<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option value="">Select payment method</option>{methods.map(m => <option key={m.id} value={m.name}>{m.name} • {m.account_number}</option>)}</select></label>{form.method && <div className="payment-info">{methods.find(m => m.name === form.method)?.instructions || "Send the exact duck price, then enter your transaction ID and upload proof."}<br /><b>{methods.find(m => m.name === form.method)?.account_name} • {methods.find(m => m.name === form.method)?.account_number}</b></div>}<label>Transaction ID / TID<input value={form.tid} onChange={e => setForm({ ...form, tid: e.target.value })} placeholder="Enter transaction ID" /></label><label>Payment slip<input type="file" accept="image/*,.pdf" onChange={e => setForm({ ...form, slip: e.target.files?.[0] || null })} /></label><button className="btn primary wide" disabled={busy}>{busy ? "Submitting..." : "Submit payment proof"}</button></form></div></div>;
}

function AdminDashboard({ flash }) {
  const [tab, setTab] = useState("overview");
  const [ducks, setDucks] = useState([]);
  const [methods, setMethods] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [rates, setRates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [duckForm, setDuckForm] = useState({ id: "", name: "", price: 1500, lifetime_days: 80, egg_interval_hours: 24, active: true });
  const [methodForm, setMethodForm] = useState({ id: "", name: "", account_name: "", account_number: "", instructions: "", active: true });
  const [rateForm, setRateForm] = useState({ id: "", name: "", min_eggs: 1, max_eggs: 9, rate_per_egg: 10, active: true });

  async function load() {
    const [{ data: d }, { data: m }, { data: c }, { data: p }, { data: w }, { data: r }] = await Promise.all([
      supabase.from("ducks").select("*").order("created_at"),
      supabase.from("payment_methods").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("*, profiles(full_name,phone,customer_id), duck_purchases(ducks(name))").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*, profiles(full_name,phone,customer_id)").order("created_at", { ascending: false }),
      supabase.from("withdrawal_options").select("*").order("min_eggs")
    ]);
    setDucks(d || []); setMethods(m || []); setCustomers(c || []); setPayments(p || []); setWithdrawals(w || []); setRates(r || []);
  }
  useEffect(() => { load(); }, []);

  async function saveDuck(e) {
    e.preventDefault(); setBusy(true);
    const payload = { name: duckForm.name.trim(), price: Number(duckForm.price), lifetime_days: Number(duckForm.lifetime_days), egg_interval_hours: Number(duckForm.egg_interval_hours), active: duckForm.active };
    const q = duckForm.id ? supabase.from("ducks").update(payload).eq("id", duckForm.id) : supabase.from("ducks").insert(payload);
    const { error } = await q; setBusy(false); if (error) flash(error.message); else { flash("Duck saved."); setDuckForm({ id: "", name: "", price: 1500, lifetime_days: 80, egg_interval_hours: 24, active: true }); load(); }
  }
  async function saveMethod(e) {
    e.preventDefault(); setBusy(true);
    const payload = { name: methodForm.name.trim(), account_name: methodForm.account_name.trim(), account_number: methodForm.account_number.trim(), instructions: methodForm.instructions.trim(), active: methodForm.active };
    const q = methodForm.id ? supabase.from("payment_methods").update(payload).eq("id", methodForm.id) : supabase.from("payment_methods").insert(payload);
    const { error } = await q; setBusy(false); if (error) flash(error.message); else { flash("Payment method saved."); setMethodForm({ id: "", name: "", account_name: "", account_number: "", instructions: "", active: true }); load(); }
  }
  async function saveRate(e) {
    e.preventDefault(); setBusy(true);
    const payload = { name: rateForm.name.trim(), min_eggs: Number(rateForm.min_eggs), max_eggs: Number(rateForm.max_eggs), rate_per_egg: Number(rateForm.rate_per_egg), active: rateForm.active };
    const q = rateForm.id ? supabase.from("withdrawal_options").update(payload).eq("id", rateForm.id) : supabase.from("withdrawal_options").insert(payload);
    const { error } = await q; setBusy(false); if (error) flash(error.message); else { flash("Withdrawal rate saved."); setRateForm({ id: "", name: "", min_eggs: 1, max_eggs: 9, rate_per_egg: 10, active: true }); load(); }
  }
  async function approvePayment(id, approved) {
    setBusy(true);
    const { error } = approved ? await supabase.rpc("approve_payment_request", { p_payment_request_id: id }) : await supabase.rpc("reject_payment_request", { p_request_id: id });
    setBusy(false); if (error) flash(error.message); else { flash(approved ? "Payment approved. Duck activated and first egg credited." : "Payment rejected."); load(); }
  }
  async function approveWithdrawal(id, approved) {
    setBusy(true);
    const { error } = approved ? await supabase.rpc("approve_withdrawal_request", { p_request_id: id }) : await supabase.rpc("reject_withdrawal_request", { p_request_id: id });
    setBusy(false); if (error) flash(error.message); else { flash(approved ? "Withdrawal approved and eggs deducted." : "Withdrawal rejected."); load(); }
  }
  async function resetCustomer(id) {
    setBusy(true); const { data, error } = await supabase.rpc("reset_customer_id", { p_user_id: id }); setBusy(false);
    if (error) flash(error.message); else { flash(`New customer ID: ${data}`); load(); }
  }

  const pendingPayments = payments.filter(p => p.status === "pending");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");
  const customersOnly = customers.filter(c => c.role !== "admin");

  return <main className="dashboard admin-dashboard">
    <div className="dash-heading"><div><span className="eyebrow">CONTROL CENTER</span><h1>Admin dashboard</h1><p>Everything important for your duck farming business in one place.</p></div><button className="btn outline" onClick={load}>Refresh data</button></div>
    <div className="dash-tabs">{["overview","ducks","payments","customers","withdrawals","rates"].map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>

    {tab === "overview" && <><div className="metric-grid"><Metric title="Customers" value={customersOnly.length} suffix="accounts" icon="👥" /><Metric title="Pending payments" value={pendingPayments.length} suffix="to review" icon="🧾" /><Metric title="Pending withdrawals" value={pendingWithdrawals.length} suffix="to review" icon="💸" /><Metric title="Live ducks" value={ducks.filter(d => d.active).length} suffix="products" icon="🦆" /></div><div className="admin-two"><section className="panel"><h2>Quick review</h2>{pendingPayments.slice(0,5).map(p => <RequestRow key={p.id} title={`${p.profiles?.customer_id || "Customer"} • ${money(p.amount)}`} status={p.status} sub={`${p.transaction_id} • ${dateTime(p.created_at)}`} />)}{!pendingPayments.length && <Empty title="No pending payments" text="New customer payment proofs will appear here." />}</section><section className="panel"><h2>Withdrawal queue</h2>{pendingWithdrawals.slice(0,5).map(w => <RequestRow key={w.id} title={`${w.profiles?.customer_id || "Customer"} • ${w.eggs} eggs`} status={w.status} sub={`${w.payment_method} • ${w.account_number}`} />)}{!pendingWithdrawals.length && <Empty title="No pending withdrawals" text="Withdrawal requests will appear here." />}</section></div></>}

    {tab === "ducks" && <section className="panel"><div className="panel-head"><h2>Duck products</h2></div><form className="form-grid" onSubmit={saveDuck}><label>Duck name<input value={duckForm.name} onChange={e => setDuckForm({ ...duckForm, name: e.target.value })} required /></label><label>Price (Rs)<input type="number" min="0" value={duckForm.price} onChange={e => setDuckForm({ ...duckForm, price: e.target.value })} required /></label><label>Lifetime (1–100 days)<input type="number" min="1" max="100" value={duckForm.lifetime_days} onChange={e => setDuckForm({ ...duckForm, lifetime_days: e.target.value })} required /></label><label>Egg interval (hours)<input type="number" min="1" value={duckForm.egg_interval_hours} onChange={e => setDuckForm({ ...duckForm, egg_interval_hours: e.target.value })} required /></label><label className="check"><input type="checkbox" checked={duckForm.active} onChange={e => setDuckForm({ ...duckForm, active: e.target.checked })} /> Active</label><button className="btn primary">{duckForm.id ? "Update duck" : "Add duck"}</button></form><div className="admin-list">{ducks.map(d => <div className="admin-item" key={d.id}><div><b>{d.name}</b><small>{money(d.price)} • {d.lifetime_days} days • egg every {d.egg_interval_hours}h</small></div><div className="item-actions"><span className={`status ${d.active ? "approved" : "rejected"}`}>{d.active ? "Active" : "Disabled"}</span><button onClick={() => setDuckForm(d)}>Edit</button></div></div>)}</div></section>}

    {tab === "payments" && <section className="panel"><h2>Payment approvals</h2>{payments.map(p => <div className="admin-item" key={p.id}><div><b>{p.profiles?.customer_id || "Customer"} — {p.profiles?.full_name || ""}</b><small>{p.profiles?.phone || "No phone"} • {p.duck_purchases?.ducks?.name || "Duck"} • {money(p.amount)} • TID: {p.transaction_id}</small><small>{dateTime(p.created_at)} • {p.payment_method}</small></div><div className="item-actions"><span className={`status ${p.status}`}>{p.status}</span>{p.status === "pending" && <><button className="approve" disabled={busy} onClick={() => approvePayment(p.id, true)}>Approve</button><button className="reject" disabled={busy} onClick={() => approvePayment(p.id, false)}>Reject</button></>}</div></div>)}{!payments.length && <Empty title="No payment requests" text="Customer payment proofs will appear here." />}</section>}

    {tab === "customers" && <section className="panel"><h2>Customers & referral IDs</h2>{customersOnly.map(c => <div className="admin-item" key={c.id}><div><b>{c.customer_id} — {c.full_name || "Unnamed customer"}</b><small>{c.email || "No email"} • {c.phone || "No phone"}</small><small>Referral source: {c.referred_by || "Direct"} • Joined {dateTime(c.created_at)}</small></div><div className="item-actions"><button disabled={busy} onClick={() => resetCustomer(c.id)}>Reset Customer ID</button></div></div>)}{!customersOnly.length && <Empty title="No customers yet" text="Registered customers will appear here." />}</section>}

    {tab === "withdrawals" && <section className="panel"><h2>Withdrawal approvals</h2>{withdrawals.map(w => <div className="admin-item" key={w.id}><div><b>{w.profiles?.customer_id || "Customer"} — {w.profiles?.full_name || ""}</b><small>{w.profiles?.phone || "No phone"} • {w.eggs} eggs × {money(w.rate_per_egg)} = {money(w.amount)}</small><small>{w.payment_method} • {w.account_holder_name} • {w.account_number}</small><small>{dateTime(w.created_at)}</small></div><div className="item-actions"><span className={`status ${w.status}`}>{w.status}</span>{w.status === "pending" && <><button className="approve" disabled={busy} onClick={() => approveWithdrawal(w.id, true)}>Approve</button><button className="reject" disabled={busy} onClick={() => approveWithdrawal(w.id, false)}>Reject</button></>}</div></div>)}{!withdrawals.length && <Empty title="No withdrawal requests" text="Customer withdrawal requests will appear here." />}</section>}

    {tab === "rates" && <section className="panel"><h2>Withdrawal rates</h2><p className="muted">Admin can add, edit, enable or disable any egg range. Example: 1–9 = Rs 10, 10–50 = Rs 20, 51–100 = Rs 30.</p><form className="form-grid" onSubmit={saveRate}><label>Name<input value={rateForm.name} onChange={e => setRateForm({ ...rateForm, name: e.target.value })} placeholder="Starter" required /></label><label>Minimum eggs<input type="number" min="1" value={rateForm.min_eggs} onChange={e => setRateForm({ ...rateForm, min_eggs: e.target.value })} required /></label><label>Maximum eggs<input type="number" min="1" value={rateForm.max_eggs} onChange={e => setRateForm({ ...rateForm, max_eggs: e.target.value })} required /></label><label>Rs per egg<input type="number" min="0" value={rateForm.rate_per_egg} onChange={e => setRateForm({ ...rateForm, rate_per_egg: e.target.value })} required /></label><label className="check"><input type="checkbox" checked={rateForm.active} onChange={e => setRateForm({ ...rateForm, active: e.target.checked })} /> Active</label><button className="btn primary">{rateForm.id ? "Update rate" : "Add rate"}</button></form><div className="admin-list">{rates.map(r => <div className="admin-item" key={r.id}><div><b>{r.name}</b><small>{r.min_eggs}–{r.max_eggs} eggs • {money(r.rate_per_egg)} per egg</small></div><div className="item-actions"><span className={`status ${r.active ? "approved" : "rejected"}`}>{r.active ? "Active" : "Disabled"}</span><button onClick={() => setRateForm(r)}>Edit</button></div></div>)}</div><hr /><h2>Payment methods</h2><form className="form-grid" onSubmit={saveMethod}><label>Name<input value={methodForm.name} onChange={e => setMethodForm({ ...methodForm, name: e.target.value })} placeholder="JazzCash" required /></label><label>Account name<input value={methodForm.account_name} onChange={e => setMethodForm({ ...methodForm, account_name: e.target.value })} required /></label><label>Account number<input value={methodForm.account_number} onChange={e => setMethodForm({ ...methodForm, account_number: e.target.value })} required /></label><label>Instructions<textarea value={methodForm.instructions} onChange={e => setMethodForm({ ...methodForm, instructions: e.target.value })} /></label><label className="check"><input type="checkbox" checked={methodForm.active} onChange={e => setMethodForm({ ...methodForm, active: e.target.checked })} /> Active</label><button className="btn primary">{methodForm.id ? "Update method" : "Add method"}</button></form><div className="admin-list">{methods.map(m => <div className="admin-item" key={m.id}><div><b>{m.name}</b><small>{m.account_name} • {m.account_number}</small></div><div className="item-actions"><span className={`status ${m.active ? "approved" : "rejected"}`}>{m.active ? "Active" : "Disabled"}</span><button onClick={() => setMethodForm(m)}>Edit</button></div></div>)}</div></section>}
  </main>;
}

export default App;
