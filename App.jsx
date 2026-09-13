import React, { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseKey } from "./lib/supabase";
import {
  ArrowRight, BadgeCheck, Banknote, Bird, Check, ChevronRight, Clock3, Eye,
  Coins, Copy, CreditCard, Egg, Gift, Home, LogOut, Menu, Pencil,
  Plus, RefreshCw, Settings, ShieldCheck, ShoppingBag, Smartphone,
  Sparkles, Trash2, User, Users, Wallet, X
} from "lucide-react";

const money = n => `Rs ${Number(n || 0).toLocaleString()}`;
const fmt = d => d ? new Date(d).toLocaleString() : "—";
const errText = e => e?.message || e?.error_description || "Something went wrong.";
const supa = async (promise) => { const {data,error}=await promise; if(error) throw error; return data; };

function Button({children,variant="primary",...p}) {
  return <button className={`btn ${variant}`} {...p}>{children}</button>;
}
function Card({children,className=""}) { return <section className={`card ${className}`}>{children}</section>; }
function Field({label,...p}) { return <label className="field"><span>{label}</span><input {...p}/></label>; }
function Select({label,children,...p}) { return <label className="field"><span>{label}</span><select {...p}>{children}</select></label>; }
function Notice({type="info",children,onClose}) {
  return <div className={`notice ${type}`}>{children}{onClose&&<button onClick={onClose}><X size={16}/></button>}</div>;
}
function Modal({title,onClose,children}) {
  return <div className="modal-back"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={onClose}><X/></button></div>{children}</div></div>;
}

async function roleAndProfile() {
  const {data:{user}} = await supabase.auth.getUser();
  if(!user) return {user:null,profile:null};
  const profile = await supa(supabase.rpc("get_my_profile"));
  return {user,profile};
}

export default function App(){
  const [session,setSession]=useState(null), [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true), [error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        if(!hasSupabaseKey) throw new Error("Supabase publishable/anon key is missing. Add VITE_SUPABASE_PUBLISHABLE_KEY in Netlify.");
        const {data:{session}}=await supabase.auth.getSession();
        if(!alive)return;
        setSession(session);
        if(session){ try{setProfile(await supa(supabase.rpc("get_my_profile")));}catch(e){setError(errText(e));} }
      }catch(e){if(alive)setError(errText(e));}
      finally{if(alive)setLoading(false);}
    })();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_,s)=>{
      setSession(s);
      if(s){try{setProfile(await supa(supabase.rpc("get_my_profile")));}catch(e){setError(errText(e));}}
      else setProfile(null);
    });
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);
  if(loading)return <div className="splash"><div className="brand-mark"><Bird/></div><h1>Duck Farming</h1><span>Loading your farm…</span></div>;
  if(!session)return <AuthScreen error={error} setError={setError}/>;
  if(profile?.role==="admin") return <AdminApp profile={profile} onLogout={()=>supabase.auth.signOut()} error={error} setError={setError}/>;
  return <CustomerApp profile={profile} onLogout={()=>supabase.auth.signOut()} error={error} setError={setError}/>;
}

function AuthScreen({error,setError}){
  const [mode,setMode]=useState("login"), [email,setEmail]=useState(""), [password,setPassword]=useState("");
  const [name,setName]=useState(""),[phone,setPhone]=useState(""),[ref,setRef]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    try{
      if(mode==="login"){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
      else{
        const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,phone,referral_code:ref.trim().toUpperCase()||null}}});
        if(error)throw error;
        if(data.user && !data.session) setError("Account created. Check your email to confirm, then log in.");
      }
    }catch(e){setError(errText(e));}finally{setBusy(false);}
  }
  return <main className="auth"><div className="auth-art"><div className="brand-mark big"><Bird/></div><p className="eyebrow">PREMIUM DUCK FARMING</p><h1>Grow your farm.<br/><em>Harvest every day.</em></h1><p>Own productive ducks, collect eggs on schedule, build referral rewards and withdraw your earnings.</p><div className="stat-row"><div><b>24h</b><span>Default egg cycle</span></div><div><b>80d</b><span>Default lifetime</span></div><div><b>3×</b><span>Referral days</span></div></div></div>
    <div className="auth-box"><div className="brand-line"><Bird/><b>Duck Farming</b></div><div className="tabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Login</button><button className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Create account</button></div>
      {error&&<Notice type="error" onClose={()=>setError("")}>{error}</Notice>}
      <form onSubmit={submit}>
        {mode==="register"&&<><Field label="Full name" value={name} onChange={e=>setName(e.target.value)} required/><Field label="Phone" value={phone} onChange={e=>setPhone(e.target.value)} required/><Field label="Referral ID (optional)" value={ref} onChange={e=>setRef(e.target.value)} /></>}
        <Field label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <Field label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="6" required/>
        <Button disabled={busy}>{busy?<RefreshCw className="spin"/>:<ArrowRight/>}{mode==="login"?"Login securely":"Create account"}</Button>
      </form>
    </div></main>
}

