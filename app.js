const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const NAGAD_NUMBER = "01896184677";
const BKASH_NUMBER = ""; // পরে add করা হবে

const plans = [
  ["৳50", "30 Days"],
  ["৳100", "90 Days"],
  ["৳600", "90 Days"],
  ["৳1,500", "90 Days"],
  ["৳3,000", "90 Days"],
  ["৳5,000", "180 Days"],
  ["৳10,000", "180 Days"],
  ["৳15,000", "180 Days"]
];

const DAILY_CLAIM = 100;
const REFERRAL_BONUS = 200;
const REFERRAL_MIN_PLAN = 1500;

function toast(message) {
  const x = $("#toast");
  if (!x) return;
  x.textContent = message;
  x.classList.add("show");
  setTimeout(() => x.classList.remove("show"), 1800);
}

function showAuth(name) {
  $$(".auth-tab").forEach(b =>
    b.classList.toggle("active", b.dataset.auth === name)
  );

  $("#loginForm")?.classList.toggle("hidden", name !== "login");
  $("#registerForm")?.classList.toggle("hidden", name !== "register");
  $("#forgotForm")?.classList.toggle("hidden", name !== "forgot");
}

$$(".auth-tab").forEach(b => {
  b.onclick = () => showAuth(b.dataset.auth);
});

$("#createAccount")?.addEventListener("click", () => showAuth("register"));

$("#goLogin")?.addEventListener("click", e => {
  e.preventDefault();
  showAuth("login");
});

$("#forgotLink")?.addEventListener("click", e => {
  e.preventDefault();
  showAuth("forgot");
});

$("#backLogin")?.addEventListener("click", () => showAuth("login"));

function enterApp() {
  $("#auth")?.classList.remove("active");
  $("#dashboard")?.classList.add("active");
}

const API_BASE = "";

async function apiRequest(url, options = {}) {
  const res = await fetch(API_BASE + url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

window.updateInstantReferral = function(user) {
  const code = user && user.referral_code;
  if (!code) return;
  const link = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
  const codeEl = document.getElementById("referralCode");
  const linkEl = document.getElementById("directReferralLink");
  if (codeEl) codeEl.textContent = code;
  if (linkEl) linkEl.textContent = link;
};

function saveAuth(data) {
  localStorage.setItem("taka24_token", data.token);
  localStorage.setItem("taka24_user", JSON.stringify(data.user));
  if (typeof window.updateInstantReferral === "function") {
    window.updateInstantReferral(data.user);
  }
}

function updateUserUI(user) {
  if (!user) return;

  const balance = `৳ ${Number(user.balance || 0).toLocaleString("en-US")}`;

  if ($("#homeBalance")) $("#homeBalance").textContent = balance;
  if ($("#profileName")) $("#profileName").textContent = user.name || "User";
  if ($("#profileMobile")) $("#profileMobile").textContent = user.mobile || "";
  if ($("#profileBalance")) $("#profileBalance").textContent = balance;
}

async function loadCurrentUser() {
  const token = localStorage.getItem("taka24_token");
  if (!token) return;

  try {
    const data = await apiRequest("/api/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    localStorage.setItem("taka24_user", JSON.stringify(data.user));
    updateUserUI(data.user);
  } catch (err) {
    localStorage.removeItem("taka24_token");
    localStorage.removeItem("taka24_user");
  }
}


$("#loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const loginInputs = [...$("#loginForm").querySelectorAll("input")];
  const mobile = loginInputs[0]?.value.trim() || "";
  const password = loginInputs[1]?.value || "";

  try {
    const data = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({ mobile, password })
    });

    saveAuth(data);
    updateUserUI(data.user);
    enterApp();
    toast("Welcome back");
  } catch (err) {
    toast(err.message);
  }
});

