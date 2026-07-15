import {
  createAccount,
  isFirebaseReady,
  loadCloudState,
  saveCloudState,
  saveAdminSettings,
  sendPasswordReset,
  signIn,
  signOutUser,
  startFirebaseAuth
} from "./firebase-service.js";
import { getAppLink, isAdminEmail } from "./firebase-config.js";

const cards = [
  {
    title: "I choose the option that expands me.",
    prompt: "What decision would your future self make before noon today?"
  },
  {
    title: "My actions become evidence.",
    prompt: "Name one tiny action that proves you are becoming her."
  },
  {
    title: "I can be grateful and still want more.",
    prompt: "What are you receiving today, and what are you ready to create next?"
  },
  {
    title: "My whole life gets to expand.",
    prompt: "Where do you want more peace, freedom, health, love, or possibility today?"
  }
];

const starterState = {
  user: null,
  premium: false,
  activeView: "dashboard",
  coachProfile: {
    stage: "Clarity",
    focus: "Whole-life alignment and future self",
    resistance: "Overthinking before the next honest step",
    preferredStyle: "Warm, direct, practical",
    lastCheckIn: "Today",
    evidenceLog: [
      "Completed one aligned life action",
      "Practicing identity before the result arrives"
    ],
    milestones: [
      { label: "Started OYO coaching profile", date: "Today" },
      { label: "Named future self identity", date: "Today" }
    ]
  },
  futureSelf:
    "I am calm, well-resourced, visible, and brave. I own my options before anyone else gets to define them.",
  vision: [
    "A life that feels peaceful, free, and fully mine",
    "A healthy body and clear morning routine",
    "A community of women choosing bigger options"
  ],
  journal: [
    {
      date: "Today",
      title: "Future self check-in",
      body: "I am practicing the identity before the result arrives."
    }
  ],
  gratitude: ["My voice", "New choices", "People who believe in me"],
  actions: [
    { text: "Send one courageous invitation", done: false },
    { text: "Write the next version of my future self", done: false },
    { text: "Complete one aligned life action", done: true }
  ],
  cardShift: 0,
  goals: [
    { title: "Create more peace and freedom", progress: 45, area: "Life" },
    { title: "Deepen daily self-trust", progress: 70, area: "Self" }
  ],
  coachMessages: [
    {
      role: "coach",
      text:
        "Welcome back. Tell me what you want help with today, and I will coach you through life, identity, relationships, wellbeing, purpose, action, and next steps."
    }
  ],
  community: [
    {
      name: "April",
      topic: "Wins",
      text: "Today I chose action before overthinking. That is the option I am owning."
    }
  ]
};

const resources = [
  { title: "Own Your Options Starter Map", tier: "Free", type: "Guide" },
  { title: "Future Self Scripting Prompts", tier: "Free", type: "Workbook" },
  { title: "NLP Reframe Library", tier: "Premium", type: "Exercises" },
  { title: "Life Compass Reset", tier: "Free", type: "Whole-life practice" },
  { title: "LWA Business Pathway", tier: "Premium", type: "Business as one life option" },
  { title: "Manifestation Card Vault", tier: "Premium", type: "Cards" },
  { title: "Community Challenge Calendar", tier: "Free", type: "Community" }
];

const nlpExercises = [
  {
    title: "Identity Reframe",
    tier: "Free",
    body: "Replace 'I am behind' with 'I am building evidence at the pace my nervous system can hold.'"
  },
  {
    title: "Future Pacing",
    tier: "Free",
    body: "Imagine tonight after your aligned action is complete. What did you do first?"
  },
  {
    title: "Parts Integration",
    tier: "Premium",
    body: "Let the protective part and the ambitious part each state their positive intent, then choose one integrated action."
  },
  {
    title: "Belief Ladder",
    tier: "Premium",
    body: "Move from doubt to believable expansion through five bridge thoughts."
  }
];

let state = loadState();
let firebaseEnabled = false;
let cloudUser = null;
let authReady = false;
const app = document.querySelector("#app");

function loadState() {
  try {
    const saved = localStorage.getItem("oyoCoachState");
    if (!saved) return clone(starterState);
    return normalizeState({ ...clone(starterState), ...JSON.parse(saved) });
  } catch (error) {
    localStorage.removeItem("oyoCoachState");
    return clone(starterState);
  }
}

function saveState() {
  updateGrowthProfile();
  localStorage.setItem("oyoCoachState", JSON.stringify(state));
  if (firebaseEnabled && cloudUser && state.user) {
    saveCloudState(cloudUser.uid, state).catch((error) => showNotice(error.message));
  }
}