function CustomerApp({profile,onLogout,error,setError}){
  const [tab,setTab]=useState("home"),[menu,setMenu]=useState(false),[refresh,setRefresh]=useState(0);
  const nav=[["home","Home",Home],["ducks","My Ducks",Bird],["wallet","Egg Wallet",Wallet],["referral","Referral Hub",Gift],["withdraw","Withdraw",Banknote],["profile","Profile",User]];
  const content = {home:<CustomerHome profile={profile} go={setTab} refresh={refresh}/>,ducks:<MyDucks refresh={refresh}/>,wallet:<WalletPage refresh={refresh}/>,referral:<ReferralPage profile={profile} refresh={refresh}/>,withdraw:<WithdrawPage refresh={refresh}/>,profile:<ProfilePage profile={profile}/>}[tab];
  return <div className="app-shell"><header className="topbar"><button className="icon-btn mobile" onClick={()=>setMenu(!menu)}><Menu/></button><div className="brand-line"><div className="brand-mark"><Bird/></div><b>Duck Farming</b></div><div className="top-actions"><span className="user-chip"><User size={15}/>{profile?.full_name||"Customer"}</span><button className="icon-btn" onClick={()=>setRefresh(x=>x+1)}><RefreshCw/></button><button className="icon-btn" onClick={onLogout}><LogOut/></button></div></header>
    <div className="layout"><aside className={menu?"open":""}>{nav.map(([id,label,I])=><button key={id} className={tab===id?"nav-active":""} onClick={()=>{setTab(id);setMenu(false)}}><I size={18}/>{label}<ChevronRight size={14}/></button>)}</aside><main className="content">{error&&<Notice type="error" onClose={()=>setError("")}>{error}</Notice>}{content}</main></div></div>
}

function CustomerHome({profile,go,refresh}){
  const [wallet,setWallet]=useState({balance:0,total_eggs:0}),[ducks,setDucks]=useState([]),[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{await supa(supabase.rpc("claim_due_eggs"));const [w,d]=await Promise.all([supa(supabase.from("egg_wallets").select("*").eq("user_id",profile.id).maybeSingle()),supa(supabase.from("duck_purchases").select("*,ducks(name,price,lifetime_days,egg_interval_hours)").eq("user_id",profile.id).eq("status","active").order("created_at",{ascending:false})]);setWallet(w||{balance:0,total_eggs:0});setDucks(d||[]);}catch{}finally{setLoading(false)}})()},[refresh,profile.id]);
  return <><div className="hero"><div><p className="eyebrow">WELCOME BACK</p><h1>{profile?.full_name||"Farmer"}</h1><p>Your farm is working while you focus on growth.</p><Button onClick={()=>go("ducks")}>Explore ducks <ArrowRight/></Button></div><div className="hero-icon"><Bird size={86}/><Sparkles/></div></div>
    <div className="metrics"><Metric icon={Egg} label="Egg balance" value={wallet.total_eggs||0} sub={money(wallet.balance)}/><Metric icon={Bird} label="Active ducks" value={ducks.length} sub="producing"/><Metric icon={Gift} label="Referral ID" value={profile?.referral_code||"—"} sub="share & earn"/></div>
    <Card><div className="section-head"><div><p className="eyebrow">YOUR FARM</p><h2>Active ducks</h2></div><button className="text-btn" onClick={()=>go("ducks")}>View all <ArrowRight/></button></div>{loading?<div className="empty">Loading…</div>:ducks.length===0?<div className="empty"><Bird size={35}/><b>No active ducks yet</b><span>Buy your first duck to start earning eggs.</span><Button onClick={()=>go("ducks")}>Browse ducks</Button></div>:<div className="duck-grid">{ducks.slice(0,3).map(d=><DuckCard key={d.id} purchase={d} owned/>)}</div>}</Card></>
}
function Metric({icon:I,label,value,sub}){return <Card className="metric"><div className="metric-icon"><I/></div><div><span>{label}</span><b>{value}</b><small>{sub}</small></div></Card>}

function DuckCard({duck,purchase,owned,onBuy}){
 const d=duck||purchase?.ducks||{}; return <div className="duck-card"><div className="duck-photo"><Bird size={58}/><span>{owned?"ACTIVE":"AVAILABLE"}</span></div><div className="duck-info"><h3>{d.name||"Duck"}</h3><p>{owned?`${d.egg_interval_hours||24}h egg cycle · ${d.lifetime_days||80} days lifetime`:"Productive farm duck"}</p><div className="duck-bottom"><b>{money(d.price)}</b>{onBuy&&<Button onClick={onBuy}>Buy <ShoppingBag/></Button>}</div></div></div>
}