$("#registerForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const inputs = [...$("#registerForm").querySelectorAll("input")];

  const name = inputs[0]?.value.trim() || "";
  const mobile = inputs[1]?.value.trim() || "";
  const password = inputs[2]?.value || "";
  const confirmPassword = inputs[3]?.value || "";
  const referral_code = inputs[4]?.value.trim() || "";

  if (password !== confirmPassword) {
    toast("Passwords do not match");
    return;
  }

  try {
    const data = await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        mobile,
        password,
        referral_code
      })
    });

    saveAuth(data);
    updateUserUI(data.user);
    enterApp();
    toast("Account created");
  } catch (err) {
    toast(err.message);
  }
});

$("#forgotForm")?.addEventListener("submit", e => {
  e.preventDefault();
  toast("Reset request submitted");
});

function view(v) {
  $$(".view").forEach(x =>
    x.classList.toggle("active", x.id === "view-" + v)
  );

  $$(".nav-item,.bottom-nav button").forEach(x =>
    x.classList.toggle("active", x.dataset.view === v)
  );

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-view]").forEach(b => {
  b.onclick = () => view(b.dataset.view);
});

function logout() {
  $("#dashboard")?.classList.remove("active");
  $("#auth")?.classList.add("active");
  showAuth("login");
  toast("Logged out");
}

$("#logout")?.addEventListener("click", logout);
$("#logout2")?.addEventListener("click", logout);

$("#claimBtn")?.addEventListener("click", () => {
  toast("Today's claim processed");
});

$$(".quick button").forEach(b => {
  b.onclick = () => {
    const input = $("#withdrawAmount");
    if (input) input.value = b.dataset.amt;
  };
});

$$(".method").forEach(b => {
  b.onclick = () => {
    $$(".method").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
  };
});

$("#withdrawBtn")?.addEventListener("click", () => {
  toast("Withdrawal request submitted");
});

$$(".eye").forEach(b => {
  b.onclick = () => {
    const input = b.parentElement.querySelector("input");
    if (input) {
      input.type = input.type === "password" ? "text" : "password";
    }
  };
});

console.log("Taka24 User Site loaded");
console.log("Nagad:", NAGAD_NUMBER);
console.log("Daily Claim:", DAILY_CLAIM);
console.log("Referral Bonus:", REFERRAL_BONUS);
console.log("Referral Minimum Plan:", REFERRAL_MIN_PLAN);

const planBox = $("#plans");
if (planBox) {
  planBox.innerHTML = plans.map(p => `
    <div class="plan">
      <span class="crown">♛</span>
      <h2>${p[0]}</h2>
      <p>${p[1]}</p>
      <p>Daily Claim: ৳${DAILY_CLAIM}</p>
      <p>Plan payment required</p>
      <button class="gold-btn" onclick="openPayment('${p[0]}')">Activate Plan</button>
    </div>
  `).join("");
}

let selectedPlan="";
let selectedPaymentMethod="bKash";
const PAYMENT_NUMBERS={bKash:"01613317181",Nagad:"01896184677"};

function openPayment(plan){
  selectedPlan=plan;
  selectedPaymentMethod="bKash";
  const modal=$("#paymentModal");
  if(!modal)return;
  $("#selectedPlanText").textContent="Selected Plan: "+plan;
  $("#paymentNumber").textContent=PAYMENT_NUMBERS.bKash;
  $$(".pay-method").forEach(b=>b.classList.toggle("active",b.dataset.method==="bKash"));
  modal.classList.remove("hidden");
}
$("#paymentClose")?.addEventListener("click",()=>$("#paymentModal")?.classList.add("hidden"));

$$(".copy-pay").forEach(btn=>{
  btn.addEventListener("click",async()=>{
    const number=btn.dataset.number;
    try{await navigator.clipboard.writeText(number)}catch(e){}
    toast("Number copied: "+number);
  });
});
$$(".pay-method").forEach(b=>b.addEventListener("click",()=>{
  selectedPaymentMethod=b.dataset.method;
  $("#paymentNumber").textContent=PAYMENT_NUMBERS[selectedPaymentMethod];
  $$(".pay-method").forEach(x=>x.classList.toggle("active",x===b));
}));
$("#copyPaymentNumber")?.addEventListener("click",async()=>{
  const n=PAYMENT_NUMBERS[selectedPaymentMethod];
  try{await navigator.clipboard.writeText(n)}catch(e){}
  toast("Payment number copied");
});
$("#submitPlanRequest")?.addEventListener("click",()=>{
  const amount=$("#paymentAmount")?.value.trim();
  const trx=$("#paymentTrxId")?.value.trim();

  if(!amount){
    toast("Payment amount দিন");
    return;
  }

  if(!trx){
    toast("TrxID দিন");
    return;
  }

  $("#paymentPending")?.classList.remove("hidden");
  $("#submitPlanRequest").textContent="Payment Submitted ✓";
  $("#submitPlanRequest").disabled=true;

  toast("Payment submitted — Pending");
});

