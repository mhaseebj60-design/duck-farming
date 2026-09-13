
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Check, ChevronRight,
  CircleDollarSign, Clipboard, Copy, CreditCard, Egg, Eye, FileText,
  Home, LogOut, Menu, Package, Pencil, Plus, RefreshCw, Settings,
  ShieldCheck, Smartphone, User, Users, Wallet, X, Zap
} from "lucide-react";

const money = (v) => `Rs ${Number(v || 0).toLocaleString()}`;
const fmt = (d) => d ? new Date(d).toLocaleString() : "—";
const errText = (e) => e?.message || "Something went wrong";

function Button({children,variant="primary",...p}) {
  return <button className={`btn ${variant}`} {...p}>{children}</button>;
}
function Card({children,className=""}) { return <div className={`card ${className}`}>{children}</div>; }
function Modal({title,onClose,children}) {
  return <div className="modal-backdrop"><div className="modal">
    <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>
    {children}
  </div></div>;
}
function Field({label,...p}) { return <label className="field"><span>{label}</span><input {...p}/></label>; }
function Select({label,children,...p}) { return <label className="field"><span>{label}</span><select {...p}>{children}</select></label>; }
function Toggle({checked,onChange}) { return <button type="button" className={`toggle ${checked?"on":""}`} onClick={()=>onChange(!checked)}><span/></button>; }
function Status({v}) { return <span className={`status ${String(v).toLowerCase()}`}>{v}</span>; }

async function rpc(name,args={}) {
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw error;
  return data;
}

export default function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let alive=true;
    const boot=async()=>{
      try{
        const {data:{session:s},error:e}=await supabase.auth.getSession();
        if(e) throw e;
        if(!alive) return;
        setSession(s);
        if(s){
          const {data:p,error:pe}=await supabase.rpc("get_my_profile");
          if(pe) throw pe;
          setProfile(Array.isArray(p)?p[0]:p);
        }
      }catch(e){ if(alive) setError(errText(e)); }
      finally{ if(alive) setLoading(false); }
    };
    boot();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,s)=>{
      setSession(s);
      if(!s){setProfile(null);return;}
      const {data:p}=await supabase.rpc("get_my_profile");
      setProfile(Array.isArray(p)?p[0]:p);
    });
    return ()=>{alive=false;subscription.unsubscribe()};
  },[]);

  if(loading) return <div className="splash"><div className="logo-mark">D</div><h1>Duck Farming</h1><p>Loading secure farm...</p></div>;
  if(!session) return <Auth onError={setError}/>;
  if(error) return <div className="app"><div className="top"><b>Duck Farming</b><button className="icon-btn" onClick={()=>setError("")}><X/></button></div><Card><h2>Connection error</h2><p className="muted">{error}</p><Button onClick={()=>location.reload()}><RefreshCw size={17}/>Retry</Button></Card></div>;
  return profile?.role==="admin" ? <AdminApp profile={profile}/> : <CustomerApp profile={profile}/>;
}

function Auth({onError}){
  const [mode,setMode]=useState("login");
  const [f,setF]=useState({email:"",password:"",full_name:"",phone:"",referral_code:""});
  const [busy,setBusy]=useState(false);
  const submit=async(e)=>{
    e.preventDefault();setBusy(true);onError("");
    try{
      if(mode==="login"){
        const {error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});
        if(error) throw error;
      }else{
        const {data,error}=await supabase.auth.signUp({
          email:f.email,password:f.password,
          options:{data:{full_name:f.full_name,phone:f.phone,referral_code:f.referral_code||null}}
        });
        if(error) throw error;
        if(!data.session) alert("Account created. Check your email if email confirmation is enabled.");
      }
    }catch(e){onError(errText(e));alert(errText(e))}
    finally{setBusy(false)}
  };
  return <div className="auth-page">
    <div className="auth-card">
      <div className="brand"><div className="logo-mark">D</div><div><h1>Duck Farming</h1><small>Premium digital farm</small></div></div>
      <div className="auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Login</button><button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create account</button></div>
      <form onSubmit={submit}>
        {mode==="signup"&&<><Field label="Full name" value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} required/><Field label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} required/><Field label="Referral ID (optional)" value={f.referral_code} onChange={e=>setF({...f,referral_code:e.target.value})}/></>}
        <Field label="Email" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required/>
        <Field label="Password" type="password" minLength={6} value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/>
        <Button disabled={busy} style={{width:"100%",justifyContent:"center"}}>{busy?<RefreshCw className="spin"/>:mode==="login"?"Login securely":"Create account"}</Button>
      </form>
      <p className="muted center">Your customer dashboard and admin access are separated by your account role.</p>
    </div>
  </div>
}