function MyDucks({refresh}){
 const [ducks,setDucks]=useState([]),[catalog,setCatalog]=useState([]),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null);
 useEffect(()=>{(async()=>{try{await supa(supabase.rpc("claim_due_eggs"));const {data:{user}}=await supabase.auth.getUser();const [a,b]=await Promise.all([supa(supabase.from("duck_purchases").select("*,ducks(name,price,lifetime_days,egg_interval_hours)").eq("user_id",user.id).order("created_at",{ascending:false})),supa(supabase.from("ducks").select("*").eq("active",true).order("created_at",{ascending:false})]);setDucks(a||[]);setCatalog(b||[])}catch(e){} })()},[refresh]);
 async function startBuy(d){setSelected(d)}
 return <><PageTitle eyebrow="FARM" title="Ducks" desc="Choose a duck and activate it after payment approval."/><Card><div className="section-head"><h2>My ducks</h2><span className="pill">{ducks.filter(x=>x.status==="active").length} active</span></div>{ducks.length?<div className="duck-grid">{ducks.map(p=><DuckCard key={p.id} purchase={p} owned/>)}</div>:<div className="empty">You don't own any ducks yet.</div>}</Card><Card><div className="section-head"><h2>Available ducks</h2><span className="pill">Admin managed</span></div><div className="duck-grid">{catalog.map(d=><DuckCard key={d.id} duck={d} onBuy={()=>startBuy(d)}/>)}</div></Card>{selected&&<BuyModal duck={selected} onClose={()=>setSelected(null)} onDone={()=>{setSelected(null);setBusy(!busy)}}/>}</>
}
function BuyModal({duck,onClose,onDone}){
 const [methods,setMethods]=useState([]),[method,setMethod]=useState(""),[tid,setTid]=useState(""),[slip,setSlip]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{supa(supabase.from("payment_methods").select("*").eq("active",true).order("created_at")).then(x=>{setMethods(x||[]);if(x?.[0])setMethod(x[0].name)}).catch(e=>setMsg(errText(e)))},[]);
 async function submit(e){e.preventDefault();setBusy(true);setMsg("");try{const {data:{user}}=await supabase.auth.getUser();const purchase=await supa(supabase.rpc("create_duck_purchase",{p_duck_id:duck.id}));let path=null;if(slip){const ext=slip.name.split(".").pop();const filePath=`${user.id}/${purchase.id}.${ext}`;const {error}=await supabase.storage.from("payment-slips").upload(filePath,slip,{upsert:true});if(error)throw error;path=filePath}await supa(supabase.from("payment_requests").insert({user_id:user.id,duck_purchase_id:purchase.id,amount:duck.price,payment_method:method,transaction_id:tid,payment_slip_path:path,status:"pending"}));setMsg("Payment submitted. Admin will review your TID and slip.");setTimeout(onDone,900)}catch(e){setMsg(errText(e))}finally{setBusy(false)}}
 return <Modal title={`Buy ${duck.name}`} onClose={onClose}><div className="buy-summary"><Bird size={45}/><div><b>{duck.name}</b><span>{money(duck.price)} · {duck.egg_interval_hours}h cycle · {duck.lifetime_days} days</span></div></div>{msg&&<Notice type={msg.startsWith("Payment")?"success":"error"}>{msg}</Notice>}<form onSubmit={submit}><Select label="Payment method" value={method} onChange={e=>setMethod(e.target.value)} required>{methods.map(m=><option key={m.id}>{m.name}</option>)}</Select>{methods.find(m=>m.name===method)&&(()=>{const m=methods.find(x=>x.name===method);return <div className="payment-detail"><div><span>ACCOUNT NAME</span><b>{m.account_name||"—"}</b></div><div><span>ACCOUNT NUMBER</span><b className="mono">{m.account_number||"—"}</b></div>{m.instructions&&<div><span>INSTRUCTIONS</span><p>{m.instructions}</p></div>}</div>})()}<Field label="Transaction ID (TID)" value={tid} onChange={e=>setTid(e.target.value)} required/><label className="field"><span>Payment slip</span><input type="file" accept="image/*,.pdf" onChange={e=>setSlip(e.target.files?.[0]||null)} required/></label><Button disabled={busy}>{busy?<RefreshCw className="spin"/>:<Check/>}Submit payment</Button></form></Modal>
}

function WalletPage({refresh}){
 const [w,setW]=useState(null),[tx,setTx]=useState([]);
 useEffect(()=>{(async()=>{try{await supa(supabase.rpc("claim_due_eggs"));const {data:{user}}=await supabase.auth.getUser();setW(await supa(supabase.from("egg_wallets").select("*").eq("user_id",user.id).maybeSingle()));setTx(await supa(supabase.from("egg_transactions").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30)))}catch{}})()},[refresh]);
 return <><PageTitle eyebrow="WALLET" title="Egg Wallet" desc="Your duck eggs and referral eggs are credited here."/><div className="metrics"><Metric icon={Egg} label="Total eggs" value={w?.total_eggs||0} sub="available"/><Metric icon={Coins} label="Balance" value={money(w?.balance)} sub="withdrawable"/></div><Card><div className="section-head"><h2>Egg history</h2></div><History rows={tx}/></Card></>
}