window.openPayment = function(plan){
  const modal = document.getElementById("paymentModal");
  const text = document.getElementById("selectedPlanText");

  if(!modal){
    alert("Payment window not found");
    return;
  }

  if(text) text.textContent = "Selected Plan: " + plan;

  modal.classList.remove("hidden");
};


document.addEventListener("click", function(e){

  const choice=e.target.closest(".payment-choice");

  if(choice){
    const method=choice.dataset.method;
    const number=PAYMENT_NUMBERS[method];

    selectedPaymentMethod=method;

    const box=$("#selectedPayment");
    if(box) box.classList.remove("hidden");

    const name=$("#selectedMethod");
    if(name) name.textContent=method;

    const num=$("#paymentNumber");
    if(num) num.textContent=number;

    const logo=$("#selectedLogo");
    if(logo){
      logo.textContent=method==="bKash"?"bK":"N";
      logo.className="choice-logo "+
        (method==="bKash"?"bkash-logo":"nagad-logo");
    }

    $$(".payment-choice").forEach(x=>{
      x.classList.toggle("active",x===choice);
    });

    setTimeout(()=>{
      $("#selectedPayment")?.scrollIntoView({
        behavior:"smooth",
        block:"center"
      });
    },100);

    return;
  }

  if(e.target.closest("#copyPaymentNumber")){
    const number=PAYMENT_NUMBERS[selectedPaymentMethod];

    if(!number){
      toast("আগে bKash অথবা Nagad নির্বাচন করুন");
      return;
    }

    navigator.clipboard?.writeText(number);
    toast("Number copied ✓");
  }

});

console.log("✅ PAYMENT OPTION CLICK FIXED");

document.addEventListener("click", function(e){
  const nav=e.target.closest("[data-view]");
  if(nav){
    const modal=$("#paymentModal");
    if(modal) modal.classList.add("hidden");
  }
});



/* =========================================================
   TAKА24 PREMIUM INPUT MODAL
   ========================================================= */
window.taka24Prompt = function(title, placeholder, type = "text") {
  return new Promise((resolve) => {
    const modal = document.getElementById("taka24InputModal");
    const titleEl = document.getElementById("taka24InputTitle");
    const input = document.getElementById("taka24InputField");
    const ok = document.getElementById("taka24InputOk");
    const cancel = document.getElementById("taka24InputCancel");

    if (!modal || !input || !ok || !cancel) {
      resolve(window.prompt(title, ""));
      return;
    }

    titleEl.textContent = title;
    input.placeholder = placeholder || "";
    input.type = type;
    input.value = "";

    modal.classList.remove("hidden");
    document.body.classList.add("taka24-modal-open");

    setTimeout(() => input.focus(), 80);

    let finished = false;

    const finish = (value) => {
      if (finished) return;
      finished = true;

      modal.classList.add("hidden");
      document.body.classList.remove("taka24-modal-open");

      ok.onclick = null;
      cancel.onclick = null;
      input.onkeydown = null;
      modal.onclick = null;

      resolve(value);
    };

    ok.onclick = () => finish(input.value.trim());
    cancel.onclick = () => finish(null);

    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(input.value.trim());
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      }
    };

    modal.onclick = (e) => {
      if (e.target === modal) finish(null);
    };
  });
};

document.getElementById("taka24InputCancel2")?.addEventListener("click", () => {
  const modal = document.getElementById("taka24InputModal");
  if (modal) modal.classList.add("hidden");
  document.body.classList.remove("taka24-modal-open");
});

