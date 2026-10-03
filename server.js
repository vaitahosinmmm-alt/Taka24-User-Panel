const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = Number(process.env.PORT || 3000);

async function start() {
  const { JSONFilePreset } = await import("lowdb/node");

  const db = await JSONFilePreset(
    path.join(__dirname, "taka24.json"),
    {
      users: [],
      plan_requests: [],
      withdrawals: [],
      transactions: [],
      notifications: [],
      sessions: [],
      active_plans: [],
      nextIds: {
        users: 1,
        plan_requests: 1,
        withdrawals: 1,
        transactions: 1,
        notifications: 1,
        active_plans: 1
      }
    }
  );

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(__dirname));

  function createToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  function findUserByToken(token) {
    if (!token) return null;

    const session = db.data.sessions.find(s => s.token === token);
    if (!session) return null;

    const user = db.data.users.find(u => u.id === session.user_id);
    return user || null;
  }

  function getToken(req) {
    const auth = req.headers.authorization || "";

    if (auth.startsWith("Bearer ")) {
      return auth.slice(7);
    }

    return req.body?.token || req.query?.token || "";
  }

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      message: "Taka24 backend is running"
    });
  });

  app.get("/api/db-status", (req, res) => {
    res.json({
      ok: true,
      users: db.data.users.length,
      plan_requests: db.data.plan_requests.length,
      withdrawals: db.data.withdrawals.length,
      transactions: db.data.transactions.length,
      notifications: db.data.notifications.length
    });
  });

  app.post("/api/register", async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const mobile = String(req.body.mobile || "").trim();
      const password = String(req.body.password || "");
      const referral_code = String(req.body.referral_code || "").trim();

      if (!name || !mobile || !password) {
        return res.status(400).json({
          ok: false,
          message: "Name, mobile and password are required"
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          ok: false,
          message: "Password must be at least 6 characters"
        });
      }

      const existing = db.data.users.find(u => u.mobile === mobile);

      if (existing) {
        return res.status(409).json({
          ok: false,
          message: "Mobile number already registered"
        });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const newUserId = db.data.nextIds.users++;

      const user = {
        id: newUserId,
        name,
        mobile,
        password_hash,
        balance: 0,
        payout_number: "",
        referral_code: "T24" + String(newUserId).padStart(5, "0"),
        referred_by: referral_code || null,
        created_at: new Date().toISOString()
      };

      db.data.users.push(user);
      await db.write();

      const token = createToken();

      db.data.sessions.push({
        token,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      await db.write();

      res.status(201).json({
        ok: true,
        message: "Account created successfully",
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          balance: user.balance,
          referral_code: user.referral_code
        }
      });
    } catch (err) {
      console.error("Register error:", err);

      res.status(500).json({
        ok: false,
        message: "Registration failed"
      });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const mobile = String(req.body.mobile || "").trim();
      const password = String(req.body.password || "");

      if (!mobile || !password) {
        return res.status(400).json({
          ok: false,
          message: "Mobile and password are required"
        });
      }

      const user = db.data.users.find(u => u.mobile === mobile);

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Invalid mobile or password"
        });
      }

      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        return res.status(401).json({
          ok: false,
          message: "Invalid mobile or password"
        });
      }

      const token = createToken();

      db.data.sessions.push({
        token,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      await db.write();

      res.json({
        ok: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          balance: user.balance,
          referral_code: user.referral_code
        }
      });
    } catch (err) {
      console.error("Login error:", err);

      res.status(500).json({
        ok: false,
        message: "Login failed"
      });
    }
  });

  app.get("/api/me", (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        balance: user.balance,
        referral_code: user.referral_code
      }
    });
  });

  app.post("/api/profile/payout", async (req, res) => {
    try {
      const user = findUserByToken(getToken(req));

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Unauthorized"
        });
      }

      const payout_number = String(req.body.payout_number || "").trim();

      if (!/^01\\d{9}$/.test(payout_number)) {
        return res.status(400).json({
          ok: false,
          message: "Enter a valid Bangladesh mobile number"
        });
      }

      user.payout_number = payout_number;
      await db.write();

      res.json({
        ok: true,
        message: "Payout number updated",
        payout_number: user.payout_number
      });
    } catch (err) {
      console.error("Payout update error:", err);

      res.status(500).json({
        ok: false,
        message: "Could not update payout number"
      });
    }
  });

  app.post("/api/profile/password", async (req, res) => {
    try {
      const user = findUserByToken(getToken(req));

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Unauthorized"
        });
      }

      const current_password = String(req.body.current_password || "");
      const new_password = String(req.body.new_password || "");

      if (!current_password || !new_password) {
        return res.status(400).json({
          ok: false,
          message: "Current and new password are required"
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          ok: false,
          message: "New password must be at least 6 characters"
        });
      }

      const valid = await bcrypt.compare(
        current_password,
        user.password_hash
      );

      if (!valid) {
        return res.status(400).json({
          ok: false,
          message: "Current password is incorrect"
        });
      }

      user.password_hash = await bcrypt.hash(new_password, 12);
      await db.write();

      res.json({
        ok: true,
        message: "Password changed successfully"
      });
    } catch (err) {
      console.error("Password change error:", err);

      res.status(500).json({
        ok: false,
        message: "Could not change password"
      });
    }
  });


  // ================= USER SITE FEATURES =================

  const PLAN_CATALOG = [
    { id: "P50", amount: 50, daily_claim: 5, duration_days: 90 },
    { id: "P100", amount: 100, daily_claim: 10, duration_days: 60 },
    { id: "P600", amount: 600, daily_claim: 20, duration_days: 90 },
    { id: "P1500", amount: 1500, daily_claim: 30, duration_days: 90 },
    { id: "P3000", amount: 3000, daily_claim: 50, duration_days: 90 },
    { id: "P5000", amount: 5000, daily_claim: 80, duration_days: 180 },
    { id: "P10000", amount: 10000, daily_claim: 150, duration_days: 180 },
    { id: "P15000", amount: 15000, daily_claim: 225, duration_days: 180 }
  ];

  function ensureUserFields(user) {
    if (!user) return;

    if (typeof user.balance !== "number") user.balance = 0;
    if (!user.payout_number) user.payout_number = "";
    if (!user.referral_code) {
      user.referral_code = "T24" + String(user.id).padStart(5, "0");
    }
    if (!Array.isArray(db.data.active_plans)) db.data.active_plans = [];
    if (!Array.isArray(db.data.plan_requests)) db.data.plan_requests = [];
    if (!Array.isArray(db.data.withdrawals)) db.data.withdrawals = [];
    if (!Array.isArray(db.data.transactions)) db.data.transactions = [];
    if (!Array.isArray(db.data.notifications)) db.data.notifications = [];
  }

  function todayKey() {
    const now = new Date();
    const bd = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })
    );
    return `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,"0")}-${String(bd.getDate()).padStart(2,"0")}`;
  }

  function addTransaction(userId, type, amount, note, extra = {}) {
    db.data.transactions.push({
      id: db.data.nextIds.transactions++,
      user_id: userId,
      type,
      amount,
      note,
      created_at: new Date().toISOString(),
      ...extra
    });
  }

  function addNotification(userId, type, message) {
    db.data.notifications.push({
      id: db.data.nextIds.notifications++,
      user_id: userId,
      type,
      message,
      read: false,
      created_at: new Date().toISOString()
    });
  }

  function cancelExpiredRequests() {
    const now = Date.now();

    for (const request of db.data.plan_requests) {
      if (
        request.status === "Pending" &&
        now - new Date(request.created_at).getTime() >= 24 * 60 * 60 * 1000
      ) {
        request.status = "Cancelled";
        request.cancelled_at = new Date().toISOString();

        addNotification(
          request.user_id,
          "plan_cancelled",
          `Plan payment request for ৳${request.amount} expired and was cancelled.`
        );
      }
    }
  }

  app.get("/api/plans", (req, res) => {
    res.json({
      ok: true,
      plans: PLAN_CATALOG
    });
  });

  app.get("/api/dashboard", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    ensureUserFields(user);
    cancelExpiredRequests();
    await db.write();

    const active = db.data.active_plans.filter(p =>
      p.user_id === user.id
    );

    const transactions = db.data.transactions
      .filter(t => t.user_id === user.id)
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const notifications = db.data.notifications
      .filter(n => n.user_id === user.id)
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    const pendingWithdrawalAmount = db.data.withdrawals
      .filter(w =>
        w.user_id === user.id &&
        w.status === "Pending"
      )
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    const availableBalance =
      Number(user.balance || 0) - pendingWithdrawalAmount;

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        balance: user.balance,
        available_balance: availableBalance,
        pending_withdrawal: pendingWithdrawalAmount,
        payout_number: user.payout_number,
        referral_code: user.referral_code
      },
      active_plans: active,
      transactions,
      notifications
    });
  });

  app.post("/api/plan-request", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    ensureUserFields(user);
    cancelExpiredRequests();

    const plan_id = String(req.body.plan_id || "");
    const payment_method = String(req.body.payment_method || "");
    const sender_number = String(req.body.sender_number || "").trim();
    const trx_id = String(req.body.trx_id || "").trim();
    const amount = Number(req.body.amount || 0);

    const plan = PLAN_CATALOG.find(p => p.id === plan_id);

    if (!plan) {
      return res.status(400).json({
        ok: false,
        message: "Invalid plan"
      });
    }

    if (amount !== plan.amount) {
      return res.status(400).json({
        ok: false,
        message: "Payment amount does not match plan"
      });
    }

    if (!["bKash", "Nagad"].includes(payment_method)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid payment method"
      });
    }

    if (!sender_number) {
      return res.status(400).json({
        ok: false,
        message: "Sender number is required"
      });
    }

    if (!/^01[3-9]\\d{8}$/.test(sender_number)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid sender mobile number"
      });
    }

    if (!trx_id) {
      return res.status(400).json({
        ok: false,
        message: "Transaction ID is required"
      });
    }

    const duplicate = db.data.plan_requests.find(
      r => r.trx_id === trx_id
    );

    if (duplicate) {
      return res.status(409).json({
        ok: false,
        message: "This transaction ID was already submitted"
      });
    }

    const request = {
      id: db.data.nextIds.plan_requests++,
      user_id: user.id,
      plan_id: plan.id,
      amount: plan.amount,
      daily_claim: plan.daily_claim,
      duration_days: plan.duration_days,
      payment_method,
      sender_number,
      trx_id,
      status: "Pending",
      created_at: new Date().toISOString()
    };

    db.data.plan_requests.push(request);

    addNotification(
      user.id,
      "plan_pending",
      `Your ৳${plan.amount} plan payment is pending admin verification.`
    );

    await db.write();

    res.status(201).json({
      ok: true,
      message: "Plan request submitted",
      request
    });
  });

  app.get("/api/plan-requests", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    cancelExpiredRequests();
    await db.write();

    res.json({
      ok: true,
      requests: db.data.plan_requests
        .filter(r => r.user_id === user.id)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    });
  });

  app.post("/api/claim", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    ensureUserFields(user);

    const today = todayKey();
    const active = db.data.active_plans.filter(p => p.user_id === user.id);

    if (!active.length) {
      return res.status(400).json({
        ok: false,
        message: "No active plan available"
      });
    }

    let claimed = 0;
    const claimedPlans = [];

    for (const plan of active) {
      const expiry = new Date(plan.expires_at).getTime();

      if (Date.now() >= expiry) {
        plan.status = "Expired";
        continue;
      }

      if (plan.last_claim_date === today) {
        continue;
      }

      plan.last_claim_date = today;
      claimed += Number(plan.daily_claim || 0);
      claimedPlans.push(plan.id);

      addTransaction(
        user.id,
        "Claim",
        Number(plan.daily_claim || 0),
        `Daily claim from ${plan.plan_id}`,
        { active_plan_id: plan.id }
      );
    }

    if (!claimed) {
      await db.write();

      return res.status(400).json({
        ok: false,
        message: "Today's claim has already been claimed"
      });
    }

    user.balance += claimed;

    addNotification(
      user.id,
      "daily_claim",
      `Today's daily claim of ৳${claimed} has been added to your balance.`
    );

    await db.write();

    res.json({
      ok: true,
      message: `৳${claimed} claimed successfully`,
      claimed,
      balance: user.balance,
      claimed_plans: claimedPlans
    });
  });

  app.get("/api/withdrawals", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    res.json({
      ok: true,
      withdrawals: db.data.withdrawals
        .filter(w => w.user_id === user.id)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    });
  });

  app.post("/api/withdraw", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    ensureUserFields(user);

    const amount = Number(req.body.amount || 0);
    const method = String(req.body.method || "");
    const payout_number = String(
      req.body.payout_number || user.payout_number || ""
    ).trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Enter a valid withdrawal amount"
      });
    }

    if (!["bKash", "Nagad"].includes(method)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid withdrawal method"
      });
    }

    if (!/^01[3-9]\d{8}$/.test(payout_number)) {
      return res.status(400).json({
        ok: false,
        message: "Enter a valid Bangladesh mobile number"
      });
    }

    const currentBalance = Number(user.balance || 0);

    const pendingWithdrawals = db.data.withdrawals
      .filter(w =>
        w.user_id === user.id &&
        w.status === "Pending"
      )
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    const availableBalance = currentBalance - pendingWithdrawals;

    if (amount > availableBalance) {
      return res.status(400).json({
        ok: false,
        message: `Insufficient balance. Available balance: ৳${Math.max(0, availableBalance)}`
      });
    }

    const withdrawal = {
      id: db.data.nextIds.withdrawals++,
      user_id: user.id,
      amount,
      method,
      payout_number,
      status: "Pending",
      created_at: new Date().toISOString()
    };

    db.data.withdrawals.push(withdrawal);

    addTransaction(
      user.id,
      "Withdraw Request",
      amount,
      `${method} withdrawal request submitted`,
      { withdrawal_id: withdrawal.id }
    );

    addNotification(
      user.id,
      "withdraw_pending",
      `Your ৳${amount} withdrawal request is pending.`
    );

    await db.write();

    res.status(201).json({
      ok: true,
      message: "Withdrawal request submitted",
      withdrawal,
      balance: currentBalance,
      available_balance: availableBalance - amount
    });
  });

  app.get("/api/transactions", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    res.json({
      ok: true,
      transactions: db.data.transactions
        .filter(t => t.user_id === user.id)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    });
  });

  app.get("/api/notifications", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    res.json({
      ok: true,
      notifications: db.data.notifications
        .filter(n => n.user_id === user.id)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    });
  });

  app.post("/api/notifications/read", async (req, res) => {
    const user = findUserByToken(getToken(req));

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    for (const n of db.data.notifications) {
      if (n.user_id === user.id) n.read = true;
    }

    await db.write();

    res.json({
      ok: true,
      message: "Notifications marked as read"
    });
  });

  app.get("/api/referral", async (req, res) => {
    const currentUser = findUserByToken(getToken(req));

    if (!currentUser) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized"
      });
    }

    if (!currentUser.referral_code) {
      currentUser.referral_code = "T24" + String(currentUser.id).padStart(5, "0");
      await db.write();
    }

    const user = currentUser;
    const referrals = db.data.users
      .filter(u => u.referred_by === user.referral_code)
      .map(u => ({
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        created_at: u.created_at
      }));

    await db.write();

    res.json({
      ok: true,
      referral_code: user.referral_code,
      referrals,
      bonuses: [],
      total_bonus: 0,
      offer_enabled: false
    });
  });

  // Admin approval will activate plans later.
  // This endpoint is intentionally NOT exposed as an admin action yet.

  app.post("/api/logout", async (req, res) => {
    const token = getToken(req);

    db.data.sessions = db.data.sessions.filter(
      s => s.token !== token
    );

    await db.write();

    res.json({
      ok: true,
      message: "Logged out"
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Taka24 backend running on http://127.0.0.1:${PORT}`);
    console.log("✅ Database: taka24.json (LowDB)");
    console.log("✅ Auth API: Register + Login + Session");
  });
}

start().catch(err => {
  console.error("❌ Backend startup failed:", err);
  process.exit(1);
});