function ReferralPage({profile,refresh}){
 const [rows,setRows]=useState([]),[copied,setCopied]=useState(false);
 useEffect(()=>{(async()=>{try{await supa(supabase.rpc("claim_due_referral_eggs"));setRows(await supa(supabase.from("referral_rewards").select("*,referred:profiles!referral_rewards_referred_user_id_fkey(full_name,customer_id)").eq("referrer_id",profile.id).order("created_at",{ascending:false})))}catch{}})()},[refresh,profile.id]);
 const copy=()=>{navigator.clipboard?.writeText(profile.referral_code||"");setCopied(true);setTimeout(()=>setCopied(false),1500)};
 return <><PageTitle eyebrow="GROW TOGETHER" title="Referral Hub" desc="Invite friends. When they buy at least one duck and payment is approved, your 3-day reward starts."/><Card className="ref-card"><div className="ref-glow"><Gift size={60}/></div><div><p className="eyebrow">YOUR REFERRAL ID</p><div className="ref-code">{profile.referral_code||"—"}<button onClick={copy}>{copied?<Check/>:<Copy/>}</button></div><p>Share this ID with new customers.</p></div></Card><Card><div className="section-head"><h2>Referral rewards</h2><span className="pill">1 egg / 24h · 3 days</span></div><History rows={rows.map(r=>({...r,description:`Referral reward from ${r.referred?.full_name||r.referred?.customer_id||"customer"}`,eggs:r.earned_eggs||0,amount:0,created_at:r.created_at}))}/></Card></>
}

function WithdrawPage({refresh}){
 const [w,setW]=useState(null),[opts,setOpts]=useState([]),[form,setForm]=useState({option:"",method:"JazzCash",holder:"",account:"",eggs:""}),[msg,setMsg]=useState("");
 useEffect(()=>{(async()=>{try{await supa(supabase.rpc("claim_due_eggs"));await supa(supabase.rpc("claim_due_referral_eggs"));const {data:{user}}=await supabase.auth.getUser();const [w,o]=await Promise.all([supa(supabase.from("egg_wallets").select("*").eq("user_id",user.id).maybeSingle()),supa(supabase.from("withdrawal_options").select("*").eq("active",true).order("min_eggs"))]);setW(w);setOpts(o||[]);if(o?.[0])setForm(f=>({...f,option:o[0].id,eggs:String(o[0].min_eggs)}))}catch(e){setMsg(errText(e))}})()},[refresh]);
 const opt=opts.find(x=>x.id===form.option);
 const eggs=Number(form.eggs||0);
 const valid=opt&&Number.isInteger(eggs)&&eggs>=opt.min_eggs&&eggs<=opt.max_eggs&&eggs<=(w?.total_eggs||0);
 async function submit(e){e.preventDefault();setMsg("");if(!valid)return setMsg("Enter an egg amount inside the selected range and within your available balance.");try{await supa(supabase.rpc("create_withdrawal",{withdrawal_eggs:eggs,withdrawal_amount:eggs*Number(opt.rate_per_egg),withdrawal_method:form.method,withdrawal_account:form.account,withdrawal_holder_name:form.holder,withdrawal_rate:Number(opt.rate_per_egg)}));setMsg("Withdrawal request submitted for admin review.");setW(x=>({...x,total_eggs:(x?.total_eggs||0)-eggs}));setForm(f=>({...f,eggs:String(opt.min_eggs)}))}catch(e){setMsg(errText(e))}}
 return <><PageTitle eyebrow="WITHDRAW" title="Withdraw eggs" desc="Choose a payout tier, enter the eggs you want to withdraw, and send it for approval."/><Card className="balance-card"><div><span>AVAILABLE EGGS</span><b>{w?.total_eggs||0}</b><small>{money(w?.balance)} wallet value</small></div><div className="balance-badge"><Wallet/><span>Secure payout review</span></div></Card><Card><div className="section-head"><div><p className="eyebrow">PAYOUT</p><h2>Withdrawal request</h2></div></div>{msg&&<Notice type={msg.startsWith("Withdrawal")?"success":"error"}>{msg}</Notice>}<form onSubmit={submit}><Select label="Egg range / rate" value={form.option} onChange={e=>{const o=opts.find(x=>x.id===e.target.value);setForm({...form,option:e.target.value,eggs:String(o?.min_eggs||"")})}}>{opts.map(o=><option key={o.id} value={o.id}>{o.min_eggs}–{o.max_eggs} eggs · {money(o.rate_per_egg)}/egg</option>)}</Select><Field label="Eggs to withdraw" type="number" min={opt?.min_eggs||1} max={Math.min(opt?.max_eggs||1,w?.total_eggs||1)} value={form.eggs} onChange={e=>setForm({...form,eggs:e.target.value})} required/><Select label="Payout method" value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option>JazzCash</option><option>Easypaisa</option><option>Bank</option></Select><Field label="Account holder name" value={form.holder} onChange={e=>setForm({...form,holder:e.target.value})} required/><Field label="Account number" value={form.account} onChange={e=>setForm({...form,account:e.target.value})} required/>{opt&&<div className="withdraw-total"><span>{eggs||0} eggs × {money(opt.rate_per_egg)}</span><b>{money((eggs||0)*Number(opt.rate_per_egg))}</b></div>}<Button disabled={!valid}><Banknote/>Submit withdrawal</Button></form></Card></>
}
function ProfilePage({profile}){
 const [name,setName]=useState(profile?.full_name||""),[phone,setPhone]=useState(profile?.phone||""),[msg,setMsg]=useState("");
 async function save(e){e.preventDefault();try{await supa(supabase.rpc("customer_update_profile",{p_full_name:name,p_phone:phone}));setMsg("Profile updated.")}catch(e){setMsg(errText(e))}}
 return <><PageTitle eyebrow="ACCOUNT" title="Profile" desc="Your customer information."/><Card><form onSubmit={save}><Field label="Customer ID" value={profile?.customer_id||""} readOnly/><Field label="Email" value={profile?.email||""} readOnly/><Field label="Full name" value={name} onChange={e=>setName(e.target.value)}/><Field label="Phone" value={phone} onChange={e=>setPhone(e.target.value)}/>{msg&&<Notice type="success">{msg}</Notice>}<Button><Check/>Save profile</Button></form></Card></>
}