loadCurrentUser();

$("#changePayoutBtn")?.addEventListener("click", async () => {
  const payout = await taka24Prompt("Change Payout Number", "Enter your bKash/Nagad number", "tel");

  if (!payout) return;

  const token = localStorage.getItem("taka24_token");

  try {
    const data = await apiRequest("/api/profile/payout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        payout_number: payout.trim()
      })
    });

    if ($("#profilePayout")) {
      $("#profilePayout").textContent = data.payout_number;
    }

    toast("Payout number updated");
  } catch (err) {
    toast(err.message);
  }
});

$("#changePasswordBtn")?.addEventListener("click", async () => {
  const current_password = await taka24Prompt("Current Password", "Enter current password", "password");

  if (!current_password) return;

  const new_password = await taka24Prompt("New Password", "Enter new password", "password");

  if (!new_password) return;

  const confirm_password = await taka24Prompt("Confirm Password", "Confirm new password", "password");

  if (new_password !== confirm_password) {
    toast("Passwords do not match");
    return;
  }

  const token = localStorage.getItem("taka24_token");

  try {
    await apiRequest("/api/profile/password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password,
        new_password
      })
    });

    toast("Password changed successfully");
  } catch (err) {
    toast(err.message);
  }
});


// ================= REAL USER SITE DATA =================

async function loadUserDashboard() {
  const token = localStorage.getItem("taka24_token");
  if (!token) return;

  try {
    const data = await apiRequest("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    updateUserUI(data.user);

    if ($("#profilePayout")) {
      $("#profilePayout").textContent =
        data.user.payout_number || "Not set";
    }

    renderRealTransactions(data.transactions || []);
    renderRealNotifications(data.notifications || []);

    window.taka24Dashboard = data;
  } catch (err) {
    console.log("Dashboard load:", err.message);
  }
}

function renderRealTransactions(items) {
  const box = $("#transactions");
  const recent = $("#recent");

  const html = items.length
    ? items.map(t => {
        const amount = Number(t.amount || 0);
        const cls = amount >= 0 ? "plus" : "minus";
        const sign = amount >= 0 ? "+" : "";
        return `
          <div class="tx">
            <div class="ico">৳</div>
            <div>
              <b>${t.type || "Transaction"}</b>
              <small>${t.note || ""}</small>
            </div>
            <strong class="${cls}">
              ${sign}৳${Math.abs(amount).toLocaleString("en-US")}
            </strong>
          </div>
        `;
      }).join("")
    : `<div class="empty-state">No transactions yet</div>`;

  if (box) box.innerHTML = html;
  if (recent) recent.innerHTML = html;
}

function renderRealNotifications(items) {
  window.taka24Notifications = items || [];
}

async function submitPlanRequest(plan_id, amount, payment_method, trx_id) {
  const token = localStorage.getItem("taka24_token");

  return apiRequest("/api/plan-request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      plan_id,
      amount,
      payment_method,
      trx_id
    })
  });
}

async function claimDailyEarning() {
  const token = localStorage.getItem("taka24_token");

  try {
    const data = await apiRequest("/api/claim", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    updateUserUI({
      ...(JSON.parse(localStorage.getItem("taka24_user") || "{}")),
      balance: data.balance
    });

    toast(data.message);
    await loadUserDashboard();
  } catch (err) {
    toast(err.message);
  }
}

$("#claimBtn")?.addEventListener("click", claimDailyEarning);

async function createWithdrawal(amount, method, payout_number) {
  const token = localStorage.getItem("taka24_token");

  return apiRequest("/api/withdraw", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      amount,
      method,
      payout_number
    })
  });
}

