import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  TrendingUp, Users, Store, MessageSquare,
  LogOut, ShieldAlert, ShieldOff, ShieldCheck,
  AlertTriangle, BarChart2, Star,
  Package, RotateCcw, XCircle, Search,
} from "lucide-react";


const BADGE = {
  RETURN_ABUSE: { bg: "#ff9800", border: "#ff9800", text: "#fff", label: "Return Abuse" },
  SELLER_SUSPICIOUS: { bg: "#f44336", border: "#f44336", text: "#fff", label: "Seller Suspicious" },
  REPEATED_REVIEW: { bg: "#9c27b0", border: "#9c27b0", text: "#fff", label: "Repeated Review" },
  NONE: { bg: "#4caf50", border: "#4caf50", text: "#fff", label: "Clean" },
};

function riskColor(score) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

function filtered(list, nameKey, search) {
  return (list || []).filter(item =>
    (item[nameKey] || "").toLowerCase().includes(search.toLowerCase())
  );
}


export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/admin-fraud-dashboard");
      if (res.data.success) setData(res.data);
    } catch {
      showMsg("Failed to load dashboard — is the backend running?", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const showMsg = (text, type = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleBan = async (type, id, currentStatus) => {
    const isBanned = currentStatus === "Suspended";
    const endpoint = isBanned ? "/unban-user" : "/ban-user";
    const verb = isBanned ? "Unbanned" : "Banned";
    try {
      await axios.post(`http://127.0.0.1:8000${endpoint}`, { type, id });
      showMsg(`${verb} successfully`, "success");
      fetchDashboard(true);
    } catch {
      showMsg("Action failed — try again", "error");
    }
  };

  if (loading) return <LoadingScreen />;

  const ov = data?.overview || {};
  const customers = data?.customers || [];
  const sellers = data?.sellers || [];
  const reviews = data?.reviews || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart2, count: null },
    { id: "customers", label: "Return Abuse", icon: Users, count: customers.length },
    { id: "sellers", label: "Sellers", icon: Store, count: sellers.length },
    { id: "reviews", label: "Rev. Fraud", icon: MessageSquare, count: reviews.length },
  ];

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logoWrap}>
          <h1 style={styles.logoText}>Admin</h1>
        </div>

        <nav style={styles.nav}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...styles.navBtn, ...(tab === t.id ? styles.navActive : {}) }}
              onClick={() => { setTab(t.id); setSearch(""); }}
            >
              <t.icon size={17} />
              <span style={styles.navLabel}>{t.label}</span>
              {t.count !== null && (
                <span style={{ ...styles.countBadge, ...(t.count > 0 ? styles.countBadgeActive : styles.countBadgeInactive) }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button style={styles.logoutBtn}
           onClick={() => { localStorage.removeItem("user"); window.location.href = "/login"; }}>
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Fraud Detection Dashboard</h1>
            <p style={styles.subHeading}>AI-powered monitoring</p>
          </div>
          {tab !== "overview" && (
            <div style={styles.searchWrap}>
              <Search size={15} color="#888" style={styles.searchIcon} />
              <input
                style={styles.searchInput}
                placeholder={`Search ${tab}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Toast */}
        {actionMsg && (
          <div style={{ ...styles.toast, ...(actionMsg.type === "error" ? styles.toastError : styles.toastSuccess) }}>
            {actionMsg.text}
          </div>
        )}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div style={styles.statGrid}>
              <StatCard icon={Users} label="Total Customers" value={ov.total_customers || 0} color="#60a5fa" />
              <StatCard icon={Store} label="Total Sellers" value={ov.total_sellers || 0} color="#a78bfa" />
              <StatCard icon={RotateCcw} label="Return Abusers" value={ov.suspicious_customers || 0} color="#f97316" accent />
              <StatCard icon={AlertTriangle} label="Suspicious Sellers" value={ov.suspicious_sellers || 0} color="#ef4444" accent />
              <StatCard icon={MessageSquare} label="Review Fraudsters" value={ov.repeated_reviews || 0} color="#c084fc" accent />
              <StatCard icon={ShieldAlert} label="Total High Risk" value={ov.high_risk || 0} color="#fb7185" accent />
            </div>

            <div style={styles.distCard}>
              <h2 style={styles.distTitle}>Fraud Type Distribution</h2>
              <DistBar label="Return Abuse" count={ov.suspicious_customers || 0} total={ov.total_customers || 1} color="#f97316" />
              <DistBar label="Seller Suspicious" count={ov.suspicious_sellers || 0} total={ov.total_sellers || 1} color="#ef4444" />
              <DistBar label="Repeated Reviews" count={ov.repeated_reviews || 0} total={ov.total_customers || 1} color="#a855f7" />
            </div>

            {customers.length + sellers.length + reviews.length > 0 && (
              <div style={styles.distCard}>
                <h2 style={styles.distTitle}>⚠ Highest Risk Entities</h2>
                <div style={styles.topRiskGrid}>
                  {[...customers, ...sellers, ...reviews]
                    .sort((a, b) => (b.fraud_score) - (a.fraud_score))
                    .slice(0, 6)
                    .map((item, i) => <TopRiskChip key={i} item={item} />)
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* CUSTOMERS */}
        {tab === "customers" && (
          <Section
            list={filtered(customers, "customer_name", search)}
            emptyMsg="No return-abuse customers detected 🎉"
            renderCard={c => (
              <FraudCard
                key={c.customer_id}
                title={c.customer_name}
                subtitle={`ID #${c.customer_id}`}
                status={c.account_status}
                fraudType={c.fraud_type}
                score={c.fraud_score}
                onBan={() => handleBan("customer", c.customer_id, c.account_status)}
                stats={[
                  { icon: Package, label: "Orders", value: c.total_orders },
                  { icon: RotateCcw, label: "Returns", value: c.returned_orders },
                  { icon: XCircle, label: "Cancels",  value: c.cancelled_orders },
                  { icon: TrendingUp, label: "Return Rate", value: `${c.return_rate}%` },
                  { icon: Star, label: "Avg Order",  value: `₹${Math.round(c.avg_order_value).toLocaleString()}` },
                ]}
              />
            )}
          />
        )}

        {/* SELLERS */}
        {tab === "sellers" && (
          <Section
            list={filtered(sellers, "seller_name", search)}
            emptyMsg="No suspicious sellers detected 🎉"
            renderCard={s => (
              <FraudCard
                key={s.seller_id}
                title={s.seller_name}
                subtitle={`Seller ID #${s.seller_id}`}
                status={s.account_status}
                fraudType={s.fraud_type}
                score={s.fraud_score}
                onBan={() => handleBan("seller", s.seller_id, s.account_status)}
                stats={[
                  { icon: Package, label: "Total Sales", value: s.seller_total_sales },
                  { icon: RotateCcw, label: "Returns", value: s.seller_returns },
                  { icon: TrendingUp, label: "Return Rate", value: `${s.seller_return_rate}%` },
                  { icon: Star, label: "Avg Rating",   value: (s.avg_rating ?? 0).toFixed(2) },
                  { icon: AlertTriangle, label: "Neg Reviews", value: `${s.negative_review_percent}%` },
                ]}
              />
            )}
          />
        )}

        {/* REVIEWS */}
        {tab === "reviews" && (
          <Section
            list={filtered(reviews, "customer_name", search)}
            emptyMsg="No repeated-review fraud detected 🎉"
            renderCard={r => (
              <FraudCard
                key={r.customer_id}
                title={r.customer_name}
                subtitle={`ID #${r.customer_id}`}
                status={r.account_status}
                fraudType={r.fraud_type}
                score={r.fraud_score}
                onBan={() => handleBan("customer", r.customer_id, r.account_status)}
                stats={[
                  { icon: Package, label: "Orders", value: r.total_orders },
                  { icon: MessageSquare, label: "Same-Seller Revs", value: r.reviews_same_seller },
                  { icon: AlertTriangle, label: "Similarity", value: `${r.review_similarity_pct}%` },
                  { icon: RotateCcw, label: "Returns", value: r.returned_orders },
                  { icon: TrendingUp, label: "Return Rate", value: `${r.return_rate}%` },
                ]}
              />
            )}
          />
        )}
      </main>

      <style>{GLOBAL_CSS}</style>
    </div>
  );
}