function normalizeState(nextState) {
  nextState.coachProfile = {
    ...clone(starterState.coachProfile),
    ...(nextState.coachProfile || {})
  };
  if (nextState.coachProfile.focus === "Future self and income-building") {
    nextState.coachProfile.focus = "Whole-life alignment and future self";
  }
  if (nextState.coachProfile.resistance === "Overthinking before the next brave action") {
    nextState.coachProfile.resistance = "Overthinking before the next honest step";
  }
  nextState.coachProfile.evidenceLog =
    nextState.coachProfile.evidenceLog || clone(starterState.coachProfile.evidenceLog);
  nextState.coachProfile.evidenceLog = nextState.coachProfile.evidenceLog.map((item) =>
    item === "Completed one business-building block" ? "Completed one aligned life action" : item
  );
  nextState.coachProfile.milestones =
    nextState.coachProfile.milestones || clone(starterState.coachProfile.milestones);
  nextState.vision = (nextState.vision || starterState.vision).map((item) =>
    item === "A flexible business that supports my life"
      ? "A life that feels peaceful, free, and fully mine"
      : item
  );
  nextState.actions = (nextState.actions || starterState.actions).map((action) => ({
    ...action,
    text:
      action.text === "Complete one business-building block"
        ? "Complete one aligned life action"
        : action.text
  }));
  nextState.goals = (nextState.goals || starterState.goals).map((goal) =>
    goal.title === "Grow recurring income"
      ? { ...goal, title: "Create more peace and freedom", area: "Life" }
      : goal
  );
  return nextState;
}

function todayCard() {
  const index = (new Date().getDate() + (state.cardShift || 0)) % cards.length;
  return cards[index];
}

function render() {
  app.innerHTML = state.user ? renderApp() : renderLogin();
  bindEvents();
}

function renderLoading(message = "Loading OYO Compass...") {
  app.innerHTML = `
    <main class="login-page">
      <section class="hero-panel">
        <div class="brand-lockup">
          <p class="brand-kicker">OYO · Responsibility · Family · Freedom</p>
          <h1><span class="brand-name">Own Your Options</span><span class="script-word">Coaching</span></h1>
          <p>${escapeHtml(message)}</p>
        </div>
      </section>
      <section class="login-card" aria-label="Loading">
        <div>
          <p class="eyebrow">OYO Compass</p>
          <h2>Getting your compass ready.</h2>
          <p class="notice">${escapeHtml(message)}</p>
        </div>
        <p class="login-copyright">© 2026 Own Your Options™. All rights reserved.</p>
      </section>
    </main>
  `;
}

function renderLogin() {
  const setupRequired = !firebaseEnabled;
  return `
    <main class="login-page">
      <section class="hero-panel">
        <div class="brand-lockup">
          <p class="brand-kicker">OYO · Responsibility · Family · Freedom</p>
          <h1><span class="brand-name">Own Your Options</span><span class="script-word">Coaching</span></h1>
          <p>An AI-guided OYO coaching home for life, self-trust, future self work, wellbeing, relationships, purpose, gratitude, daily action, and creating more options.</p>
        </div>
      </section>
      <section class="login-card" aria-label="Sign in">
        <div>
          <p class="eyebrow">OYO Compass</p>
          <h2>Step into Own Your Options.</h2>
          <p>${firebaseEnabled ? "Sign in to save your private OYO coach memory, journal, goals, and actions to your own account." : "Firebase must be connected before this app can be used live."}</p>
        </div>
        <label class="field">
          <span>Name</span>
          <input id="loginName" autocomplete="name" placeholder="April" />
        </label>
        <label class="field">
          <span>Email</span>
          <input id="loginEmail" type="email" autocomplete="email" placeholder="you@example.com" />
        </label>
        <label class="field">
          <span>Password</span>
          <input id="loginPassword" type="password" autocomplete="current-password" placeholder="At least 6 characters" />
        </label>
        <p class="notice" id="notice">${firebaseEnabled ? "Your data will be private to your login." : "Live mode is locked until your Firebase config is pasted into firebase-config.js."}</p>
        <div class="button-row">
          <button class="btn primary" id="loginBtn" ${setupRequired ? "disabled" : ""}>Sign In</button>
          <button class="btn" id="createAccountBtn" ${setupRequired ? "disabled" : ""}>Create Account</button>
          <button class="btn ghost" id="resetPasswordBtn" ${setupRequired ? "disabled" : ""}>Reset Password</button>
        </div>
        <p class="login-copyright">© 2026 Own Your Options™. All rights reserved.</p>
      </section>
    </main>
  `;
}

