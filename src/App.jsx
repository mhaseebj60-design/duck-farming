import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const money = (n) => Number(n || 0).toLocaleString();
const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("home");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
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
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data || null);
    if (data?.role === "admin") setMode("admin");
    else if (data) setMode("customer");
  }

  async function logout() {
    await supabase.auth.signOut();
    setMode("home");
    setMessage("Logged out.");
  }

  if (loading) return <div className="center"><div className="card">Loading Duck Farming…</div></div>;

  const isAdmin = profile?.role === "admin";
  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setMode(profile ? (isAdmin ? "admin" : "customer") : "home")}>
          <span>🦆</span><b>Duck Farming</b>
        </button>
        <nav>
          {!session && <button onClick={() => setMode("customerAuth")}>Customer Login</button>}
          {session && <button onClick={() => setMode(isAdmin ? "admin" : "customer")}>{isAdmin ? "Admin" : "My Account"}</button>}
          {!session && <button className="dark" onClick={() => setMode("adminAuth")}>Admin Login</button>}
          {session && <button className="danger" onClick={logout}>Logout</button>}
        </nav>
      </header>
      {message && <div className="toast">{message}</div>}
      {!session && mode === "home" && <Home onStart={() => setMode("customerAuth")} />}
      {!session && mode === "customerAuth" && <CustomerAuth onDone={(p)=>{setProfile(p);setMode("customer")}} />}
      {!session && mode === "adminAuth" && <AdminAuth />}
      {session && isAdmin && mode === "admin" && <AdminDashboard notify={setMessage} />}
      {session && !isAdmin && mode === "customer" && <CustomerDashboard notify={setMessage} />}
      <footer>© 2026 Duck Farming</footer>
    </div>
  );
}

function Home({onStart}) {
  const [ducks,setDucks]=useState([]);
  useEffect(()=>{supabase.from("ducks").select("*").eq("active",true).order("created_at",{ascending:false}).then(({data})=>setDucks(data||[]));},[]);
  return <main>
    <section className="hero">
      <div><span className="pill">SMART DUCK FARMING</span><h1>Own a duck.<br/><span>Earn eggs automatically.</span></h1>
      <p>Choose a duck created by the admin, submit your payment proof, and track your duck and egg balance from your customer account.</p>
      <button className="primary" onClick={onStart}>Customer Login / Register</button></div>
      <div className="duck">🦆</div>
    </section>
    <section><h2>Available Ducks</h2><div className="grid">{ducks.length ? ducks.map(d=><DuckCard key={d.id} duck={d}/>) : <div className="card">No ducks are available yet.</div>}</div></section>
  </main>
}

function DuckCard({duck,onBuy}) {
  return <div className="card duckcard"><div className="duckmini">🦆</div><h3>{duck.name}</h3><div className="price">Rs {money(duck.price)}</div>
    <p>Lifetime: <b>{duck.lifetime_days} days</b></p><p>One egg every <b>{duck.egg_interval_hours} hours</b></p>{onBuy&&<button className="primary" onClick={()=>onBuy(duck)}>Buy Duck</button>}</div>
}

function AdminAuth() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState("");
  async function submit(e){e.preventDefault();setError("");const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);}
  return <AuthShell title="Admin Login"><form onSubmit={submit}><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<div className="error">{error}</div>}<button className="primary">Login</button></form></AuthShell>
}