function AdminApp({profile,onLogout,error,setError}){
 const [tab,setTab]=useState("overview"),[refresh,setRefresh]=useState(0);
 const tabs=[["overview","Overview",Home],["ducks","Ducks",Bird],["deposits","Deposits",CreditCard],["customers","Customers",Users],["methods","Payment Methods",Smartphone],["withdrawals","Withdrawals",Banknote],["rates","Withdrawal Rates",Coins],["settings","Settings",Settings]];
 const content={overview:<AdminOverview refresh={refresh}/>,ducks:<AdminDucks refresh={refresh}/>,deposits:<AdminDeposits refresh={refresh}/>,customers:<AdminCustomers refresh={refresh}/>,methods:<AdminMethods refresh={refresh}/>,withdrawals:<AdminWithdrawals refresh={refresh}/>,rates:<AdminRates refresh={refresh}/>,settings:<AdminSettings refresh={refresh}/>} [tab];
 return <div className="app-shell admin-shell"><header className="topbar"><div className="brand-line"><div className="brand-mark"><ShieldCheck/></div><b>Duck Farming <small>ADMIN</small></b></div><div className="top-actions"><button className="icon-btn" onClick={()=>setRefresh(x=>x+1)}><RefreshCw/></button><button className="icon-btn" onClick={onLogout}><LogOut/></button></div></header><div className="layout"><aside>{tabs.map(([id,label,I])=><button key={id} className={tab===id?"nav-active":""} onClick={()=>setTab(id)}><I size={18}/>{label}<ChevronRight size={14}/></button>)}</aside><main className="content">{error&&<Notice type="error" onClose={()=>setError("")}>{error}</Notice>}{content}</main></div></div>
}

function PageTitle({eyebrow,title,desc}){return <div className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{desc}</p></div>}
function History({rows=[]}){return rows.length?<div className="history">{rows.map(r=><div className="history-row" key={r.id}><div className="history-icon"><Egg/></div><div><b>{r.description||r.transaction_type||"Transaction"}</b><span>{fmt(r.created_at)}</span></div><strong>+{r.eggs||0}</strong></div>)}</div>:<div className="empty">No transactions yet.</div>}