function Section({ list, emptyMsg, renderCard }) {
  if (list.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <ShieldCheck size={56} color="#22c55e" style={styles.emptyIcon} />
        <p style={styles.emptyText}>{emptyMsg}</p>
      </div>
    );
  }
  return <div style={styles.cardGrid}>{list.map(renderCard)}</div>;
}

function FraudCard({ title, subtitle, status, fraudType, score, stats, onBan }) {
  const badge = BADGE[fraudType] || BADGE.NONE;
  const isBanned = status === "Suspended";
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ ...styles.card, ...(hover ? styles.cardHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Header row */}
      <div style={styles.cardHead}>
        <div>
          <div style={styles.cardName}>{title}</div>
          <div style={styles.cardSub}>{subtitle}</div>
        </div>
        <span style={{ ...styles.fraudBadge, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}>
          {badge.label}
        </span>
      </div>

      {/* Risk score bar */}
      <div>
        <div style={styles.scoreHeader}>
          <span style={styles.scoreLabel}>Risk Score</span>
          <span style={{ ...styles.scoreValue, color: riskColor(score) }}>{score}%</span>
        </div>
        <div style={styles.barTrack}>
          <div style={{
            ...styles.barFill,
            width: `${score}%`,
            background: `linear-gradient(90deg, ${riskColor(score)}aa, ${riskColor(score)})`,
            boxShadow: `0 0 8px ${riskColor(score)}66`,
          }} />
        </div>
      </div>

      {/* Stats mini-grid */}
      <div style={styles.statsGrid}>
        {stats.map((st, i) => (
          <div key={i} style={styles.statItem}>
            <st.icon size={13} color="#888" />
            <div style={styles.statLabel}>{st.label}</div>
            <div style={styles.statValue}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Action button */}
      {isBanned
        ? <button style={styles.unbanBtn} onClick={onBan}><ShieldCheck size={14} /> Unban</button>
        : <button style={styles.banBtn}   onClick={onBan}><ShieldOff   size={14} /> Ban Account</button>
      }
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, accent }) {
  return (
    <div style={{
      ...styles.statCard,
      borderColor: accent ? `${color}44` : "rgba(255,255,255,0.06)",
      background:  accent
        ? `radial-gradient(ellipse at top left, ${color}12, rgba(255,255,255,0.04))`
        : "rgba(255,255,255,0.04)",
    }}>
      <div style={{ ...styles.statIconWrap, background: `${color}22`, border: `1px solid ${color}44` }}>
        <Icon size={20} color={color} />
      </div>
      <div style={styles.statNum}>{value}</div>
      <div style={styles.statLbl}>{label}</div>
    </div>
  );
}

function DistBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const entityLbl = label.includes("Seller") ? "sellers" : "customers";
  return (
    <div style={styles.distBarWrap}>
      <div style={styles.distBarHeader}>
        <span style={styles.distBarLabel}>{label}</span>
        <span style={{ ...styles.distBarCount, color }}>
          {count} <span style={styles.distBarTotal}>/ {total}</span>
        </span>
      </div>
      <div style={styles.barTrack}>
        <div style={{
          ...styles.barFill,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 6px ${color}55`,
        }} />
      </div>
      <div style={styles.distBarPct}>{pct}% of {entityLbl}</div>
    </div>
  );
}

function TopRiskChip({ item }) {
  const name = item.customer_name || item.seller_name || "Unknown";
  const badge = BADGE[item.fraud_type] || BADGE.NONE;
  const color = riskColor(item.fraud_score);
  return (
    <div style={styles.riskChip}>
      <div style={{ ...styles.riskChipIcon, background: `${color}22`, border: `1px solid ${color}44` }}>
        <AlertTriangle size={16} color={color} />
      </div>
      <div style={styles.riskChipInfo}>
        <div style={styles.riskChipName}>{name}</div>
        <span style={{ ...styles.riskChipBadge, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}>
          {badge.label}
        </span>
      </div>
      <div style={{ ...styles.riskChipScore, color }}>{item.fraud_score}%</div>
    </div>
  );
}

function LoadingScreen() {
  return (
      <div style={styles.loading}>
        Loading Fraud Analysis Dashboard...
      </div>
  );
}


const GLOBAL_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
`;


const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #120008, #3d0012, #6d001f)",
    fontFamily: "'Poppins', sans-serif",
    color: "white",
  },

  sidebar: {
    width: 250,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "20px",
    background: "rgba(255,255,255,0.05)",
  },

  logoWrap: { padding: "8px 8px 20px" },

  logoText: { fontSize: 30, fontWeight: "bold", color: "#fff" },

  nav: { display: "flex", flexDirection: "column", gap: 12 },

  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s",
  },

  navActive: {
    background: "#ff2e63",
    color: "white",
    border: "none",
  },

  navLabel: { flex: 1, textAlign: "left" },
  countBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 10,
    minWidth: 20,
    textAlign: "center",
  },

  countBadgeActive:   { background: "rgba(239,68,68,0.25)", color: "#f87171" },

  countBadgeInactive: { background: "rgba(255,255,255,0.08)", color: "#888"  },

  logoutBtn: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: "#8b0026",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },

  main: { 
    flex: 1, 
    overflowY: "auto", 
    padding: "30px" 
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 25,
  },

  heading: { 
    fontSize: 34, 
    fontWeight: 800, 
    color: "#fff", 
    letterSpacing: "-0.5px" 
  },

  subHeading: {
    fontSize: 14, 
    color: "#f3c7d2", 
    marginTop: 4 
  },

  searchWrap: { position: "relative" },

  searchIcon: { 
    position: "absolute", 
    left: 12, top: "50%", 
    transform: "translateY(-50%)" 
  },

  searchInput: {
    paddingLeft: 36,
    paddingRight: 16,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#ddd",
    fontSize: 13,
    outline: "none",
    width: 220,
    fontFamily: "'Poppins', sans-serif",
  },

  toast: {
    position: "fixed",
    top: 20,
    right: 24,
    zIndex: 9999,
    padding: "12px 20px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: "#fff",
    backdropFilter: "blur(10px)",
    animation: "fadeIn 0.3s ease",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    fontFamily: "'Poppins', sans-serif",
  },

  toastSuccess: { background: "rgba(34,197,94,0.9)"  },
  toastError:   { background: "rgba(239,68,68,0.9)"  },

  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 15,
    marginBottom: 24,
  },

  statCard: {
    padding: "20px",
    borderRadius:  15,
    border: "none",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    animation: "fadeIn 0.4s ease",
    transition: "transform 0.2s",
  },

  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statNum: { 
    fontSize: 30, 
    fontWeight: 800, 
    color: "#fff" 
  },

  statLbl: { 
    fontSize: 12, 
    color: "#f3c7d2", 
    fontWeight: 500, 
    textTransform: "uppercase", 
    letterSpacing: 0.8 
  },

  distCard: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: "24px",
    marginBottom: 20,
    animation: "fadeIn 0.5s ease",
  },

  distTitle: { 
    fontSize: 16, 
    fontWeight: 700, 
    color: "#ddd", 
    marginBottom: 20 
  },

  distBarWrap: { marginBottom: 18 },

  distBarHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: 8 
  },

  distBarLabel: { 
    color: "#ccc", 
    fontSize: 14, 
    fontWeight: 500 
  },

  distBarCount: { 
    fontSize: 14, 
    fontWeight: 700 
  },

  distBarTotal: { 
    color: "#666", 
    fontWeight: 400 
  },

  distBarPct: { 
    color: "#666", 
    fontSize: 11, 
    marginTop: 4, 
    textAlign: "right" 
  },

  topRiskGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 12,
  },

  riskChip: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    animation: "fadeIn 0.4s ease",
  },

  riskChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  riskChipInfo: { flex: 1, minWidth: 0 },

  riskChipName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#eee",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  riskChipBadge: {
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 5,
  },

  riskChipScore: { 
    fontSize: 15, 
    fontWeight: 800, 
    minWidth: 42, 
    textAlign: "right" 
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 20,
    animation: "fadeIn 0.4s ease",
  },

  card: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  
  cardHover: {
    transform: "translateY(-3px)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  },

  cardHead: { 
    display: "flex", 
    alignItems: "flex-start", 
    justifyContent: "space-between", 
    gap: 12 
  },

  cardName: { 
    fontSize: 16, 
    fontWeight: 700, 
    color: "#fff" 
  },

  cardSub:  { 
    fontSize: 12, 
    color: "#a87280", 
    marginTop: 2 
  },

  fraudBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 8,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
  },

  scoreHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: 6 
  },

  scoreLabel: { 
    fontSize: 11, 
    color: "#aaa", 
    textTransform: "uppercase", 
    letterSpacing: 1 
  },

  scoreValue: { 
    fontSize: 14, 
    fontWeight: 700 
  },

  barTrack: {
    width: "100%", 
    height: 7, 
    background: "rgba(255,255,255,0.06)", 
    borderRadius: 4, 
    overflow: "hidden" 
  },

  barFill: { 
    height: "100%", 
    borderRadius: 4, 
    transition: "width 0.8s ease" 
  },

  statsGrid: { 
    display: "grid", 
    gridTemplateColumns: "1fr 1fr", 
    gap: 8 
  },

  statItem: {
    background: "rgba(255,255,255,0.05)",
    borderRadius:  10,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  statLabel: { 
    fontSize: 10, 
    color: "#f3c7d2", 
    textTransform: "uppercase", 
    letterSpacing: 0.6, 
    marginTop: 2 
  },

  statValue: { 
    fontSize: 14,
    fontWeight: 700, 
    color: "#ddd" 
  },

  banBtn: {
    display:"flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding:"12px",
    borderRadius: 8,
    border: "none",
    background: "#ff2e63",
    color: "white",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.2s",
  },

  unbanBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#4caf50",
    color: "white",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.2s",
  },

  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    gap: 8,
  },

  emptyIcon: { marginBottom: 16 },

  emptyText: { 
    color: "#4ade80", 
    fontSize: 18, 
    fontWeight: 600 
  },

  loading: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg,#120008,#3d0012,#6d001f)",
    color: "white",
    fontSize: "22px",
  },
};