function CustomerAuth({onDone}) {
  const [register,setRegister]=useState(false); const [method,setMethod]=useState("email"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState(""); const [password,setPassword]=useState(""); const [codeSent,setCodeSent]=useState(false); const [error,setError]=useState(""); const [info,setInfo]=useState("");
  async function emailSubmit(e){e.preventDefault();setError("");setInfo("");if(register){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,phone}}});if(error)setError(error.message);else {if(data.session) onDone({id:data.user.id,role:"customer"}); else setInfo("Check your email to confirm your account, then log in.");}}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);}}
  async function phoneSubmit(e){e.preventDefault();setError("");setInfo("");if(!codeSent){const {error}=await supabase.auth.signInWithOtp({phone,options:{shouldCreateUser:true,data:{full_name:name,phone}}});if(error)setError(error.message);else{setCodeSent(true);setInfo("OTP sent to your phone.");}}else{const token=e.currentTarget.code.value;const {error}=await supabase.auth.verifyOtp({phone,token,type:"sms"});if(error)setError(error.message);}}
  return <AuthShell title={register?"Customer Register":"Customer Login"}><div className="tabs"><button className={method==="email"?"active":""} onClick={()=>setMethod("email")}>Email</button><button className={method==="phone"?"active":""} onClick={()=>setMethod("phone")}>Phone</button></div>
    {method==="email"?<form onSubmit={emailSubmit}>{register&&<><label>Full name</label><input value={name} onChange={e=>setName(e.target.value)} required/></>}<label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<div className="error">{error}</div>}{info&&<div className="info">{info}</div>}<button className="primary">{register?"Create account":"Login"}</button></form>
    :<form onSubmit={phoneSubmit}>{register&&!codeSent&&<><label>Full name</label><input value={name} onChange={e=>setName(e.target.value)} required/></>}<label>Phone with country code</label><input placeholder="+923001234567" value={phone} onChange={e=>setPhone(e.target.value)} required/>{codeSent&&<><label>OTP code</label><input name="code" inputMode="numeric" required/></>}{error&&<div className="error">{error}</div>}{info&&<div className="info">{info}</div>}<button className="primary">{codeSent?"Verify OTP":"Send OTP"}</button></form>}
    <button className="link" onClick={()=>{setRegister(!register);setError("");setInfo("")}}>{register?"Already have an account? Login":"New customer? Register"}</button>
  </AuthShell>
}

function AuthShell({title,children}){return <main className="center"><div className="auth card"><div className="duckmini">🦆</div><h2>{title}</h2>{children}</div></main>}