function CustomerApp({profile}){
  const [tab,setTab]=useState("home");
  const [wallet,setWallet]=useState(null);
  const [ducks,setDucks]=useState([]);
  const [purchases,setPurchases]=useState([]);
  const [methods,setMethods]=useState([]);
  const [rates,setRates]=useState([]);
  const [withdrawals,setWithdrawals]=useState([]);
  const [referrals,setReferrals]=useState([]);
  const [busy,setBusy]=useState(false);

  const load=async()=>{
    setBusy(true);
    try{
      await rpc("claim_due_eggs");
      await rpc("claim_due_referral_eggs");
      const [w,d,p,m,r,wr,rr]=await Promise.all([
        supabase.from("egg_wallets").select("*").eq("user_id",profile.id).maybeSingle(),
        supabase.from("ducks").select("*").eq("active",true).order("price"),
        supabase.from("duck_purchases").select("*,ducks(name,price,lifetime_days,egg_interval_hours)").eq("user_id",profile.id).order("created_at",{ascending:false}),
        supabase.from("payment_methods").select("*").eq("active",true).order("created_at"),
        supabase.from("withdrawal_options").select("*").eq("active",true).order("min_eggs"),
        supabase.from("withdrawal_requests").select("*").eq("user_id",profile.id).order("created_at",{ascending:false}),
        supabase.from("referral_rewards").select("*").eq("referrer_id",profile.id).order("created_at",{ascending:false})
      ]);
      for(const x of [w,d,p,m,r,wr,rr]) if(x.error) throw x.error;
      setWallet(w.data);setDucks(d.data||[]);setPurchases(p.data||[]);setMethods(m.data||[]);setRates(r.data||[]);setWithdrawals(wr.data||[]);setReferrals(rr.data||[]);
    }catch(e){alert(errText(e))}finally{setBusy(false)}
  };
  useEffect(()=>{load()},[]);
  const nav=[
    ["home","Home",Home],["ducks","My Ducks",Package],["buy","Buy Duck",Egg],
    ["referral","Referral",Users],["withdraw","Withdraw",ArrowDownToLine],["profile","Profile",User]
  ];
  return <div className="app">
    <header className="top"><div className="brand-mini"><div className="logo-mark">D</div><b>Duck Farming</b></div><div className="top-actions"><button className="icon-btn" onClick={load}><RefreshCw size={18} className={busy?"spin":""}/></button><button className="avatar">{(profile.full_name||"C")[0]}</button></div></header>
    <main className="content">
      {tab==="home"&&<CustomerHome profile={profile} wallet={wallet} purchases={purchases} onBuy={()=>setTab("buy")}/>}
      {tab==="ducks"&&<MyDucks purchases={purchases}/>}
      {tab==="buy"&&<BuyDuck ducks={ducks} methods={methods} userId={profile.id} onDone={load}/>}
      {tab==="referral"&&<Referral profile={profile} rewards={referrals}/>}
      {tab==="withdraw"&&<Withdraw wallet={wallet} rates={rates} withdrawals={withdrawals} onDone={load}/>}
      {tab==="profile"&&<Profile profile={profile}/>}
    </main>
    <nav className="bottom-nav">{nav.map(([id,label,I])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><I size={19}/><span>{label}</span></button>)}</nav>
  </div>
}

function CustomerHome({profile,wallet,purchases,onBuy}){
  const active=purchases.filter(x=>x.status==="active");
  return <><section className="hero"><div><span className="eyebrow">WELCOME BACK</span><h2>{profile.full_name||"Farmer"}</h2><p>Grow your digital farm with verified ducks.</p></div><Egg size={48}/></section>
    <div className="stats"><Card><span>Egg balance</span><strong>{wallet?.total_eggs||0}</strong><small>{money(wallet?.balance)}</small></Card><Card><span>Active ducks</span><strong>{active.length}</strong><small>Producing eggs</small></Card><Card><span>Customer ID</span><strong className="small-code">{profile.customer_id}</strong><small>{profile.phone||"Phone not set"}</small></Card></div>
    <Card className="cta"><div><span className="eyebrow">FARM MORE</span><h3>Choose your next duck</h3><p className="muted">Admin controls prices, lifetime and egg timing.</p></div><Button onClick={onBuy}><Plus size={18}/>Buy duck</Button></Card>
    <Card><div className="section-head"><h3>Recent ducks</h3><span>{purchases.length}</span></div>{purchases.slice(0,4).map(p=><div className="list-row" key={p.id}><div className="row-icon"><Egg size={18}/></div><div><b>{p.ducks?.name||"Duck"}</b><small>{fmt(p.purchase_date||p.created_at)}</small></div><Status v={p.status}/></div>)}{!purchases.length&&<Empty text="No duck purchases yet."/>}</Card>
  </>
}