function renderApp() {
  const views = [
    ["dashboard", "Dashboard"],
    ["coach", "AI Coach"],
    ["growth", "Growth Memory"],
    ["future", "Future Self"],
    ["vision", "Vision + Journal"],
    ["cards", "Daily Cards"],
    ["exercises", "Exercises"],
    ["goals", "Goals"],
    ["business", "Life + Business"],
    ["library", "Library"],
    ["community", "Community"]
  ];
  if (isAdmin()) views.push(["admin", "Admin"]);

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="logo"><span class="logo-mark">OYO</span><span>Own Your Options</span></div>
        <nav class="nav" aria-label="Primary">
          ${views
            .map(
              ([id, label]) =>
                `<button data-view="${id}" class="${state.activeView === id ? "active" : ""}">${label}</button>`
            )
            .join("")}
        </nav>
        <div class="account">
          <span class="avatar">${escapeHtml(state.user.name.slice(0, 1).toUpperCase())}</span>
          <span class="plan-pill ${state.premium ? "premium" : ""}">${state.premium ? "Premium" : "Free"}</span>
          <button class="btn small ghost" id="logoutBtn">Log out</button>
        </div>
      </header>
      <main class="workspace">${renderView()}</main>
      ${renderCopyright()}
    </div>
  `;
}

function renderCopyright() {
  return `
    <footer class="app-footer">
      <span>© 2026 Own Your Options™. All rights reserved.</span>
      <span>OYO Compass is part of Own Your Options™.</span>
    </footer>
  `;
}

function renderView() {
  const map = {
    dashboard: renderDashboard,
    coach: renderCoach,
    growth: renderGrowth,
    future: renderFuture,
    vision: renderVisionJournal,
    cards: renderCards,
    exercises: renderExercises,
    goals: renderGoals,
    business: renderBusiness,
    library: renderLibrary,
    community: renderCommunity,
    admin: renderAdmin
  };
  if (state.activeView === "admin" && !isAdmin()) return renderAdminLocked();
  return (map[state.activeView] || renderDashboard)();
}

function renderDashboard() {
  const done = state.actions.filter((action) => action.done).length;
  const growth = growthInsights();
  return `
    <section class="dashboard-hero">
      <div class="welcome">
        <p class="eyebrow">Welcome, ${escapeHtml(state.user.name)}</p>
        <h1>Own your options. Build your freedom.</h1>
        <p>${escapeHtml(state.futureSelf)}</p>
        <div class="button-row">
          <button class="btn coral" data-view="coach">Start Coaching</button>
          <button class="btn" data-view="growth">Life Compass</button>
        </div>
      </div>
      <aside class="today-card">
        <div>
          <span class="card-label">Daily Manifestation Card</span>
          <div class="manifestation-card">
            <strong>${escapeHtml(todayCard().title)}</strong>
            <span>${escapeHtml(todayCard().prompt)}</span>
          </div>
        </div>
        <button class="btn primary" data-view="cards">Open Daily Practice</button>
      </aside>
    </section>
    <section class="stats-grid">
      <div class="stat"><span class="card-label">Actions</span><strong>${done}/${state.actions.length}</strong><span class="muted">completed today</span></div>
      <div class="stat"><span class="card-label">Goals</span><strong>${state.goals.length}</strong><span class="muted">active outcomes</span></div>
      <div class="stat"><span class="card-label">Gratitude</span><strong>${state.gratitude.length}</strong><span class="muted">anchors saved</span></div>
      <div class="stat"><span class="card-label">Growth Stage</span><strong>${escapeHtml(growth.stage)}</strong><span class="muted">${escapeHtml(growth.nextStep)}</span></div>
    </section>
    <section class="module-grid two">
      <div class="module">
        <div class="section-title"><h2>Today’s Actions</h2><button class="btn small" data-view="goals">Manage</button></div>
        ${renderActionList()}
      </div>
      <div class="module accent">
        <div class="section-title"><h2>OYO Growth Path</h2><button class="btn small" data-view="growth">Memory</button></div>
        <div class="list">
          <div class="item"><span class="tag">Now</span><strong>${escapeHtml(growth.focus)}</strong><p class="muted">The coach uses this focus when suggesting actions and reframes.</p></div>
          <div class="item"><span class="tag premium">Pattern</span><strong>${escapeHtml(growth.pattern)}</strong><p class="muted">This updates as the person journals, completes actions, and asks for coaching.</p></div>
        </div>
      </div>
    </section>
  `;
}

function renderCoach() {
  const growth = growthInsights();
  const premiumAccess = canAccessPremium();
  return `
    <section class="section-title">
      <div><p class="eyebrow">OYO Compass AI</p><h2>A coach that grows with the whole person.</h2><p>Current memory: ${escapeHtml(growth.stage)} stage, focused on ${escapeHtml(growth.focus.toLowerCase())}.</p></div>
      ${premiumAccess ? `<span class="tag premium">Premium depth unlocked</span>` : renderPremiumButton("Unlock premium coaching")}
    </section>
    <section class="memory-strip">
      <div><span class="card-label">Coach Memory</span><strong>${escapeHtml(growth.pattern)}</strong></div>
      <div><span class="card-label">Next Best Step</span><strong>${escapeHtml(growth.nextStep)}</strong></div>
      <button class="btn small" data-view="growth">View Growth Memory</button>
    </section>
    <section class="module">
      <div class="chat" id="chatLog">
        ${state.coachMessages
          .map((message) => `<div class="bubble ${message.role}">${escapeHtml(message.text)}</div>`)
          .join("")}
      </div>
      <div class="coach-input">
        <input id="coachText" placeholder="Ask about life, confidence, relationships, wellbeing, goals, purpose..." />
        <button class="btn primary" id="coachSend">Send</button>
      </div>
    </section>
  `;
}

function renderGrowth() {
  const growth = growthInsights();
  return `
    <section class="section-title">
      <div><p class="eyebrow">Growth Memory</p><h2>The app learns the person over time.</h2><p>This is the living OYO profile the coach uses to personalize prompts, reframes, and action steps.</p></div>
      <button class="btn primary" id="saveGrowth">Save Memory</button>
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Living Coach Profile</h2>
        <label class="field"><span>Main focus</span><input id="profileFocus" value="${escapeHtml(state.coachProfile.focus)}" /></label>
        <label class="field"><span>Current resistance</span><input id="profileResistance" value="${escapeHtml(state.coachProfile.resistance)}" /></label>
        <label class="field"><span>Preferred coaching style</span><input id="profileStyle" value="${escapeHtml(state.coachProfile.preferredStyle)}" /></label>
      </div>
      <div class="module accent">
        <h2>Coach Insight</h2>
        <div class="growth-meter" aria-label="Growth score">
          <span style="width: ${growth.score}%"></span>
        </div>
        <div class="list">
          <div class="item"><span class="tag">Stage</span><strong>${escapeHtml(growth.stage)}</strong><p class="muted">${escapeHtml(growth.stageNote)}</p></div>
          <div class="item"><span class="tag">Pattern</span><strong>${escapeHtml(growth.pattern)}</strong></div>
          <div class="item"><span class="tag premium">Next</span><strong>${escapeHtml(growth.nextStep)}</strong></div>
        </div>
      </div>
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Evidence Log</h2>
        <div class="list">
          ${state.coachProfile.evidenceLog
            .map((item) => `<div class="item"><span class="tag">Evidence</span>${escapeHtml(item)}</div>`)
            .join("")}
        </div>
      </div>
      <div class="module">
        <h2>Milestones</h2>
        <div class="timeline">
          ${state.coachProfile.milestones
            .map((milestone) => `<div class="timeline-item"><span>${escapeHtml(milestone.date)}</span><strong>${escapeHtml(milestone.label)}</strong></div>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderFuture() {
  return `
    <section class="section-title">
      <div><p class="eyebrow">Future Self</p><h2>Write the identity before the result arrives.</h2><p>Your coach uses this as a north star for actions, reframes, and goals.</p></div>
    </section>
    <section class="module-grid two">
      <div class="module">
        <label class="field">
          <span>Future self statement</span>
          <textarea id="futureSelfText">${escapeHtml(state.futureSelf)}</textarea>
        </label>
        <button class="btn primary" id="saveFuture">Save Future Self</button>
      </div>
      <div class="module accent">
        <h2>Future Self Prompts</h2>
        <div class="list">
          <div class="item">What does she no longer negotiate with?</div>
          <div class="item">What option does she choose when fear gets loud?</div>
          <div class="item">What standard is she practicing this week?</div>
        </div>
      </div>
    </section>
  `;
}

function renderVisionJournal() {
  return `
    <section class="section-title">
      <div><p class="eyebrow">Vision Board + Journal</p><h2>See it, script it, act from it.</h2></div>
      <button class="btn primary" id="addVision">Add Vision Tile</button>
    </section>
    <section class="vision-grid">
      ${state.vision.map((item) => `<div class="vision-tile"><strong>${escapeHtml(item)}</strong></div>`).join("")}
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Journal</h2>
        <label class="field"><span>Title</span><input id="journalTitle" placeholder="Today I am choosing..." /></label>
        <label class="field"><span>Entry</span><textarea id="journalBody" placeholder="Write what future you needs to hear."></textarea></label>
        <button class="btn primary" id="addJournal">Save Entry</button>
      </div>
      <div class="module">
        <h2>Recent Entries</h2>
        <div class="list">
          ${state.journal
            .map((entry) => `<div class="item"><span class="tag">${escapeHtml(entry.date)}</span><strong>${escapeHtml(entry.title)}</strong><p class="muted">${escapeHtml(entry.body)}</p></div>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderCards() {
  const activeCard = todayCard();
  return `
    <section class="section-title">
      <div><p class="eyebrow">Daily Manifestation</p><h2>Pull the card, choose the evidence.</h2></div>
      <button class="btn primary" id="newCard">Refresh Practice</button>
    </section>
    <section class="module-grid">
      ${cards
        .map(
          (card, index) => `
          <div class="prompt-card item">
            <span class="tag">${card.title === activeCard.title ? "Today" : "Card"}</span>
            <strong>${escapeHtml(card.title)}</strong>
            <p class="muted">${escapeHtml(card.prompt)}</p>
          </div>`
        )
        .join("")}
    </section>
    <section class="module">
      <h2>Gratitude</h2>
      <div class="coach-input">
        <input id="gratitudeText" placeholder="I am grateful for..." />
        <button class="btn primary" id="addGratitude">Add</button>
      </div>
      <div class="list">${state.gratitude.map((item) => `<div class="item">${escapeHtml(item)}</div>`).join("")}</div>
    </section>
  `;
}

function renderExercises() {
  const premiumAccess = canAccessPremium();
  return `
    <section class="section-title">
      <div><p class="eyebrow">NLP Inspired Exercises</p><h2>Shift the pattern, then move.</h2></div>
      ${premiumAccess ? `<span class="tag premium">All exercises available</span>` : renderPremiumButton("Unlock Premium")}
    </section>
    <section class="exercise-grid">
      ${nlpExercises
        .map((exercise) =>
          exercise.tier === "Premium" && !premiumAccess
            ? renderLockedCard(exercise.title, "Premium exercise")
            : `<div class="item"><span class="tag ${exercise.tier === "Premium" ? "premium" : ""}">${exercise.tier}</span><strong>${escapeHtml(exercise.title)}</strong><p class="muted">${escapeHtml(exercise.body)}</p></div>`
        )
        .join("")}
    </section>
  `;
}

function renderGoals() {
  return `
    <section class="section-title">
      <div><p class="eyebrow">Goals + Daily Actions</p><h2>Turn intention into evidence.</h2></div>
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Daily Actions</h2>
        <div class="coach-input">
          <input id="actionText" placeholder="Add one clear next action" />
          <button class="btn primary" id="addAction">Add</button>
        </div>
        ${renderActionList()}
      </div>
      <div class="module">
        <h2>Goals</h2>
        <div class="coach-input">
          <input id="goalText" placeholder="Add a life goal" />
          <button class="btn primary" id="addGoal">Add Goal</button>
        </div>
        <div class="list">
          ${state.goals
            .map(
              (goal) => `
            <div class="item">
              <div class="item-header"><strong>${escapeHtml(goal.title)}</strong><span class="tag">${escapeHtml(goal.area)}</span></div>
              <progress value="${goal.progress}" max="100"></progress>
              <span class="muted">${goal.progress}% embodied</span>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderBusiness() {
  const lwaLink = getAppLink("lwa");
  const premiumAccess = canAccessPremium();
  return `
    <section class="section-title">
      <div><p class="eyebrow">Life + Business Builder</p><h2>Build a life that your work can support.</h2><p>Business is one option inside the bigger OYO Compass: peace, family, health, purpose, freedom, income, and aligned action.</p></div>
      ${premiumAccess ? `<span class="tag premium">Premium life path</span>` : renderPremiumButton("Unlock Builder")}
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Whole-Life Path</h2>
        <div class="list">
          <div class="item"><span class="tag">Step 1</span><strong>Clarify the life you want</strong><p class="muted">What do you want more of: peace, freedom, health, love, confidence, purpose, time, or income?</p></div>
          <div class="item"><span class="tag">Step 2</span><strong>Choose one aligned option</strong><p class="muted">Take a step that supports your nervous system, relationships, wellbeing, and future self.</p></div>
          ${premiumAccess ? `<div class="item"><span class="tag premium">LWA</span><strong>Explore the LWA pathway</strong><p class="muted">Use the premium pathway only when business-building supports the life you are choosing.</p>${lwaLink ? `<a class="btn primary" href="${escapeHtml(lwaLink)}" target="_blank" rel="noopener">Open LWA Link</a>` : `<p class="muted">Add your LWA link in firebase-config.js.</p>`}</div>` : renderLockedCard("LWA pathway", "Premium life and business resource")}
        </div>
      </div>
      <div class="module accent">
        <h2>Today’s Life Compass Prompt</h2>
        <p class="muted">What part of your life needs the most honest option today: your peace, body, home, relationships, money, purpose, or future self?</p>
        <button class="btn primary" data-view="coach">Coach Me Through It</button>
      </div>
    </section>
  `;
}

function renderLibrary() {
  const premiumAccess = canAccessPremium();
  return `
    <section class="section-title">
      <div><p class="eyebrow">Resource Library</p><h2>Everything has a home.</h2></div>
      ${premiumAccess ? `<span class="tag premium">Premium library open</span>` : renderPremiumButton("Upgrade")}
    </section>
    <section class="resource-grid">
      ${resources
        .map((resource) =>
          resource.tier === "Premium" && !premiumAccess
            ? renderLockedCard(resource.title, resource.type)
            : `<div class="item"><span class="tag ${resource.tier === "Premium" ? "premium" : ""}">${resource.tier}</span><strong>${escapeHtml(resource.title)}</strong><p class="muted">${escapeHtml(resource.type)}</p></div>`
        )
        .join("")}
    </section>
  `;
}

function renderCommunity() {
  const premiumAccess = canAccessPremium();
  return `
    <section class="section-title">
      <div><p class="eyebrow">Community</p><h2>A built-in circle for owned options.</h2></div>
      ${premiumAccess ? `<span class="tag premium">Posting enabled</span>` : renderPremiumButton("Unlock full community")}
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Share a Win</h2>
        ${
          premiumAccess
            ? `<label class="field"><span>Post</span><textarea id="communityText" placeholder="What option did you own today?"></textarea></label><button class="btn primary" id="addPost">Post</button>`
            : `<div class="paywall"><strong>Free members can read the preview.</strong><p class="muted">Premium members can post, join circles, and access life, mindset, relationships, wellbeing, and business threads.</p>${renderPremiumButton("Upgrade")}</div>`
        }
      </div>
      <div class="module">
        <h2>Community Feed</h2>
        <div class="list">
          ${state.community
            .map((post) => `<article class="community-post"><strong>${escapeHtml(post.name)} · ${escapeHtml(post.topic)}</strong><p class="muted">${escapeHtml(post.text)}</p></article>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderAdmin() {
  return `
    <section class="section-title">
      <div><p class="eyebrow">Admin</p><h2>Owner controls for OYO Compass.</h2><p>This area only appears for the owner email listed in Firebase config and Firestore rules.</p></div>
      <span class="tag premium">Owner only</span>
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Access Controls</h2>
        <div class="list">
          <div class="item"><span class="tag">Admin email</span><strong>${escapeHtml(state.user.email)}</strong><p class="muted">Only this configured owner email can see this Admin tab.</p></div>
          <div class="item"><span class="tag">Members</span><strong>Members can only read and write their own user record.</strong><p class="muted">Protected by Firestore rules at /users/{userId}.</p></div>
          <div class="item"><span class="tag premium">Admin data</span><strong>Only admin can read and write /admin records.</strong><p class="muted">Protected by Firestore rules using the owner email.</p></div>
        </div>
      </div>
      <div class="module accent">
        <h2>Premium Controls</h2>
        <p class="muted">Add your premium payment link and LWA link in firebase-config.js. Members can click the premium payment button, but only admin/payment setup should grant premium access.</p>
        <div class="list">
          <div class="item"><span class="tag">Premium link</span><strong>${escapeHtml(getAppLink("premiumPayment") || "Not added yet")}</strong></div>
          <div class="item"><span class="tag">LWA link</span><strong>${escapeHtml(getAppLink("lwa") || "Not added yet")}</strong></div>
        </div>
        <div class="button-row">
          <button class="btn primary" id="adminSaveSettings">Save Admin Settings</button>
          <button class="btn" id="adminGrantSelf">Test Premium On My Account</button>
        </div>
      </div>
    </section>
    <section class="module-grid two">
      <div class="module">
        <h2>Content Areas</h2>
        <div class="list">
          <div class="item"><span class="tag">Life</span>Future self, vision board, journal, gratitude, goals, daily actions.</div>
          <div class="item"><span class="tag">Growth</span>Coach memory, stage, pattern, milestones, evidence log.</div>
          <div class="item"><span class="tag">Community</span>Wins, support, and member circles.</div>
          <div class="item"><span class="tag premium">Business</span>LWA and income-building as one pathway inside the whole-life compass.</div>
        </div>
      </div>
      <div class="module">
        <h2>Premium Pack Preview</h2>
        <div class="list">
          <div class="item"><span class="tag premium">Premium</span><strong>NLP Reframe Library</strong><p class="muted">Deeper exercises for identity, belief, future pacing, and parts work.</p></div>
          <div class="item"><span class="tag premium">Premium</span><strong>Manifestation Card Vault</strong><p class="muted">More daily cards, prompts, and reflection pathways.</p></div>
          <div class="item"><span class="tag premium">Premium</span><strong>LWA Life + Business Pathway</strong><p class="muted">The business option inside the wider life compass.</p></div>
          <div class="item"><span class="tag premium">Premium</span><strong>Full Community</strong><p class="muted">Posting, circles, support threads, and deeper member interaction.</p></div>
        </div>
      </div>
      <div class="module">
        <h2>Admin Checklist</h2>
        <div class="list">
          <div class="item">Authentication: Email/Password enabled</div>
          <div class="item">Firestore: production database created</div>
          <div class="item">Rules: owner/user privacy rules published</div>
          <div class="item">Hosting: upload latest zip to GitHub or deploy with Firebase Hosting</div>
        </div>
      </div>
    </section>
  `;
}

function renderAdminLocked() {
  return `
    <section class="module">
      <p class="eyebrow">Admin</p>
      <h2>Admin access is locked.</h2>
      <p class="muted">This area is only available to the Own Your Options owner account.</p>
      <button class="btn primary" data-view="dashboard">Return to Dashboard</button>
    </section>
  `;
}

function renderLockedCard(title, label) {
  return `<div class="paywall"><span class="tag premium">Premium</span><strong>${escapeHtml(title)}</strong><p class="muted">${escapeHtml(label)} is included in the premium Own Your Options path.</p>${renderPremiumButton("Unlock Premium")}</div>`;
}

function renderPremiumButton(label) {
  const paymentLink = getAppLink("premiumPayment");
  if (paymentLink) {
    return `<a class="btn coral" href="${escapeHtml(paymentLink)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }
  return `<button class="btn coral" id="upgradeBtn">${escapeHtml(label)}</button>`;
}

function renderActionList() {
  return `<div class="list">${state.actions
    .map(
      (action, index) => `
      <label class="item item-header">
        <span>${escapeHtml(action.text)}</span>
        <input type="checkbox" data-action="${index}" ${action.done ? "checked" : ""} aria-label="Mark action complete" />
      </label>`
    )
    .join("")}</div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      saveState();
      render();
    });
  });

  const loginBtn = document.querySelector("#loginBtn");
  loginBtn?.addEventListener("click", () => {
    if (!firebaseEnabled) {
      showNotice("Add your Firebase config first. This live app does not allow demo access.");
      return;
    }
    handleFirebaseSignIn();
  });

  document.querySelector("#createAccountBtn")?.addEventListener("click", handleFirebaseCreateAccount);
  document.querySelector("#resetPasswordBtn")?.addEventListener("click", handlePasswordReset);

  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    if (firebaseEnabled && cloudUser) {
      signOutUser().catch((error) => showNotice(error.message));
    }
    state.user = null;
    cloudUser = null;
    saveState();
    render();
  });

  document.querySelectorAll("#upgradeBtn").forEach((button) => {
    button.addEventListener("click", () => {
      showAppMessage("Premium access will be managed by the Own Your Options admin or payment setup. Members cannot unlock this themselves.");
    });
  });

  document.querySelector("#adminSaveSettings")?.addEventListener("click", async () => {
    try {
      await saveAdminSettings(cloudUser, {
        appName: "OYO Compass",
        premiumManagedByAdmin: true,
        wholeLifeFirst: true
      });
      showAppMessage("Admin settings saved.");
    } catch (error) {
      showAppMessage(error.message);
    }
  });

  document.querySelector("#adminGrantSelf")?.addEventListener("click", () => {
    if (!isAdmin()) return showAppMessage("Admin access only.");
    state.premium = true;
    saveState();
    render();
  });

  document.querySelector("#saveFuture")?.addEventListener("click", () => {
    state.futureSelf = document.querySelector("#futureSelfText").value.trim() || state.futureSelf;
    addMilestone("Updated future self identity");
    saveState();
    render();
  });

  document.querySelector("#addVision")?.addEventListener("click", () => {
    const value = prompt("What vision are you adding?");
    if (!value) return;
    state.vision.unshift(value.trim());
    saveState();
    render();
  });

  document.querySelector("#addJournal")?.addEventListener("click", () => {
    const title = document.querySelector("#journalTitle").value.trim() || "Untitled reflection";
    const body = document.querySelector("#journalBody").value.trim();
    if (!body) return;
    state.journal.unshift({ date: "Today", title, body });
    addEvidence(`Journaled: ${title}`);
    saveState();
    render();
  });

  document.querySelector("#addGratitude")?.addEventListener("click", () => {
    const input = document.querySelector("#gratitudeText");
    if (!input.value.trim()) return;
    state.gratitude.unshift(input.value.trim());
    addEvidence(`Practiced gratitude: ${input.value.trim()}`);
    saveState();
    render();
  });

  document.querySelector("#addAction")?.addEventListener("click", () => {
    const input = document.querySelector("#actionText");
    if (!input.value.trim()) return;
    state.actions.unshift({ text: input.value.trim(), done: false });
    addMilestone("Added a new aligned action");
    saveState();
    render();
  });

  document.querySelector("#addGoal")?.addEventListener("click", () => {
    const input = document.querySelector("#goalText");
    if (!input.value.trim()) return;
    state.goals.unshift({ title: input.value.trim(), progress: 10, area: "Life" });
    addMilestone("Added a new life goal");
    saveState();
    render();
  });

  document.querySelector("#newCard")?.addEventListener("click", () => {
    state.cardShift = ((state.cardShift || 0) + 1) % cards.length;
    saveState();
    render();
  });

  document.querySelectorAll("[data-action]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.actions[Number(checkbox.dataset.action)].done = checkbox.checked;
      if (checkbox.checked) addEvidence(`Completed action: ${state.actions[Number(checkbox.dataset.action)].text}`);
      saveState();
      render();
    });
  });

  document.querySelector("#saveGrowth")?.addEventListener("click", () => {
    state.coachProfile.focus = document.querySelector("#profileFocus").value.trim() || state.coachProfile.focus;
    state.coachProfile.resistance =
      document.querySelector("#profileResistance").value.trim() || state.coachProfile.resistance;
    state.coachProfile.preferredStyle =
      document.querySelector("#profileStyle").value.trim() || state.coachProfile.preferredStyle;
    addMilestone("Refined coach memory profile");
    saveState();
    render();
  });

  document.querySelector("#coachSend")?.addEventListener("click", sendCoachMessage);
  document.querySelector("#coachText")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendCoachMessage();
  });

  document.querySelector("#addPost")?.addEventListener("click", () => {
    const input = document.querySelector("#communityText");
    if (!input.value.trim()) return;
    state.community.unshift({ name: state.user.name, topic: "Owned Option", text: input.value.trim() });
    saveState();
    render();
  });
}

function sendCoachMessage() {
  const input = document.querySelector("#coachText");
  const text = input.value.trim();
  if (!text) return;
  state.coachMessages.push({ role: "user", text });
  state.coachMessages.push({ role: "coach", text: coachReply(text) });
  saveState();
  render();
}

async function handleFirebaseSignIn() {
  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#loginPassword").value.trim();
  if (!email || !password) {
    showNotice("Enter your email and password.");
    return;
  }
  try {
    await signIn(email, password);
  } catch (error) {
    showNotice(error.message);
  }
}

async function handleFirebaseCreateAccount() {
  const name = document.querySelector("#loginName").value.trim() || "OYO Member";
  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#loginPassword").value.trim();
  if (!email || password.length < 6) {
    showNotice("Enter an email and a password with at least 6 characters.");
    return;
  }
  try {
    const user = await createAccount(name, email, password);
    state.user = { name, email, uid: user.uid };
    await saveCloudState(user.uid, state);
  } catch (error) {
    showNotice(error.message);
  }
}

async function handlePasswordReset() {
  const email = document.querySelector("#loginEmail").value.trim();
  if (!email) {
    showNotice("Enter your email first, then click Reset Password.");
    return;
  }
  try {
    await sendPasswordReset(email);
    showNotice("Password reset email sent. Check your inbox.");
  } catch (error) {
    showNotice(error.message);
  }
}

function showNotice(message) {
  const notice = document.querySelector("#notice");
  if (notice) notice.textContent = message;
}

function showAppMessage(message) {
  window.alert(message);
}

function isAdmin() {
  return isAdminEmail(state.user?.email);
}

function canAccessPremium() {
  return Boolean(state.premium || isAdmin());
}

function coachReply(text) {
  const lower = text.toLowerCase();
  const growth = growthInsights();
  if (!state.premium && /(business|income|sales|lwa|premium|nlp|belief|launch)/.test(lower)) {
    return `I remember your current focus is ${growth.focus.toLowerCase()}. Business is one part of your whole life, so start by asking: what do I need my work to support in my peace, family, health, freedom, and purpose? Then choose one grounded next step.`;
  }
  if (/(stuck|fear|scared|overwhelm|anxious)/.test(lower)) {
    return `I am noticing the pattern: ${growth.pattern.toLowerCase()}. Pause and separate the feeling from the option. What part of your life is asking for care right now, and what is one tiny step your future self can take without forcing?`;
  }
  if (/(goal|action|today|next)/.test(lower)) {
    return `Based on your ${growth.stage.toLowerCase()} stage, choose one action small enough to finish today and meaningful enough to count as evidence in your life. Write it as: I will do X by Y because I am becoming Z.`;
  }
  if (/(relationship|family|marriage|partner|friend|kids|children|home|love)/.test(lower)) {
    return `Let’s bring this into your relationships and home life. What option protects your peace and honors connection? Choose one honest conversation, boundary, or loving action that future you would respect.`;
  }
  if (/(health|body|wellbeing|well-being|energy|sleep|routine|stress)/.test(lower)) {
    return `Your body is part of the compass too. What is the kindest next signal you can give yourself today: rest, movement, water, food, space, or a simpler expectation?`;
  }
  if (/(business|income|lwa|sales|client)/.test(lower)) {
    return `Your OYO memory says your focus is ${growth.focus.toLowerCase()}. Let’s keep business inside your bigger life vision: clarify the life you want your work to support, then choose one aligned action that creates income without abandoning yourself.`;
  }
  return `I hear you. I am holding your future self statement and your current growth stage: ${growth.stage}. Bring it back to your whole life: "${state.futureSelf}" What option would she own in the next 20 minutes?`;
}

function growthInsights() {
  const completed = state.actions.filter((action) => action.done).length;
  const totalEvidence = completed + state.journal.length + state.gratitude.length + state.goals.length;
  const businessSignals = countSignals(["business", "income", "sales", "client", "lwa", "offer"]);
  const lifeSignals = countSignals([
    "life",
    "family",
    "relationship",
    "health",
    "body",
    "peace",
    "home",
    "purpose",
    "freedom",
    "wellbeing",
    "routine"
  ]);
  const identitySignals = countSignals(["future", "identity", "confidence", "belief", "trust", "self"]);
  const resistanceSignals = countSignals(["stuck", "fear", "overwhelm", "anxious", "behind"]);
  const score = Math.min(100, Math.max(10, totalEvidence * 8 + completed * 10));
  const stage = score > 74 ? "Expansion" : score > 42 ? "Momentum" : "Clarity";
  const focus =
    lifeSignals >= businessSignals
      ? "Whole-life alignment and future self"
      : businessSignals > identitySignals + 2
        ? "Business as one part of life and freedom"
        : state.coachProfile.focus || "Whole-life alignment and future self";
  const pattern =
    resistanceSignals > 1
      ? state.coachProfile.resistance
      : completed >= 2
        ? "You respond well to small evidence-based actions"
        : "You are building self-trust through clarity before action";
  const nextStep =
    stage === "Expansion"
      ? "Choose a bolder life-giving step"
      : stage === "Momentum"
        ? "Repeat the action that created the strongest peace or evidence"
        : "Name the next honest option and take one tiny step";
  const stageNote =
    stage === "Expansion"
      ? "The person has enough evidence to practice bigger alignment, visibility, and freedom."
      : stage === "Momentum"
        ? "The person is moving from insight into repeatable aligned action."
        : "The person is clarifying identity, life direction, desire, and the safest next action.";

  return { focus, nextStep, pattern, score, stage, stageNote };
}

function countSignals(words) {
  const text = [
    state.futureSelf,
    state.coachProfile.focus,
    state.coachProfile.resistance,
    ...state.journal.map((entry) => `${entry.title} ${entry.body}`),
    ...state.actions.map((action) => action.text),
    ...state.goals.map((goal) => `${goal.title} ${goal.area}`),
    ...state.coachMessages.map((message) => message.text)
  ]
    .join(" ")
    .toLowerCase();
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
}

function updateGrowthProfile() {
  const growth = growthInsights();
  state.coachProfile.stage = growth.stage;
  state.coachProfile.focus = state.coachProfile.focus || growth.focus;
  state.coachProfile.lastCheckIn = "Today";
}

function addEvidence(text) {
  if (!text || state.coachProfile.evidenceLog.includes(text)) return;
  state.coachProfile.evidenceLog.unshift(text);
  state.coachProfile.evidenceLog = state.coachProfile.evidenceLog.slice(0, 8);
}

function addMilestone(label) {
  if (!label || state.coachProfile.milestones.some((milestone) => milestone.label === label)) return;
  state.coachProfile.milestones.unshift({ label, date: "Today" });
  state.coachProfile.milestones = state.coachProfile.milestones.slice(0, 8);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

boot();

async function boot() {
  firebaseEnabled = isFirebaseReady();
  if (!firebaseEnabled) {
    state.user = null;
    render();
    return;
  }

  renderLoading("Connecting securely to Firebase...");

  try {
    authReady = await startFirebaseAuth(async (user) => {
      try {
        cloudUser = user;
        if (!user) {
          state.user = null;
          render();
          return;
        }

        const cloudState = await loadCloudState(user.uid);
        if (cloudState) {
          state = normalizeState(cloudState);
        } else {
          state.user = {
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            uid: user.uid
          };
          await saveCloudState(user.uid, state);
        }
        localStorage.setItem("oyoCoachState", JSON.stringify(state));
        render();
      } catch (error) {
        state.user = null;
        render();
        showNotice(`Firebase connected, but user data could not load: ${error.message}`);
      }
    });

    if (!authReady) {
      state.user = null;
      render();
    }
  } catch (error) {
    state.user = null;
    render();
    showNotice(`Firebase could not start: ${error.message}`);
  }
}