function AdminDashboard({notify}) {
  const [ducks,setDucks]=useState([]); const [methods,setMethods]=useState([]); const [customers,setCustomers]=useState([]); const [payments,setPayments]=useState([]); const [withdrawals,setWithdrawals]=useState([]); const [withdrawalOptions,setWithdrawalOptions]=useState([]); const [commission,setCommission]=useState(1);
  const [form,setForm]=useState({name:"",price:"1500",lifetime_days:"80",egg_interval_hours:"24"});
  const [pay,setPay]=useState({name:"",account_name:"",account_number:"",instructions:""});
  async function load(){const [d,m,c,p,s,o,r]=await Promise.all([supabase.from("ducks").select("*").order("created_at",{ascending:false}),supabase.from("payment_methods").select("*").order("created_at",{ascending:false}),supabase.from("profiles").select("id,customer_id,full_name,email,phone,referral_code,referred_by,referral_commission_percent,created_at").eq("role","customer").order("created_at",{ascending:false}),supabase.from("payment_requests").select("*,profiles(full_name,email,customer_id),ducks(name)").order("created_at",{ascending:false}),supabase.from("site_settings").select("referral_commission_percent").eq("id",1).maybeSingle(),supabase.from("withdrawal_options").select("*").order("min_eggs"),supabase.from("withdrawal_requests").select("*,profiles(full_name,email,phone,customer_id)").order("created_at",{ascending:false})]);setDucks(d.data||[]);setMethods(m.data||[]);setCustomers(c.data||[]);setPayments(p.data||[]);setWithdrawalOptions(o.data||[]);setWithdrawals(r.data||[]);if(s.data)setCommission(s.data.referral_commission_percent??1)}
  useEffect(()=>{load()},[]);
  async function addDuck(e){e.preventDefault();const lifetime=Math.max(1,Math.min(100,Number(form.lifetime_days)));const interval=Math.max(1,Number(form.egg_interval_hours));const {error}=await supabase.from("ducks").insert({name:form.name,price:Number(form.price),lifetime_days:lifetime,egg_interval_hours:interval,active:true});if(error)notify(error.message);else{notify("Duck added.");setForm({name:"",price:"1500",lifetime_days:"80",egg_interval_hours:"24"});load()}}
  async function toggleDuck(d){await supabase.from("ducks").update({active:!d.active}).eq("id",d.id);load()}
  async function addMethod(e){e.preventDefault();const {error}=await supabase.from("payment_methods").insert({...pay,active:true});if(error)notify(error.message);else{notify("Payment method added.");setPay({name:"",account_name:"",account_number:"",instructions:""});load()}}
  async function addWithdrawalOption(e){e.preventDefault();const name=e.currentTarget.name.value;const min=Number(e.currentTarget.min.value);const max=Number(e.currentTarget.max.value);const rate=Number(e.currentTarget.rate.value);const {error}=await supabase.from("withdrawal_options").insert({name,min_eggs:min,max_eggs:max,rate_per_egg:rate,active:true});if(error)notify(error.message);else{notify("Withdrawal option added.");e.currentTarget.reset();load()}}
  async function toggleWithdrawalOption(o){await supabase.from("withdrawal_options").update({active:!o.active}).eq("id",o.id);load()}
  async function approveWithdrawal(w){const {error}=await supabase.rpc("approve_withdrawal_request",{p_withdrawal_request_id:w.id});if(error)notify(error.message);else{notify("Withdrawal approved and eggs deducted.");load()}}
  async function rejectWithdrawal(w){const {error}=await supabase.from("withdrawal_requests").update({status:"rejected",reviewed_by:(await supabase.auth.getUser()).data.user.id,reviewed_at:new Date().toISOString()}).eq("id",w.id).eq("status","pending");if(error)notify(error.message);else{notify("Withdrawal rejected; egg balance unchanged.");load()}}
  async function setComm(e){const v=Math.max(1,Math.min(100,Number(e.target.value)));setCommission(v);const {error}=await supabase.from("site_settings").upsert({id:1,referral_commission_percent:v});if(error)notify(error.message);else notify("Referral commission updated.")}
  async function approve(p){const {error}=await supabase.rpc("approve_payment_request",{p_payment_request_id:p.id});if(error)notify(error.message);else{notify("Payment approved. Duck activated and first egg added.");load()}}
  async function reject(p){const {error}=await supabase.from("payment_requests").update({status:"rejected",reviewed_at:new Date().toISOString()}).eq("id",p.id).eq("status","pending");if(error)notify(error.message);else{notify("Payment rejected.");load()}}
  async function resetCustomer(c){if(!confirm(`Reset customer ID for ${c.full_name||c.email||c.phone}?`))return;const {error}=await supabase.rpc("reset_customer_id",{p_user_id:c.id});if(error)notify(error.message);else{notify("Customer ID reset.");load()}}
  return <main><div className="pagehead"><div><span className="pill">ADMIN ONLY</span><h1>Admin Dashboard</h1><p>Manage ducks, payments, referrals and customers.</p></div></div>
    <section className="admin-grid">
      <div className="card"><h2>Add Duck</h2><form onSubmit={addDuck}><input placeholder="Duck name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><input type="number" min="0" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/><label>Lifetime: {form.lifetime_days} days</label><input type="range" min="1" max="100" value={form.lifetime_days} onChange={e=>setForm({...form,lifetime_days:e.target.value})}/><label>Egg every {form.egg_interval_hours} hours</label><input type="number" min="1" value={form.egg_interval_hours} onChange={e=>setForm({...form,egg_interval_hours:e.target.value})}/><button className="primary">Add Duck</button></form></div>
      <div className="card"><h2>Referral Commission</h2><p>Current commission: <b>{commission}%</b></p><input type="range" min="1" max="100" value={commission} onChange={setComm}/><p className="muted">Set from 1% to 100%.</p><h2>Payment Method</h2><form onSubmit={addMethod}><input placeholder="Method name e.g. JazzCash" value={pay.name} onChange={e=>setPay({...pay,name:e.target.value})} required/><input placeholder="Account name" value={pay.account_name} onChange={e=>setPay({...pay,account_name:e.target.value})}/><input placeholder="Account number" value={pay.account_number} onChange={e=>setPay({...pay,account_number:e.target.value})}/><textarea placeholder="Payment instructions" value={pay.instructions} onChange={e=>setPay({...pay,instructions:e.target.value})}/><button className="primary">Add Payment Method</button></form></div>
    </section>
<section><h2>Egg Withdrawal Rates</h2><div className="card"><p>Admin can change these rates anytime. Example: 1–9, 10–50, 51–100 eggs.</p><form onSubmit={addWithdrawalOption}><input name="name" placeholder="Option name" required/><div className="grid"><input name="min" type="number" min="1" placeholder="Minimum eggs" required/><input name="max" type="number" min="1" placeholder="Maximum eggs" required/><input name="rate" type="number" min="0" placeholder="Rs per egg" required/></div><button className="primary">Add Withdrawal Rate</button></form></div><div className="grid">{withdrawalOptions.map(o=><div className="card" key={o.id}><h3>{o.name}</h3><p>{o.min_eggs}–{o.max_eggs} eggs · Rs {money(o.rate_per_egg)} / egg</p><button onClick={()=>toggleWithdrawalOption(o)}>{o.active?"Disable":"Enable"}</button></div>)}</div></section>
    <section><h2>Withdrawal Requests</h2><div className="tablewrap"><table><thead><tr><th>Customer</th><th>Eggs</th><th>Rate</th><th>Amount</th><th>Payment Details</th><th>Status</th><th>Action</th></tr></thead><tbody>{withdrawals.map(w=><tr key={w.id}><td><b>{w.profiles?.customer_id||"—"}</b><br/>{w.profiles?.full_name||"—"}<br/>{w.profiles?.phone||w.profiles?.email||"—"}</td><td>{w.eggs}</td><td>Rs {money(w.rate_per_egg)}</td><td>Rs {money(w.amount)}</td><td>{w.payment_method}<br/>{w.account_holder_name}<br/>{w.account_number}</td><td>{w.status}</td><td>{w.status==="pending"&&<><button className="primary small" onClick={()=>approveWithdrawal(w)}>Approve</button> <button className="danger small" onClick={()=>rejectWithdrawal(w)}>Reject</button></>}</td></tr>)}</tbody></table></div></section>
        <section><h2>Ducks</h2><div className="grid">{ducks.map(d=><div className="card" key={d.id}><h3>{d.name}</h3><p>Rs {money(d.price)} · {d.lifetime_days} days · 1 egg/{d.egg_interval_hours}h</p><button onClick={()=>toggleDuck(d)}>{d.active?"Disable":"Enable"}</button></div>)}</div></section>
    <section><h2>Payment Methods</h2><div className="grid">{methods.map(m=><div className="card" key={m.id}><h3>{m.name}</h3><p>{m.account_name} · {m.account_number}</p><p>{m.instructions}</p></div>)}</div></section>
    <section><h2>Customers</h2><div className="tablewrap"><table><thead><tr><th>Customer ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Referral</th><th>Action</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td><b>{c.customer_id||"—"}</b></td><td>{c.full_name||"—"}</td><td>{c.email||"—"}</td><td>{c.phone||"—"}</td><td>{c.referral_commission_percent||commission}%</td><td><button className="danger" onClick={()=>resetCustomer(c)}>Reset ID</button></td></tr>)}</tbody></table></div></section>
    <section><h2>Payment Requests</h2><div className="tablewrap"><table><thead><tr><th>Customer</th><th>Duck</th><th>Amount</th><th>Method</th><th>TID</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{p.profiles?.customer_id||"—"}<br/>{p.profiles?.full_name||p.profiles?.email}</td><td>{p.ducks?.name||"—"}</td><td>Rs {money(p.amount)}</td><td>{p.payment_method}</td><td>{p.transaction_id||"—"}</td><td>{p.status}</td><td>{p.status==="pending"&&<><button className="primary small" onClick={()=>approve(p)}>Approve</button> <button className="danger small" onClick={()=>reject(p)}>Reject</button></>}</td></tr>)}</tbody></table></div></section>
  </main>
}