function MyDucks({purchases}){return <><div className="page-title"><div><span className="eyebrow">MY FARM</span><h2>My Ducks</h2></div></div><div className="grid">{purchases.map(p=><Card key={p.id}><div className="duck-art"><Egg size={38}/></div><div className="section-head"><h3>{p.ducks?.name||"Duck"}</h3><Status v={p.status}/></div><div className="kv"><span>Price</span><b>{money(p.amount)}</b><span>Lifetime</span><b>{p.ducks?.lifetime_days||"—"} days</b><span>Egg interval</span><b>{p.ducks?.egg_interval_hours||24}h</b><span>Expires</span><b>{fmt(p.expiry_date)}</b></div></Card>)}{!purchases.length&&<Empty text="You don't own any ducks yet."/>}</div></>}

function BuyDuck({ducks,methods,userId,onDone}){
  const [duck,setDuck]=useState(null);const [f,setF]=useState({method:"",tid:"",file:null});const [busy,setBusy]=useState(false);
  const submit=async(e)=>{
    e.preventDefault();if(!duck||!f.method||!f.tid)return;
    setBusy(true);
    try{
      const {data:p,error:pe}=await supabase.from("duck_purchases").insert({user_id:userId,duck_id:duck.id,amount:duck.price,status:"pending"}).select().single();
      if(pe)throw pe;
      let path=null;
      if(f.file){
        path=`${userId}/${crypto.randomUUID()}-${f.file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
        const {error:ue}=await supabase.storage.from("payment-slips").upload(path,f.file,{upsert:false});
        if(ue)throw ue;
      }
      const {error:re}=await supabase.from("payment_requests").insert({
        user_id:userId,duck_purchase_id:p.id,amount:duck.price,
        payment_method:f.method,transaction_id:f.tid,payment_slip_path:path,status:"pending"
      });
      if(re)throw re;
      alert("Payment submitted. Admin will review your TID and payment slip.");
      setDuck(null);setF({method:"",tid:"",file:null});onDone();
    }catch(e){alert(errText(e))}finally{setBusy(false)}
  };
  return <><div className="page-title"><div><span className="eyebrow">MARKET</span><h2>Buy a Duck</h2></div></div>
    <div className="grid">{ducks.map(d=><Card key={d.id} className="duck-card"><div className="duck-art large"><Egg size={54}/></div><h3>{d.name}</h3><div className="price">{money(d.price)}</div><div className="mini-grid"><span>{d.lifetime_days} days lifetime</span><span>1 egg / {d.egg_interval_hours}h</span></div><Button onClick={()=>setDuck(d)}><CreditCard size={17}/>Buy this duck</Button></Card>)}{!ducks.length&&<Empty text="No active ducks are available. Ask admin to add one."/>}</div>
    {duck&&<Modal title={`Purchase ${duck.name}`} onClose={()=>setDuck(null)}><form onSubmit={submit}>
      <div className="pay-summary"><b>{duck.name}</b><strong>{money(duck.price)}</strong></div>
      <div className="payment-methods">{methods.map(m=><button type="button" key={m.id} className={`method ${f.method===m.name?"selected":""}`} onClick={()=>setF({...f,method:m.name})}><CreditCard size={18}/><div><b>{m.name}</b><small>{m.account_name} · {m.account_number}</small><small>{m.instructions}</small></div></button>)}</div>
      {!methods.length&&<Empty text="No payment method is active."/>}
      <Field label="TID / Transaction ID" value={f.tid} onChange={e=>setF({...f,tid:e.target.value})} required/>
      <label className="field"><span>Payment slip</span><input type="file" accept="image/*,.pdf" onChange={e=>setF({...f,file:e.target.files?.[0]||null})}/></label>
      <Button disabled={busy||!f.method}>{busy?<RefreshCw className="spin"/>:<Check size={18}/>}Submit payment</Button>
    </form></Modal>}
  </>
}

function Referral({profile,rewards}){
  const [copied,setCopied]=useState(false);
  const copy=async()=>{await navigator.clipboard.writeText(profile.referral_code||"");setCopied(true);setTimeout(()=>setCopied(false),1200)};
  return <><div className="page-title"><div><span className="eyebrow">GROW TOGETHER</span><h2>Referral Hub</h2></div></div>
    <Card className="ref-box"><Users size={42}/><span>Your referral ID</span><strong>{profile.referral_code}</strong><Button variant="soft" onClick={copy}>{copied?<Check/>:<Copy/>}{copied?"Copied":"Copy ID"}</Button></Card>
    <Card><h3>How referral rewards work</h3><div className="steps"><div><b>01</b><p>Your friend signs up with your referral ID.</p></div><div><b>02</b><p>They buy at least one duck and payment is approved.</p></div><div><b>03</b><p>You receive 1 referral egg every 24 hours for 3 days.</p></div><div><b>04</b><p>Referral eggs are added to your egg balance and can be withdrawn.</p></div></div></Card>
    <Card><div className="section-head"><h3>Referral rewards</h3><span>{profile.referral_commission_percent}% commission</span></div>{rewards.map(r=><div className="list-row" key={r.id}><div className="row-icon"><Zap size={18}/></div><div><b>Referral reward</b><small>{fmt(r.created_at)} · {r.earned_eggs}/3 eggs</small></div><Status v={r.status}/></div>)}{!rewards.length&&<Empty text="No qualifying referral yet."/>}</Card>
  </>
}

function Withdraw({wallet,rates,withdrawals,onDone}){
  const [opt,setOpt]=useState(null);const [eggs,setEggs]=useState("");const [f,setF]=useState({method:"JazzCash",account:"",holder:""});const [busy,setBusy]=useState(false);
  const amount=opt&&eggs?Number(eggs)*Number(opt.rate_per_egg):0;
  const submit=async(e)=>{e.preventDefault();const n=Number(eggs);if(!opt||n<opt.min_eggs||n>opt.max_eggs)return alert(`Enter between ${opt.min_eggs} and ${opt.max_eggs} eggs.`);
    setBusy(true);try{await rpc("create_withdrawal",{withdrawal_eggs:n,withdrawal_amount:amount,withdrawal_method:f.method,withdrawal_account:f.account,withdrawal_holder_name:f.holder,withdrawal_rate:Number(opt.rate_per_egg)});alert("Withdrawal request submitted.");setOpt(null);setEggs("");onDone()}catch(e){alert(errText(e))}finally{setBusy(false)}
  };
  return <><div className="page-title"><div><span className="eyebrow">CASH OUT</span><h2>Withdraw Eggs</h2></div><div className="balance-pill"><Egg size={17}/>{wallet?.total_eggs||0}</div></div>
    <div className="grid">{rates.map(r=><Card key={r.id} className="rate-card"><div><span>{r.name}</span><strong>{money(r.rate_per_egg)}<small>/egg</small></strong><p>{r.min_eggs}–{r.max_eggs} eggs</p></div><Button onClick={()=>setOpt(r)}><ArrowDownToLine size={17}/>Choose</Button></Card>)}</div>
    <Card><div className="section-head"><h3>Withdrawal history</h3></div>{withdrawals.map(w=><div className="list-row" key={w.id}><div className="row-icon"><Wallet size={18}/></div><div><b>{w.eggs} eggs · {money(w.amount)}</b><small>{w.payment_method} · {fmt(w.created_at)}</small></div><Status v={w.status}/></div>)}{!withdrawals.length&&<Empty text="No withdrawal requests yet."/>}</Card>
    {opt&&<Modal title={`Withdraw with ${opt.name}`} onClose={()=>setOpt(null)}><form onSubmit={submit}>
      <div className="pay-summary"><b>Available eggs</b><strong>{wallet?.total_eggs||0}</strong></div>
      <Field label={`Eggs (${opt.min_eggs}–${opt.max_eggs})`} type="number" min={opt.min_eggs} max={opt.max_eggs} value={eggs} onChange={e=>setEggs(e.target.value)} required/>
      <div className="amount-preview">{money(amount)}</div>
      <Select label="Payout method" value={f.method} onChange={e=>setF({...f,method:e.target.value})}><option>JazzCash</option><option>Easypaisa</option><option>Bank</option></Select>
      <Field label="Account holder name" value={f.holder} onChange={e=>setF({...f,holder:e.target.value})} required/>
      <Field label="Account number" value={f.account} onChange={e=>setF({...f,account:e.target.value})} required/>
      <Button disabled={busy}>{busy?<RefreshCw className="spin"/>:<Check/>}Submit withdrawal</Button>
    </form></Modal>}
  </>
}

function Profile({profile}){return <><div className="page-title"><div><span className="eyebrow">ACCOUNT</span><h2>Profile</h2></div></div><Card><div className="profile-head"><div className="avatar big">{(profile.full_name||"C")[0]}</div><div><h3>{profile.full_name||"Customer"}</h3><p className="muted">{profile.email}</p></div></div><div className="kv"><span>Customer ID</span><b>{profile.customer_id}</b><span>Phone</span><b>{profile.phone||"—"}</b><span>Referral ID</span><b>{profile.referral_code}</b><span>Referral commission</span><b>{profile.referral_commission_percent}%</b></div></Card><Button variant="danger" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/>Logout</Button></>}

function AdminApp({profile}){
  const [tab,setTab]=useState("overview");const [open,setOpen]=useState(false);
  const nav=[["overview","Overview",Home],["ducks","Ducks",Package],["deposits","Deposits",CreditCard],["customers","Customers",Users],["methods","Payments",CircleDollarSign],["withdrawals","Withdrawals",ArrowDownToLine],["rates","Rates",Activity],["settings","Settings",Settings]];
  return <div className="admin-shell"><aside className={open?"open":""}><div className="admin-brand"><div className="logo-mark">D</div><div><b>Duck Farming</b><small>Admin control</small></div></div>{nav.map(([id,l,I])=><button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);setOpen(false)}}><I size={18}/>{l}</button>)}<button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/>Logout</button></aside><div className="admin-main"><header className="top"><button className="icon-btn mobile-menu" onClick={()=>setOpen(!open)}><Menu/></button><div><span className="eyebrow">ADMIN</span><h2>Control Center</h2></div><div className="avatar">{(profile.full_name||"A")[0]}</div></header><main className="content">{tab==="overview"&&<AdminOverview/>}{tab==="ducks"&&<AdminDucks/>}{tab==="deposits"&&<AdminDeposits/>}{tab==="customers"&&<AdminCustomers/>}{tab==="methods"&&<AdminMethods/>}{tab==="withdrawals"&&<AdminWithdrawals/>}{tab==="rates"&&<AdminRates/>}{tab==="settings"&&<AdminSettings/>}</main></div></div>
}

function useTable(table,select="*"){
  const [rows,setRows]=useState([]);const [busy,setBusy]=useState(false);
  const load=async()=>{setBusy(true);const {data,error}=await supabase.from(table).select(select).order("created_at",{ascending:false});if(error)alert(errText(error));else setRows(data||[]);setBusy(false)};
  useEffect(()=>{load()},[table]);return {rows,setRows,busy,load};
}
function AdminOverview(){
  const [stats,setStats]=useState({customers:0,ducks:0,deposits:0,withdrawals:0});
  useEffect(()=>{(async()=>{const [c,d,p,w]=await Promise.all([supabase.from("profiles").select("id",{count:"exact",head:true}),supabase.from("ducks").select("id",{count:"exact",head:true}),supabase.from("payment_requests").select("id",{count:"exact",head:true}).eq("status","pending"),supabase.from("withdrawal_requests").select("id",{count:"exact",head:true}).eq("status","pending")]);setStats({customers:c.count||0,ducks:d.count||0,deposits:p.count||0,withdrawals:w.count||0})})()},[]);
  return <><div className="page-title"><div><span className="eyebrow">LIVE OPERATIONS</span><h2>Overview</h2></div></div><div className="stats four"><Card><Users/><span>Customers</span><strong>{stats.customers}</strong></Card><Card><Package/><span>Ducks</span><strong>{stats.ducks}</strong></Card><Card><CreditCard/><span>Pending deposits</span><strong>{stats.deposits}</strong></Card><Card><ArrowDownToLine/><span>Pending withdrawals</span><strong>{stats.withdrawals}</strong></Card></div><Card><h3>Admin protection</h3><p className="muted">Only profiles with role <b>admin</b> can use these controls. Customers are routed to the customer dashboard and cannot access this admin dashboard through the UI.</p></Card></>
}
function AdminDucks(){
  const t=useTable("ducks");const [edit,setEdit]=useState(null);const empty={name:"",price:1500,lifetime_days:80,egg_interval_hours:24,active:true};const [f,setF]=useState(empty);
  const save=async(e)=>{e.preventDefault();try{if(edit)await rpc("admin_update_duck",{p_id:edit.id,p_name:f.name,p_price:Number(f.price),p_lifetime_days:Number(f.lifetime_days),p_egg_interval_hours:Number(f.egg_interval_hours),p_active:f.active});else await rpc("admin_create_duck",{p_name:f.name,p_price:Number(f.price),p_lifetime_days:Number(f.lifetime_days),p_egg_interval_hours:Number(f.egg_interval_hours),p_active:f.active});setEdit(null);setF(empty);t.load()}catch(e){alert(errText(e))}};
  return <><AdminTitle title="Duck types" add={()=>setEdit({new:true})}/><Card><div className="table-wrap"><table><thead><tr><th>Name</th><th>Price</th><th>Lifetime</th><th>Egg</th><th>Active</th><th/></tr></thead><tbody>{t.rows.map(r=><tr key={r.id}><td><b>{r.name}</b></td><td>{money(r.price)}</td><td>{r.lifetime_days}d</td><td>{r.egg_interval_hours}h</td><td><Toggle checked={r.active} onChange={async(v)=>{await rpc("admin_update_duck",{p_id:r.id,p_name:r.name,p_price:Number(r.price),p_lifetime_days:r.lifetime_days,p_egg_interval_hours:r.egg_interval_hours,p_active:v});t.load()}}/></td><td><button className="icon-btn" onClick={()=>{setEdit(r);setF({...r})}}><Pencil size={16}/></button></td></tr>)}</tbody></table></div></Card>{edit&&<Modal title={edit.new?"Add duck":"Edit duck"} onClose={()=>setEdit(null)}><form onSubmit={save}><Field label="Duck name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/><Field label="Price" type="number" min="0" value={f.price} onChange={e=>setF({...f,price:e.target.value})}/><Field label="Lifetime (1–100 days)" type="number" min="1" max="100" value={f.lifetime_days} onChange={e=>setF({...f,lifetime_days:e.target.value})}/><Field label="Egg interval (hours)" type="number" min="1" value={f.egg_interval_hours} onChange={e=>setF({...f,egg_interval_hours:e.target.value})}/><label className="check"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Active</label><Button><Check/>Save duck</Button></form></Modal>}</>
}
function AdminTitle({title,add}){return <div className="page-title"><div><span className="eyebrow">ADMIN</span><h2>{title}</h2></div><Button onClick={add}><Plus size={17}/>Add</Button></div>}
function AdminDeposits(){
  const t=useTable("payment_requests","*,profiles(full_name,phone,customer_id,email),duck_purchases(ducks(name))");
  const [busy,setBusy]=useState("");
  const review=async(id,ok)=>{const note=prompt("Admin note (optional):")||null;setBusy(id);try{await rpc(ok?"approve_payment":"reject_payment",{p_payment_request_id:id,p_admin_note:note});t.load()}catch(e){alert(errText(e))}finally{setBusy("")}};
  const view=async(path)=>{if(!path)return alert("No payment slip uploaded.");const {data,error}=await supabase.storage.from("payment-slips").createSignedUrl(path,3600);if(error)alert(errText(error));else window.open(data.signedUrl,"_blank")};
  return <><AdminTitle title="Deposit requests" add={()=>{}}/><Card><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Duck</th><th>Amount</th><th>TID</th><th>Slip</th><th>Status</th><th/></tr></thead><tbody>{t.rows.map(r=><tr key={r.id}><td><b>{r.profiles?.full_name||"—"}</b><small>{r.profiles?.customer_id} · {r.profiles?.phone}</small></td><td>{r.duck_purchases?.ducks?.name||"—"}</td><td>{money(r.amount)}</td><td>{r.transaction_id}</td><td><button className="link-btn" onClick={()=>view(r.payment_slip_path)}><Eye size={15}/>View</button></td><td><Status v={r.status}/></td><td>{r.status==="pending"&&<div className="actions"><button className="icon-btn ok" disabled={busy===r.id} onClick={()=>review(r.id,true)}><Check/></button><button className="icon-btn no" disabled={busy===r.id} onClick={()=>review(r.id,false)}><X/></button></div>}</td></tr>)}</tbody></table></div>{!t.rows.length&&<Empty text="No deposit requests."/>}</Card></>
}
function AdminCustomers(){
  const t=useTable("profiles");
  const save=async(r)=>{const cid=prompt("Customer ID",r.customer_id||"");if(cid===null)return;const pct=prompt("Referral commission % (1–100)",r.referral_commission_percent||1);if(pct===null)return;try{await rpc("admin_update_customer",{p_id:r.id,p_customer_id:cid,p_referral_commission_percent:Number(pct)});t.load()}catch(e){alert(errText(e))}};
  return <><AdminTitle title="Customers" add={()=>{}}/><Card><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Referral</th><th>Commission</th><th/></tr></thead><tbody>{t.rows.filter(r=>r.role!=="admin").map(r=><tr key={r.id}><td><b>{r.full_name||"—"}</b><small>{r.customer_id}</small></td><td>{r.phone||"—"}</td><td>{r.email||"—"}</td><td>{r.referred_by||"—"}</td><td>{r.referral_commission_percent}%</td><td><button className="icon-btn" onClick={()=>save(r)}><Pencil size={16}/></button></td></tr>)}</tbody></table></div></Card></>
}
function AdminMethods(){
  const t=useTable("payment_methods");const [edit,setEdit]=useState(null);const empty={name:"",account_name:"",account_number:"",instructions:"",active:true};const [f,setF]=useState(empty);
  const save=async(e)=>{e.preventDefault();try{if(edit?.id)await rpc("admin_update_payment_method",{p_id:edit.id,p_name:f.name,p_account_name:f.account_name,p_account_number:f.account_number,p_instructions:f.instructions,p_active:f.active});else await rpc("admin_create_payment_method",{p_name:f.name,p_account_name:f.account_name,p_account_number:f.account_number,p_instructions:f.instructions,p_active:f.active});setEdit(null);setF(empty);t.load()}catch(e){alert(errText(e))}};
  return <><AdminTitle title="Payment methods" add={()=>setEdit({new:true})}/><Card><div className="table-wrap"><table><thead><tr><th>Method</th><th>Account</th><th>Instructions</th><th>Active</th><th/></tr></thead><tbody>{t.rows.map(r=><tr key={r.id}><td><b>{r.name}</b></td><td>{r.account_name}<small>{r.account_number}</small></td><td>{r.instructions||"—"}</td><td><Toggle checked={r.active} onChange={async(v)=>{await rpc("admin_update_payment_method",{p_id:r.id,p_name:r.name,p_account_name:r.account_name,p_account_number:r.account_number,p_instructions:r.instructions||"",p_active:v});t.load()}}/></td><td><button className="icon-btn" onClick={()=>{setEdit(r);setF({...r})}}><Pencil size={16}/></button></td></tr>)}</tbody></table></div></Card>{edit&&<Modal title={edit.new?"Add payment method":"Edit payment method"} onClose={()=>setEdit(null)}><form onSubmit={save}><Field label="Method name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/><Field label="Account name" value={f.account_name} onChange={e=>setF({...f,account_name:e.target.value})}/><Field label="Account number" value={f.account_number} onChange={e=>setF({...f,account_number:e.target.value})}/><Field label="Instructions" value={f.instructions} onChange={e=>setF({...f,instructions:e.target.value})}/><label className="check"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Active</label><Button><Check/>Save method</Button></form></Modal>}</>
}
function AdminWithdrawals(){
  const t=useTable("withdrawal_requests","*,profiles(full_name,phone,customer_id,email)");const [busy,setBusy]=useState("");
  const review=async(id,ok)=>{const note=prompt("Admin note (optional):")||null;setBusy(id);try{await rpc(ok?"approve_withdrawal_request":"reject_withdrawal_request",{p_withdrawal_request_id:id,p_admin_note:note});t.load()}catch(e){alert(errText(e))}finally{setBusy("")}};
  return <><AdminTitle title="Withdrawal requests" add={()=>{}}/><Card><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Eggs</th><th>Amount</th><th>Payout</th><th>Status</th><th/></tr></thead><tbody>{t.rows.map(r=><tr key={r.id}><td><b>{r.profiles?.full_name||"—"}</b><small>{r.profiles?.customer_id} · {r.profiles?.phone}</small></td><td>{r.eggs}</td><td>{money(r.amount)}<small>{money(r.rate_per_egg)}/egg</small></td><td>{r.payment_method}<small>{r.account_holder_name} · {r.account_number}</small></td><td><Status v={r.status}/></td><td>{r.status==="pending"&&<div className="actions"><button className="icon-btn ok" disabled={busy===r.id} onClick={()=>review(r.id,true)}><Check/></button><button className="icon-btn no" disabled={busy===r.id} onClick={()=>review(r.id,false)}><X/></button></div>}</td></tr>)}</tbody></table></div></Card></>
}
function AdminRates(){
  const t=useTable("withdrawal_options");const [edit,setEdit]=useState(null);const empty={name:"",min_eggs:1,max_eggs:9,rate_per_egg:10,active:true};const [f,setF]=useState(empty);
  const save=async(e)=>{e.preventDefault();try{if(edit?.id)await rpc("admin_update_withdrawal_option",{p_id:edit.id,p_name:f.name,p_min_eggs:Number(f.min_eggs),p_max_eggs:Number(f.max_eggs),p_rate_per_egg:Number(f.rate_per_egg),p_active:f.active});else await rpc("admin_create_withdrawal_option",{p_name:f.name,p_min_eggs:Number(f.min_eggs),p_max_eggs:Number(f.max_eggs),p_rate_per_egg:Number(f.rate_per_egg),p_active:f.active});setEdit(null);setF(empty);t.load()}catch(e){alert(errText(e))}};
  return <><AdminTitle title="Withdrawal rates" add={()=>setEdit({new:true})}/><Card><div className="table-wrap"><table><thead><tr><th>Name</th><th>Range</th><th>Rate</th><th>Active</th><th/></tr></thead><tbody>{t.rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.min_eggs}–{r.max_eggs}</td><td>{money(r.rate_per_egg)}/egg</td><td><Toggle checked={r.active} onChange={async(v)=>{await rpc("admin_update_withdrawal_option",{p_id:r.id,p_name:r.name,p_min_eggs:r.min_eggs,p_max_eggs:r.max_eggs,p_rate_per_egg:Number(r.rate_per_egg),p_active:v});t.load()}}/></td><td><button className="icon-btn" onClick={()=>{setEdit(r);setF({...r})}}><Pencil size={16}/></button></td></tr>)}</tbody></table></div></Card>{edit&&<Modal title={edit.new?"Add rate":"Edit rate"} onClose={()=>setEdit(null)}><form onSubmit={save}><Field label="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/><div className="two"><Field label="Minimum eggs" type="number" min="1" value={f.min_eggs} onChange={e=>setF({...f,min_eggs:e.target.value})}/><Field label="Maximum eggs" type="number" min="1" value={f.max_eggs} onChange={e=>setF({...f,max_eggs:e.target.value})}/></div><Field label="Rate per egg" type="number" min="0" value={f.rate_per_egg} onChange={e=>setF({...f,rate_per_egg:e.target.value})}/><label className="check"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Active</label><Button><Check/>Save rate</Button></form></Modal>}</>
}
function AdminSettings(){
  const [s,setS]=useState(null);const [busy,setBusy]=useState(false);
  const load=async()=>{const {data,error}=await supabase.from("site_settings").select("*").eq("id",1).single();if(error)alert(errText(error));else setS(data)};
  useEffect(()=>{load()},[]);
  const save=async()=>{setBusy(true);try{const {error}=await supabase.from("site_settings").update({site_name:s.site_name,admin_phone:s.admin_phone,whatsapp_number:s.whatsapp_number,egg_value:Number(s.egg_value),referral_commission_percent:Number(s.referral_commission_percent)}).eq("id",1);if(error)throw error;alert("Settings saved.")}catch(e){alert(errText(e))}finally{setBusy(false)}};
  if(!s)return <Card>Loading settings...</Card>;
  return <><div className="page-title"><div><span className="eyebrow">CONFIGURATION</span><h2>Site settings</h2></div></div><Card><div className="two"><Field label="Site name" value={s.site_name} onChange={e=>setS({...s,site_name:e.target.value})}/><Field label="Egg base value" type="number" value={s.egg_value} onChange={e=>setS({...s,egg_value:e.target.value})}/></div><div className="two"><Field label="Admin phone" value={s.admin_phone||""} onChange={e=>setS({...s,admin_phone:e.target.value})}/><Field label="WhatsApp number" value={s.whatsapp_number||""} onChange={e=>setS({...s,whatsapp_number:e.target.value})}/></div><Field label="Default referral commission % (1–100)" type="number" min="1" max="100" value={s.referral_commission_percent} onChange={e=>setS({...s,referral_commission_percent:e.target.value})}/><Button disabled={busy}><Check/>Save settings</Button></Card><Card><h3>Payment control</h3><p className="muted">Payment method names, account numbers, instructions and active status are managed from <b>Payments</b>. This supports multiple payment methods.</p></Card></>
}
function Empty({text}){return <div className="empty"><FileText size={24}/><span>{text}</span></div>}
