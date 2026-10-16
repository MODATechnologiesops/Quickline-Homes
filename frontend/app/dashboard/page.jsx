"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {api} from "../../lib/api";

const links=[["⌂","Properties","/properties"],
["♙","Tenants","/tenants"],
["↗","Payments","/payments"],
["⚒","Maintenance","/maintenance"],
["▦","Marketplace","/marketplace"]];

export default function Dashboard(){
    const [user,setUser]=useState({}),
    [summary,setSummary]=useState(null),
    [error,setError]=useState("");const router=useRouter();

 useEffect(()=>{
    if(!localStorage.getItem("quickline_token")){
        router.replace("/login");return}

        let currentUser;
        try {
            currentUser = JSON.parse(localStorage.getItem("quickline_user") || "{}");
            setUser(currentUser);
        } catch {
            setError("Saved user information is invalid. Please log in again.");
            return;
        }

        const dashboardPath = {
            admin: "/dashboard/admin",
            landlord: "/dashboard/landlord",
            tenant: "/dashboard/tenant",
        }[currentUser.role];

        if (!dashboardPath) {
            setError("Your account role is missing. Please log in again.");
            return;
        }

        api(dashboardPath)
        .then(r=>setSummary(r.dashboard||r.data?.dashboard||r.data||r))
        .catch(e=>setError(e.message))},[router]);

 const stats = user.role === "landlord"
    ? [["Properties",summary?.totalProperties],
       ["Occupied units",summary?.occupiedUnits],
       ["Payments collected",summary?.totalCollected],
       ["Open maintenance",summary?.pendingMaintenance]]
    : user.role === "tenant"
    ? [["Active lease",summary?summary.lease?"Yes":"No":undefined],
       ["Recent payments",summary?.recentPayments?.length],
       ["Maintenance requests",summary?.maintenanceRequests?.length]]
    : [["Users",summary?.totalUsers],
       ["Landlords",summary?.totalLandlords],
       ["Tenants",summary?.totalTenants],
       ["Completed payments",summary?.totalPayments]];

 return <div className="dashboard">
    <aside className="dash-side">
        <BrandMini/><small>WORKSPACE</small>
        <a className="selected" href="/dashboard">
          ◫ &nbsp; Overview
        </a>

        {links.map(([i,t,u])=>
         <a href={u} key={u}>{i} &nbsp; {t}</a>)}
         <button onClick={()=>{localStorage.removeItem("quickline_token");
           localStorage.removeItem("quickline_user");
           router.push("/login")}}>↪ &nbsp; Log out
         </button>
    </aside>

         <main className="dash-main">
            <header>
                <div><small>WORKSPACE / OVERVIEW</small>
                <h1>Dashboard</h1>
                <p className="muted">A clear view of your property operations.</p>
                </div>
                <a className="btn" href="/marketplace">Explore marketplace ↗</a>
            </header>

                <div className="welcome">
                    <strong>Welcome{user.first_name||user.firstName?" back, "+(user.first_name||user.firstName):""} to Quickline Homes</strong>
                    <p>Manage your spaces, people and payments from one workspace.</p>
                </div>
                  {error&&
                    <div className="error">
                        API connection: {error}. Check the dashboard route and backend port.
                    </div>}
                    <div className="stats">
                        {stats.map(([k,v])=>
                        <article key={k}><small>{k}</small><strong>{v??"—"}</strong><span>Live data when API is connected</span></article>)}
                    </div>

                    <section className="quick">
                        <h2>Quick actions</h2>
                        {user.role==="admin"&&
                        <p className="admin-dashboard-actions">
                            <a className="btn secondary" href="/admin/marketers">Review marketer access requests</a>
                            <a className="btn secondary" href="/admin/integrations">Manage listing sources</a>
                            <a className="btn" href="/admin/services">Manage service requests</a>
                        </p>}
                        <div className="cards">
                            {links.map(([i,t,u])=><a className="category" href={u} key={u}>
                                <span className="cat-icon">{i}</span>
                                <h3>{t}</h3>
                                <p>Open {t.toLowerCase()} workspace</p>
                                <b>Open →</b></a>)}
                        </div>
                    </section>

                    <p className="foot">Quickline Homes • Your Property. Our Priority. Your Peace of Mind.</p>
        </main>
    </div>}

function BrandMini(){return <a className="brand" href="/">
<span className="logo">Q<span>H</span></span>
<span><strong>quickline</strong><small>HOMES</small></span></a>}