function AdminOverview({refresh}){
 const [stats,setStats]=useState({customers:0,ducks:0,pending:0,withdraw:0});
 useEffect(()=>{(async()=>{try{const [c,d,p,w]=await Promise.all([supa(supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","customer")),supa(supabase.from("ducks").select("id",{count:"exact",head:true})),supa(supabase.from("payment_requests").select("id",{count:"exact",head:true}).eq("status","pending")),supa(supabase.from("withdrawal_requests").select("id",{count:"exact",head:true}).eq("status","pending"))]);setStats({customers:c?.count||0,ducks:d?.count||0,pending:p?.count||0,withdraw:w?.count||0})}catch{}})()},[refresh]);
 return <><PageTitle eyebrow="CONTROL CENTER" title="Admin Overview" desc="Manage the Duck Farming platform from one place."/><div className="metrics"><Metric icon={Users} label="Customers" value={stats.customers} sub="registered"/><Metric icon={Bird} label="Duck types" value={stats.ducks} sub="configured"/><Metric icon={CreditCard} label="Pending deposits" value={stats.pending} sub="needs review"/><Metric icon={Banknote} label="Pending withdrawals" value={stats.withdraw} sub="needs review"/></div><Card><div className="admin-note"><ShieldCheck/><div><b>Admin access is protected</b><span>Customer accounts cannot open this dashboard. Admin operations use secure database RPCs.</span></div></div></Card></>
}

function AdminDucks({refresh}){
 const empty={name:"",price:"",lifetime_days:80,egg_interval_hours:24,active:true};const [rows,setRows]=useState([]),[form,setForm]=useState(empty),[edit,setEdit]=useState(null),[msg,setMsg]=useState("");
 async function load(){try{setRows(await supa(supabase.from("ducks").select("*").order("created_at",{ascending:false})))}catch(e){setMsg(errText(e))}}
 useEffect(()=>{load()},[refresh]);
 async function save(e){e.preventDefault();try{await supa(supabase.rpc(edit?"admin_update_duck":"admin_create_duck",edit?{p_id:edit,...form,p_price:Number(form.price),p_lifetime_days:Number(form.lifetime_days),p_egg_interval_hours:Number(form.egg_interval_hours)}:{p_name:form.name,p_price:Number(form.price),p_lifetime_days:Number(form.lifetime_days),p_egg_interval_hours:Number(form.egg_interval_hours),p_active:form.active}));setForm(empty);setEdit(null);load();setMsg("Duck saved.")}catch(e){setMsg(errText(e))}}
 return <><PageTitle eyebrow="CATALOG" title="Duck Types" desc="Add, edit, enable or disable duck products."/><Card><form className="admin-form" onSubmit={save}><Field label="Duck name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><Field label="Price (Rs)" type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/><Field label="Lifetime (days, 1–100)" type="number" min="1" max="100" value={form.lifetime_days} onChange={e=>setForm({...form,lifetime_days:e.target.value})} required/><Field label="Egg interval (hours)" type="number" min="1" value={form.egg_interval_hours} onChange={e=>setForm({...form,egg_interval_hours:e.target.value})} required/><label className="switch"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span>Enabled</span></label><Button>{edit?<><Check/>Update duck</>:<><Plus/>Add duck</>}</Button>{edit&&<Button type="button" variant="ghost" onClick={()=>{setEdit(null);setForm(empty)}}>Cancel</Button>}</form>{msg&&<Notice type="info">{msg}</Notice>}<AdminTable rows={rows} columns={["Name","Price","Lifetime","Cycle","Status","Action"]} render={r=><><b>{r.name}</b><span>{money(r.price)}</span><span>{r.lifetime_days} days</span><span>{r.egg_interval_hours}h</span><span className={`status ${r.active?"ok":"off"}`}>{r.active?"Enabled":"Disabled"}</span><button className="small-btn" onClick={()=>{setEdit(r.id);setForm({...r,price:String(r.price)})}}><Pencil/></button></>}/></Card></>
}

function AdminMethods({refresh}){
 const empty={name:"",account_name:"",account_number:"",instructions:"",active:true};const [rows,setRows]=useState([]),[form,setForm]=useState(empty),[edit,setEdit]=useState(null);
 const load=()=>supa(supabase.from("payment_methods").select("*").order("created_at",{ascending:false})).then(setRows).catch(()=>{});
 useEffect(load,[refresh]);
 async function save(e){e.preventDefault();try{await supa(supabase.rpc(edit?"admin_update_payment_method":"admin_create_payment_method",edit?{p_id:edit,...form}:{...form}));setForm(empty);setEdit(null);load()}catch(e){alert(errText(e))}}
 return <><PageTitle eyebrow="PAYMENTS" title="Payment Methods" desc="Control the payment methods customers see at checkout."/><Card><form className="admin-form" onSubmit={save}><Field label="Method name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><Field label="Account name" value={form.account_name} onChange={e=>setForm({...form,account_name:e.target.value})}/><Field label="Account number" value={form.account_number} onChange={e=>setForm({...form,account_number:e.target.value})} required/><Field label="Instructions" value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/><label className="switch"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span>Enabled</span></label><Button><Plus/>{edit?"Update method":"Add method"}</Button></form><AdminTable rows={rows} columns={["Method","Account","Number","Status","Action"]} render={r=><><b>{r.name}</b><span>{r.account_name}</span><span>{r.account_number}</span><span className={`status ${r.active?"ok":"off"}`}>{r.active?"Enabled":"Disabled"}</span><button className="small-btn" onClick={()=>{setEdit(r.id);setForm({...r})}}><Pencil/></button></>}/></Card></>
}

function AdminRates({refresh}){
 const empty={name:"",min_eggs:1,max_eggs:9,rate_per_egg:10,active:true};const [rows,setRows]=useState([]),[form,setForm]=useState(empty),[edit,setEdit]=useState(null);
 const load=()=>supa(supabase.from("withdrawal_options").select("*").order("min_eggs")).then(setRows).catch(()=>{});
 useEffect(load,[refresh]);
 async function save(e){e.preventDefault();try{await supa(supabase.rpc(edit?"admin_update_withdrawal_option":"admin_create_withdrawal_option",edit?{p_id:edit,...form,p_min_eggs:Number(form.min_eggs),p_max_eggs:Number(form.max_eggs),p_rate_per_egg:Number(form.rate_per_egg)}:{p_name:form.name,p_min_eggs:Number(form.min_eggs),p_max_eggs:Number(form.max_eggs),p_rate_per_egg:Number(form.rate_per_egg),p_active:form.active}));setForm(empty);setEdit(null);load()}catch(e){alert(errText(e))}}
 return <><PageTitle eyebrow="WITHDRAWAL" title="Withdrawal Rates" desc="Configure egg ranges and payout value per egg."/><Card><form className="admin-form" onSubmit={save}><Field label="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><Field label="Minimum eggs" type="number" value={form.min_eggs} onChange={e=>setForm({...form,min_eggs:e.target.value})}/><Field label="Maximum eggs" type="number" value={form.max_eggs} onChange={e=>setForm({...form,max_eggs:e.target.value})}/><Field label="Rate per egg (Rs)" type="number" value={form.rate_per_egg} onChange={e=>setForm({...form,rate_per_egg:e.target.value})}/><label className="switch"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span>Enabled</span></label><Button><Plus/>{edit?"Update rate":"Add rate"}</Button></form><AdminTable rows={rows} columns={["Range","Rate","Status","Action"]} render={r=><><b>{r.name}</b><span>{money(r.rate_per_egg)}/egg</span><span className={`status ${r.active?"ok":"off"}`}>{r.active?"Enabled":"Disabled"}</span><button className="small-btn" onClick={()=>{setEdit(r.id);setForm({...r})}}><Pencil/></button></>}/></Card></>
}

function AdminDeposits({refresh}){
 const [rows,setRows]=useState([]),[msg,setMsg]=useState("");
 const load=()=>supa(supabase.from("payment_requests").select("*,profiles!payment_requests_user_id_fkey(full_name,phone,customer_id),duck_purchases(*,ducks(name))").order("created_at",{ascending:false})).then(setRows).catch(e=>setMsg(errText(e)));
 useEffect(load,[refresh]);
 async function review(id,approve){try{await supa(supabase.rpc(approve?"approve_payment":"reject_payment",{p_payment_request_id:id,p_admin_note:approve?"Approved":"Rejected"}));load()}catch(e){setMsg(errText(e))}}
 async function viewSlip(path){if(!path)return setMsg("This deposit has no payment slip.");try{const {signedUrl}=await supa(supabase.storage.from("payment-slips").createSignedUrl(path,3600));window.open(signedUrl,"_blank","noopener,noreferrer")}catch(e){setMsg(errText(e))}}
 return <><PageTitle eyebrow="REVIEW" title="Deposits" desc="Verify the payment slip and TID before approving a duck purchase."/><Card>{msg&&<Notice type="error" onClose={()=>setMsg("")}>{msg}</Notice>}<AdminTable rows={rows} columns={["Customer","Duck","Amount","TID","Slip","Status","Action"]} render={r=><><div><b>{r.profiles?.full_name||"Customer"}</b><span>{r.profiles?.customer_id||"—"} · {r.profiles?.phone||"—"}</span></div><span>{r.duck_purchases?.ducks?.name||"Duck"}</span><span>{money(r.amount)}</span><span className="mono">{r.transaction_id}</span><button className="small-btn" onClick={()=>viewSlip(r.payment_slip_path)} title="View payment slip"><Eye/></button><span className={`status ${r.status==="approved"?"ok":r.status==="rejected"?"bad":"wait"}`}>{r.status}</span><div className="actions">{r.status==="pending"&&<><button className="small-btn good" onClick={()=>review(r.id,true)}><Check/></button><button className="small-btn badbtn" onClick={()=>review(r.id,false)}><X/></button></>}</div></>}/></Card></>
}
function AdminWithdrawals({refresh}){
 const [rows,setRows]=useState([]);const load=()=>supa(supabase.from("withdrawal_requests").select("*,profiles!withdrawal_requests_user_id_fkey(full_name,phone,customer_id)").order("created_at",{ascending:false})).then(setRows).catch(()=>{});useEffect(load,[refresh]);
 async function review(id,approve){try{await supa(supabase.rpc(approve?"approve_withdrawal_request":"reject_withdrawal_request",{p_request_id:id,p_admin_note:approve?"Approved":"Rejected"}));load()}catch(e){alert(errText(e))}}
 return <><PageTitle eyebrow="PAYOUTS" title="Withdrawals" desc="Review customer payout details and approve or reject."/><Card><AdminTable rows={rows} columns={["Customer","Eggs","Amount","Payout","Status","Action"]} render={r=><><div><b>{r.profiles?.full_name||"Customer"}</b><span>{r.profiles?.customer_id||r.profiles?.phone||""}</span></div><span>{r.eggs}</span><span>{money(r.amount)}</span><div><b>{r.payment_method}</b><span>{r.account_holder_name} · {r.account_number}</span></div><span className={`status ${r.status==="approved"?"ok":r.status==="rejected"?"bad":"wait"}`}>{r.status}</span><div className="actions">{r.status==="pending"&&<><button className="small-btn good" onClick={()=>review(r.id,true)}><Check/></button><button className="small-btn badbtn" onClick={()=>review(r.id,false)}><X/></button></>}</div></>}/></Card></>
}

function AdminCustomers({refresh}){
 const [rows,setRows]=useState([]);const load=()=>supa(supabase.from("profiles").select("*").eq("role","customer").order("created_at",{ascending:false})).then(setRows).catch(()=>{});useEffect(load,[refresh]);
 async function edit(r){const name=prompt("Full name",r.full_name||"");if(name===null)return;const phone=prompt("Phone",r.phone||"");if(phone===null)return;const cid=prompt("Customer ID",r.customer_id||"");if(cid===null)return;const pct=prompt("Referral commission (1-100)",String(r.referral_commission_percent||1));if(pct===null)return;try{await supa(supabase.rpc("admin_update_customer",{p_user_id:r.id,p_full_name:name,p_phone:phone,p_customer_id:cid,p_commission_percent:Number(pct)}));load()}catch(e){alert(errText(e))}}
 return <><PageTitle eyebrow="USERS" title="Customers" desc="Manage customer IDs, contact details and referral commission."/><Card><AdminTable rows={rows} columns={["Customer","Phone","Email","Referral ID","Commission","Action"]} render={r=><><div><b>{r.customer_id||"—"}</b><span>{r.full_name||"—"}</span></div><span>{r.phone||"—"}</span><span>{r.email||"—"}</span><span>{r.referral_code||"—"}</span><span>{r.referral_commission_percent||1}%</span><button className="small-btn" onClick={()=>edit(r)}><Pencil/></button></>}/></Card></>
}

function AdminSettings({refresh}){
 const [s,setS]=useState(null),[msg,setMsg]=useState("");
 useEffect(()=>{supa(supabase.from("site_settings").select("*").eq("id",1).maybeSingle()).then(setS).catch(e=>setMsg(errText(e)))},[refresh]);
 async function save(e){e.preventDefault();try{await supa(supabase.rpc("admin_update_settings",{p_site_name:s.site_name,p_admin_phone:s.admin_phone,p_whatsapp_number:s.whatsapp_number,p_egg_value:Number(s.egg_value||0),p_referral_commission_percent:Number(s.referral_commission_percent||1)}));setMsg("Settings saved.")}catch(e){setMsg(errText(e))}}
 if(!s)return <><PageTitle eyebrow="SETTINGS" title="Site Settings" desc="Loading…"/></>;
 return <><PageTitle eyebrow="SETTINGS" title="Site Settings" desc="Control your public platform settings."/><Card><form onSubmit={save}><Field label="Site name" value={s.site_name||"Duck Farming"} onChange={e=>setS({...s,site_name:e.target.value})}/><Field label="Admin phone" value={s.admin_phone||""} onChange={e=>setS({...s,admin_phone:e.target.value})}/><Field label="WhatsApp number" value={s.whatsapp_number||""} onChange={e=>setS({...s,whatsapp_number:e.target.value})}/><Field label="Egg value (Rs)" type="number" value={s.egg_value||0} onChange={e=>setS({...s,egg_value:e.target.value})}/><Field label="Default referral commission %" type="number" min="1" max="100" value={s.referral_commission_percent||1} onChange={e=>setS({...s,referral_commission_percent:e.target.value})}/>{msg&&<Notice type="info">{msg}</Notice>}<Button><Check/>Save settings</Button></form></Card></>
}

function AdminTable({rows,columns,render}){return <div className="table-wrap"><div className="admin-table head">{columns.map(c=><span key={c}>{c}</span>)}</div>{rows.length?rows.map(r=><div className="admin-table" key={r.id}>{render(r)}</div>):<div className="empty">No records.</div>}</div>}