async function loadReferralData() {
  const token = localStorage.getItem("taka24_token");
  if (!token) return null;

  try {
    return await apiRequest("/api/referral", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (err) {
    console.log("Referral load:", err.message);
    return null;
  }
}

loadUserDashboard();


// ================= FINAL USER SITE CONNECTION =================

async function refreshUserSite() {
  try {
    await loadCurrentUser();
    await loadUserDashboard();
    if (typeof loadReferralData === "function") {
      await loadReferralData();
    }
    if (typeof window.loadReferralTrackingFinal === "function") {
      await window.loadReferralTrackingFinal();
    }
  } catch (err) {
    console.error("User site refresh error:", err);
  }
}

function showBackendMessage(data, fallback = "Something went wrong") {
  if (data && data.message) {
    toast(data.message);
    return;
  }
  toast(fallback);
}

// Keep dashboard data synced when user changes views.
document.querySelectorAll(".nav-item, .bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    setTimeout(() => {
      if (localStorage.getItem("taka24_token")) {
        loadUserDashboard().catch(console.error);
      }
    }, 150);
  });
});

// Plan request helper.
// Existing payment modal can call this function.
window.submitPlanRequestFinal = async function(planId, amount, paymentMethod, trxId) {
  try {
    const data = await apiRequest("/api/plan-request", {
      method: "POST",
      body: {
        plan_id: planId,
        amount: Number(amount),
        payment_method: paymentMethod,
        trx_id: String(trxId || "").trim()
      }
    });

    showBackendMessage(data, "Plan request submitted");
    await loadUserDashboard();
    return data;
  } catch (err) {
    toast(err.message || "Plan request failed");
    throw err;
  }
};

// Final claim helper.
window.claimDailyEarningFinal = async function() {
  try {
    const data = await apiRequest("/api/claim", {
      method: "POST",
      body: {}
    });

    showBackendMessage(data, "Claim successful");
    await loadUserDashboard();
    return data;
  } catch (err) {
    toast(err.message || "Claim failed");
    throw err;
  }
};

// Final withdrawal helper.
window.createWithdrawalFinal = async function(amount, method, payoutNumber) {
  try {
    const data = await apiRequest("/api/withdraw", {
      method: "POST",
      body: {
        amount: Number(amount),
        method,
        payout_number: String(payoutNumber || "").trim()
      }
    });

    showBackendMessage(data, "Withdrawal request submitted");
    await loadUserDashboard();
    return data;
  } catch (err) {
    toast(err.message || "Withdrawal failed");
    throw err;
  }
};

// Referral is tracking only for now.
// No automatic ৳200 bonus is generated.
window.loadReferralTrackingFinal = async function() {
  try {
    const token = localStorage.getItem("taka24_token");
    if (!token) return null;

    const data = await apiRequest("/api/referral", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const codeEl = document.getElementById("referralCode");
    if (codeEl) codeEl.textContent = data.referral_code || "Not available";

    const countEl = document.getElementById("referralCount");
    if (countEl) countEl.textContent = String((data.referrals || []).length);

    const bonusEl = document.getElementById("referralBonus");
    if (bonusEl) bonusEl.textContent = "৳0";

    return data;
  } catch (err) {
    console.error("Referral tracking error:", err);
    return null;
  }
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && localStorage.getItem("taka24_token")) {
    loadUserDashboard().catch(console.error);
  }
});

window.copyReferralLink = async function() {
  const code = document.getElementById("referralCode")?.textContent?.trim();
  if (!code || code === "Loading..." || code === "Not available") {
    toast("Referral code not available");
    return;
  }

  const link = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;

  try {
    await navigator.clipboard.writeText(link);
    toast("Referral link copied");
  } catch (err) {
    toast("Copy failed");
  }
};


document.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("taka24_token")) {
    await refreshUserSite();
  }
});


/* ============================================================
   TAKA24 USER SITE — SAFE POLISH LAYER
   Added without replacing existing user-site functions.
   ============================================================ */