function CustomerDashboard({notify}) {
  const [ducks,setDucks]=useState([]); const [methods,setMethods]=useState([]); const [wallet,setWallet]=useState({balance:0,total_eggs:0}); const [purchases,setPurchases]=useState([]); const [selected,setSelected]=useState(null); const [form,setForm]=useState({method:"",tid:"",slip:null}); const [profile,setProfile]=useState(null); const [withdrawalOptions,setWithdrawalOptions]=useState([]); const [withdrawalRequests,setWithdrawalRequests]=useState([]); const [withdrawal,setWithdrawal]=useState({option:null,eggs:"",payment_method:"",account_holder_name:"",account_number:""});
  async function load(){const user=(await supabase.auth.getUser()).data.user;if(!user)return;const [d,m,w,p,c,o,r]=await Promise.all([supabase.from("ducks").select("*").eq("active",true).order("price"),supabase.from("payment_methods").select("*").eq("active",true).order("created_at"),supabase.from("egg_wallets").select("*").eq("user_id",user.id).maybeSingle(),supabase.from("duck_purchases").select("*,ducks(name,price,lifetime_days,egg_interval_hours)").eq("user_id",user.id).order("created_at",{ascending:false}),supabase.from("profiles").select("*").eq("id",user.id).single(),supabase.from("withdrawal_options").select("*").eq("active",true).order("min_eggs"),supabase.from("withdrawal_requests").select("*").eq("user_id",user.id).order("created_at",{ascending:false})]);setDucks(d.data||[]);setMethods(m.data||[]);setWallet(w.data||{balance:0,total_eggs:0});setPurchases(p.data||[]);setProfile(c.data);setWithdrawalOptions(o.data||[]);setWithdrawalRequests(r.data||[])}
  useEffect(()=>{load()},[]);
  async function requestWithdrawal(e){e.preventDefault();if(!withdrawal.option)return;const eggs=Number(withdrawal.eggs);if(!Number.isInteger(eggs)||eggs<withdrawal.option.min_eggs||eggs>withdrawal.option.max_eggs){notify(`Enter ${withdrawal.option.min_eggs} to ${withdrawal.option.max_eggs} eggs.`);return}if(eggs>Number(wallet.balance||0)){notify("Insufficient egg balance.");return}if(!withdrawal.payment_method||!withdrawal.account_holder_name.trim()||!withdrawal.account_number.trim()){notify("Complete your payment account details.");return}const amount=eggs*Number(withdrawal.option.rate_per_egg);const user=(await supabase.auth.getUser()).data.user;const {error}=await supabase.from("withdrawal_requests").insert({user_id:user.id,eggs,rate_per_egg:withdrawal.option.rate_per_egg,amount,payment_method:withdrawal.payment_method,account_holder_name:withdrawal.account_holder_name.trim(),account_number:withdrawal.account_number.trim(),status:"pending"});if(error)notify(error.message);else{notify("Withdrawal request sent to admin.");setWithdrawal({option:null,eggs:"",payment_method:"",account_holder_name:"",account_number:""});load()}}
  async function buy(e){e.preventDefault();if(!selected)return;const user=(await supabase.auth.getUser()).data.user;let path=null;if(form.slip){const ext=form.slip.name.split(".").pop();path=`${user.id}/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from("payment-slips").upload(path,form.slip,{upsert:false});if(error){notify(error.message);return}}const {data:purchase,error:pe}=await supabase.from("duck_purchases").insert({user_id:user.id,duck_id:selected.id,amount:selected.price,purchase_date:new Date().toISOString(),expiry_date:daysFromNow(selected.lifetime_days),status:"pending"}).select().single();if(pe){notify(pe.message);return}const {error}=await supabase.from("payment_requests").insert({user_id:user.id,duck_purchase_id:purchase.id,amount:selected.price,payment_method:form.method,transaction_id:form.tid,payment_slip_path:path,status:"pending"});if(error)notify(error.message);else{notify("Deposit request sent to admin.");setSelected(null);setForm({method:"",tid:"",slip:null});load()}}
  return <main><div className="pagehead"><div><span className="pill">CUSTOMER</span><h1>Welcome {profile?.full_name||"Customer"}</h1><p>Your Customer ID: <b>{profile?.customer_id||"—"}</b></p></div><div className="balance">🥚 {money(wallet.balance)}</div></div>
    <section><h2>Available Ducks</h2><div className="grid">{ducks.map(d=><DuckCard key={d.id} duck={d} onBuy={setSelected}/>)}</div></section>
    <section><h2>My Ducks</h2><div className="grid">{purchases.map(p=><div className="card" key={p.id}><h3>{p.ducks?.name}</h3><p>Status: <b>{p.status}</b></p><p>Expires: {p.expiry_date?new Date(p.expiry_date).toLocaleDateString():"—"}</p><p>Egg every {p.ducks?.egg_interval_hours} hours</p></div>)}</div></section>
<section><h2>Withdraw Eggs</h2><div className="grid">{withdrawalOptions.map(o=><div className="card" key={o.id}><h3>{o.name}</h3><p>{o.min_eggs}–{o.max_eggs} eggs</p><div className="price">Rs {money(o.rate_per_egg)} / egg</div><button className="primary" onClick={()=>setWithdrawal({...withdrawal,option:o})}>Choose</button></div>)}</div><div className="card"><h3>Withdrawal Requests</h3>{withdrawalRequests.length?<div className="tablewrap"><table><thead><tr><th>Eggs</th><th>Rate</th><th>Amount</th><th>Status</th></tr></thead><tbody>{withdrawalRequests.map(r=><tr key={r.id}><td>{r.eggs}</td><td>Rs {money(r.rate_per_egg)}</td><td>Rs {money(r.amount)}</td><td>{r.status}</td></tr>)}</tbody></table></div>:<p className="muted">No withdrawal requests yet.</p>}</div></section>
    {withdrawal.option&&<div className="modal"><div className="card modalcard"><button className="close" onClick={()=>setWithdrawal({...withdrawal,option:null})}>×</button><h2>{withdrawal.option.name}</h2><p>Rate: <b>Rs {money(withdrawal.option.rate_per_egg)} per egg</b></p><p>Available balance: <b>{money(wallet.balance)} eggs</b></p><form onSubmit={requestWithdrawal}><label>Eggs to withdraw</label><input type="number" min={withdrawal.option.min_eggs} max={withdrawal.option.max_eggs} value={withdrawal.eggs} onChange={e=>setWithdrawal({...withdrawal,eggs:e.target.value})} required/><label>Payment method</label><select value={withdrawal.payment_method} onChange={e=>setWithdrawal({...withdrawal,payment_method:e.target.value})} required><option value="">Choose</option><option>JazzCash</option><option>Easypaisa</option><option>Bank Account</option></select><label>Account holder name</label><input value={withdrawal.account_holder_name} onChange={e=>setWithdrawal({...withdrawal,account_holder_name:e.target.value})} required/><label>Account number</label><input value={withdrawal.account_number} onChange={e=>setWithdrawal({...withdrawal,account_number:e.target.value})} required/><button className="primary">Send Withdrawal Request</button></form></div></div>}
        {selected&&<div className="modal"><div className="card modalcard"><button className="close" onClick={()=>setSelected(null)}>×</button><h2>Buy {selected.name}</h2><p>Price: <b>Rs {money(selected.price)}</b></p><form onSubmit={buy}><label>Payment method</label><select value={form.method} onChange={e=>setForm({...form,method:e.target.value})} required><option value="">Choose</option>{methods.map(m=><option key={m.id} value={m.name}>{m.name} — {m.account_number}</option>)}</select>{form.method&&<div className="info">Send Rs {money(selected.price)} using the selected method, then enter your TID and upload proof.</div>}<label>Transaction ID / TID</label><input value={form.tid} onChange={e=>setForm({...form,tid:e.target.value})} required/><label>Payment slip / proof</label><input type="file" accept="image/*,.pdf" onChange={e=>setForm({...form,slip:e.target.files?.[0]||null})} required/><button className="primary">Send Deposit Request</button></form></div></div>}
  </main>
}