(function () {
  "use strict";

  /* Prevent accidental duplicate initialization */
  if (window.__taka24SafePolishLoaded) return;
  window.__taka24SafePolishLoaded = true;

  /* Safe toast fallback */
  if (typeof window.toast !== "function") {
    window.toast = function (message) {
      try {
        alert(String(message || ""));
      } catch (_) {}
    };
  }

  /* Global API error helper */
  window.taka24HandleError = function (err, fallback) {
    console.error("Taka24:", err);
    const msg =
      err?.message ||
      err?.error ||
      fallback ||
      "Something went wrong. Please try again.";
    try {
      toast(msg);
    } catch (_) {}
    return null;
  };

  /* Safe mobile-number validation */
  window.taka24ValidMobile = function (value) {
    const v = String(value || "").trim();
    return /^(?:\+?8801|01)[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ""));
  };

  /* Safe amount validation */
  window.taka24ValidAmount = function (value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
  };

  /* Protect important buttons from accidental double-clicks */
  document.addEventListener("click", function (event) {
    const btn = event.target?.closest?.("button");
    if (!btn) return;

    if (
      btn.dataset.taka24Busy === "1" ||
      btn.disabled ||
      btn.classList.contains("taka24-processing")
    ) {
      return;
    }

    const actionText = String(btn.textContent || "").trim().toLowerCase();

    if (
      actionText.includes("submit") ||
      actionText.includes("withdraw") ||
      actionText.includes("claim") ||
      actionText.includes("payment") ||
      actionText.includes("request")
    ) {
      btn.dataset.taka24Busy = "1";

      setTimeout(function () {
        btn.dataset.taka24Busy = "0";
      }, 1800);
    }
  });

  /* Referral link helper — keeps existing referral system intact */
  window.copyTaka24ReferralLink = async function () {
    try {
      const code =
        document.getElementById("referralCode")?.textContent?.trim();

      if (!code || code === "Loading..." || code === "Not available") {
        toast("Referral code not available");
        return;
      }

      const link =
        window.location.origin +
        "/?ref=" +
        encodeURIComponent(code);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const area = document.createElement("textarea");
        area.value = link;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }

      toast("Referral link copied");
    } catch (err) {
      taka24HandleError(err, "Could not copy referral link");
    }
  };

  /* Keep page usable when API is temporarily unavailable */
  window.addEventListener("online", function () {
    try {
      toast("Internet connection restored");
    } catch (_) {}
  });

  window.addEventListener("offline", function () {
    try {
      toast("You are offline");
    } catch (_) {}
  });

  /* Prevent stale login page state after logout */
  window.addEventListener("pageshow", function () {
    try {
      const token = localStorage.getItem("taka24_token");
      if (!token) {
        document.body?.classList?.remove("logged-in");
      }
    } catch (_) {}
  });

  /* Enter-key support for common auth inputs */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;

    const target = event.target;
    if (!target || !["INPUT", "SELECT"].includes(target.tagName)) return;

    const form = target.closest("form");
    if (form) return;

    const nearbyButton =
      target.parentElement?.querySelector?.(
        'button[type="submit"], .gold-btn, .primary-btn'
      );

    if (nearbyButton && !nearbyButton.disabled) {
      event.preventDefault();
      nearbyButton.click();
    }
  });

  console.log("✅ Taka24 safe user-site polish loaded");
})();


/* Taka24 Settings Logout */
(function () {
  if (window.__taka24LogoutReady) return;
  window.__taka24LogoutReady = true;

  document.addEventListener("click", async function (event) {
    const btn = event.target?.closest?.("#taka24LogoutBtn");
    if (!btn) return;

    if (!confirm("Are you sure you want to logout?")) return;

    try {
      const token = localStorage.getItem("taka24_token");

      if (token) {
        await fetch("/api/logout", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token
          }
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("taka24_token");
      localStorage.removeItem("taka24_user");
      localStorage.removeItem("token");

      window.location.href = window.location.origin + "/";
    }
  });
})();

/* SETTINGS LOGOUT BUTTON FIX */
(function () {
  if (window.__taka24Logout2Fix) return;
  window.__taka24Logout2Fix = true;

  document.addEventListener("click", async function (e) {
    const btn = e.target.closest("#logout2");
    if (!btn) return;

    e.preventDefault();

    if (!confirm("Are you sure you want to logout?")) return;

    try {
      const token = localStorage.getItem("taka24_token");

      if (token) {
        await fetch("/api/logout", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token
          }
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("taka24_token");
      localStorage.removeItem("taka24_user");
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  });
})();
