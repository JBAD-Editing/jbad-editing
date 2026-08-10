import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_"));
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

window.addEventListener("error", (event) => console.error("Jbad Editing error:", event.error || event.message));
window.addEventListener("unhandledrejection", (event) => console.error("Jbad Editing promise error:", event.reason));

const $ = (id) => document.getElementById(id);
const authModal = $("authModal");
const dashboardModal = $("dashboardModal");
const resetPasswordModal = $("resetPasswordModal");
let authMode = "signup";

function siteUrl(){
  return window.location.origin + window.location.pathname;
}

function showModal(el){ el.classList.remove("hidden"); }
function hideModal(el){ el.classList.add("hidden"); }

$("closeAuth").onclick = () => hideModal(authModal);
$("closeDashboard").onclick = () => hideModal(dashboardModal);
$("closeResetPassword").onclick = () => hideModal(resetPasswordModal);
$("joinButton").onclick = () => { if (!configured) { alert("Jbad Editing is not connected to Supabase yet. Open supabase-config.js, add your Project URL and public/publishable key, save it, then reload the site."); return; } setAuthMode("signup"); showModal(authModal); };
$("authButton").onclick = async () => {
  if (!configured) { alert("Jbad Editing is not connected to Supabase yet. Open supabase-config.js, add your Project URL and public/publishable key, save it, then reload the site."); return; }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) openDashboard();
  else { setAuthMode("login"); showModal(authModal); }
};

function setAuthMode(mode){
  authMode = mode;
  $("profileFields").classList.toggle("hidden", mode === "login");
  $("authSubmit").textContent = mode === "login" ? "Log in" : "Create account";
  $("authTitle").textContent = mode === "login" ? "Editor login" : "Join Jbad Editing";
  $("authHint").textContent = mode === "login"
    ? "Log in to manage your editor profile and showcase."
    : "Create an editor account to publish your profile and showcase your work.";
  $("toggleAuthMode").textContent = mode === "login"
    ? "Need an account? Sign up"
    : "Already have an account? Log in";
  $("authMessage").textContent = "";
}
$("toggleAuthMode").onclick = () => setAuthMode(authMode === "login" ? "signup" : "login");
$("forgotPassword").onclick = async () => {
  if (!supabase) return;
  const email = $("email").value.trim();
  if (!email) {
    $("authMessage").textContent = "Enter your email address first.";
    $("email").focus();
    return;
  }
  $("authMessage").textContent = "Sending recovery email…";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
  if (error) return $("authMessage").textContent = error.message;
  $("authMessage").textContent = "Recovery email sent. Check your inbox and spam folder.";
};

$("resetPasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabase) return;
  const password = $("newPassword").value;
  const confirm = $("confirmPassword").value;
  if (password !== confirm) {
    $("resetPasswordMessage").textContent = "The passwords do not match.";
    return;
  }
  $("resetPasswordMessage").textContent = "Updating password…";
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return $("resetPasswordMessage").textContent = error.message;
  $("resetPasswordMessage").textContent = "Password updated. You can now log in.";
  setTimeout(() => {
    hideModal(resetPasswordModal);
    setAuthMode("login");
    showModal(authModal);
  }, 900);
});

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabase) return;
  const email = $("email").value.trim();
  const password = $("password").value;
  $("authMessage").textContent = "Working…";

  if (authMode === "login") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return $("authMessage").textContent = error.message;
    hideModal(authModal);
    await refreshAuthButton();
    openDashboard();
    return;
  }

  const display_name = $("displayName").value.trim() || "Jbad Editor";
  const speciality = $("speciality").value.trim() || "Video & Photo Editor";
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name, speciality } }
  });
  if (error) return $("authMessage").textContent = error.message;

  if (data.session) {
    hideModal(authModal);
    await refreshAuthButton();
    openDashboard();
  } else {
    $("authMessage").textContent = "Account created. Check your email to confirm your account, then log in.";
  }
});

async function refreshAuthButton(){
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  $("authButton").textContent = session ? "Editor dashboard" : "Editor login";
}
supabase?.auth.onAuthStateChange((event) => {
  refreshAuthButton();
  if (event === "PASSWORD_RECOVERY") {
    showModal(resetPasswordModal);
    $("resetPasswordMessage").textContent = "";
  }
});

async function loadPublicContent(){
  if (!configured) {
    $("editorsGrid").innerHTML = `<div class="empty-state">Supabase is not connected yet. Add your keys to <b>supabase-config.js</b>.</div>`;
    $("featuredGrid").innerHTML = `<div class="empty-state">Your live editor showcase will appear here once Supabase is connected.</div>`;
    return;
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles").select("*").order("created_at", { ascending: false });
  if (profileError) {
    $("editorsGrid").innerHTML = `<div class="empty-state">${escapeHtml(profileError.message)}</div>`;
  } else {
    $("editorsGrid").innerHTML = profiles?.length ? profiles.map(editorCard).join("") :
      `<div class="empty-state">No editors yet. Be the first to join.</div>`;
  }

  const { data: posts, error: postError } = await supabase
    .from("editor_posts").select("*, profiles(display_name, speciality)").order("created_at", { ascending: false });
  if (postError) {
    $("featuredGrid").innerHTML = `<div class="empty-state">${escapeHtml(postError.message)}</div>`;
  } else {
    $("featuredGrid").innerHTML = posts?.length ? posts.map(workCard).join("") :
      `<div class="empty-state">No showcase posts yet.</div>`;
  }
}

function editorCard(p){
  const initials = escapeHtml((p.display_name || "J").slice(0,1).toUpperCase());
  return `<article class="editor-card">
    <div class="editor-avatar">${p.avatar_url ? `<img src="${safeUrl(p.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : initials}</div>
    <div class="editor-info">
      <h3>${escapeHtml(p.display_name)}</h3>
      <p>${escapeHtml(p.speciality || "Editor")}</p>
      ${p.bio ? `<p class="small">${escapeHtml(p.bio)}</p>` : ""}
      ${p.website_url ? `<a class="small" target="_blank" rel="noopener" href="${safeUrl(p.website_url)}">Portfolio ↗</a>` : ""}
    </div>
  </article>`;
}

function workCard(p){
  const editor = p.profiles?.display_name || "Jbad Editor";
  const media = p.media_type === "video"
    ? `<video src="${safeUrl(p.media_url)}" controls preload="metadata"></video>`
    : `<img src="${safeUrl(p.media_url)}" alt="${escapeHtml(p.title)}" loading="lazy">`;
  return `<article class="work-card">
    <div class="work-media">${media}</div>
    <div class="work-info"><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(editor)}</p>${p.description ? `<p class="small">${escapeHtml(p.description)}</p>` : ""}</div>
  </article>`;
}

async function openDashboard(){
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { setAuthMode("login"); showModal(authModal); return; }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  const { data: posts } = await supabase.from("editor_posts").select("*").eq("editor_id", session.user.id).order("created_at", { ascending: false });

  $("dashboardContent").innerHTML = `
    <form id="profileForm" class="dashboard-grid">
      <label>Display name<input id="dName" value="${escapeAttr(profile?.display_name || "")}" maxlength="80" required></label>
      <label>Speciality<input id="dSpeciality" value="${escapeAttr(profile?.speciality || "")}" maxlength="120"></label>
      <label class="full-row">Bio<textarea id="dBio" maxlength="500">${escapeHtml(profile?.bio || "")}</textarea></label>
      <label>Website / portfolio URL<input id="dWebsite" type="url" value="${escapeAttr(profile?.website_url || "")}" placeholder="https://…"></label>
      <label>Avatar URL<input id="dAvatar" type="url" value="${escapeAttr(profile?.avatar_url || "")}" placeholder="https://…"></label>
      <button class="button primary" type="submit">Save profile</button>
      <button class="button danger" type="button" id="logoutButton">Log out</button>
    </form>

    <hr style="border:0;border-top:1px solid #ddd;margin:35px 0">
    <h3>Publish showcase work</h3>
    <form id="postForm" class="dashboard-grid">
      <label>Title<input id="postTitle" maxlength="100" required placeholder="e.g. Football montage"></label>
      <label>Type<select id="postType" style="padding:12px;border:1px solid #ccc;border-radius:8px"><option value="image">Image</option><option value="video">Video</option></select></label>
      <label class="full-row">Description<textarea id="postDescription" maxlength="500" placeholder="Tell people about the edit"></textarea></label>
      <label class="full-row">Media file<input id="postFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" required></label>
      <button class="button primary" type="submit">Publish work</button>
    </form>
    <p id="postMessage" class="form-message"></p>

    <h3>Your posts</h3>
    <div class="post-list">${posts?.length ? posts.map(p => `<div class="post-row"><div><b>${escapeHtml(p.title)}</b><div class="small">${escapeHtml(p.media_type)}</div></div><button class="button danger delete-post" data-id="${p.id}" data-url="${escapeAttr(p.media_url)}">Delete</button></div>`).join("") : `<p class="muted">You haven't published anything yet.</p>`}</div>
  `;

  showModal(dashboardModal);

  $("profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({
      display_name: $("dName").value.trim(),
      speciality: $("dSpeciality").value.trim(),
      bio: $("dBio").value.trim(),
      website_url: $("dWebsite").value.trim() || null,
      avatar_url: $("dAvatar").value.trim() || null,
      updated_at: new Date().toISOString()
    }).eq("id", session.user.id);
    alert(error ? error.message : "Profile saved.");
    if (!error) loadPublicContent();
  };

  $("logoutButton").onclick = async () => {
    await supabase.auth.signOut();
    hideModal(dashboardModal);
    refreshAuthButton();
  };

  $("postForm").onsubmit = async (e) => {
    e.preventDefault();
    const file = $("postFile").files[0];
    const message = $("postMessage");
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return message.textContent = "That file is over the 50 MB limit.";
    message.textContent = "Uploading…";
    const type = $("postType").value;
    if (type === "image" && !file.type.startsWith("image/")) return message.textContent = "Choose an image file.";
    if (type === "video" && !file.type.startsWith("video/")) return message.textContent = "Choose a video file.";

    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) return message.textContent = uploadError.message;
    const { data: publicData } = supabase.storage.from("portfolio").getPublicUrl(path);

    const { error: insertError } = await supabase.from("editor_posts").insert({
      editor_id: session.user.id,
      title: $("postTitle").value.trim(),
      description: $("postDescription").value.trim(),
      media_url: publicData.publicUrl,
      media_type: type
    });
    if (insertError) {
      await supabase.storage.from("portfolio").remove([path]);
      return message.textContent = insertError.message;
    }
    message.textContent = "Published!";
    await openDashboard();
    await loadPublicContent();
  };

  document.querySelectorAll(".delete-post").forEach(btn => btn.onclick = async () => {
    if (!confirm("Delete this post?")) return;
    const url = btn.dataset.url;
    const marker = "/storage/v1/object/public/portfolio/";
    const path = url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
    if (path) await supabase.storage.from("portfolio").remove([path]);
    await supabase.from("editor_posts").delete().eq("id", btn.dataset.id);
    await openDashboard();
    await loadPublicContent();
  });
}

function safeUrl(value){
  try {
    const u = new URL(value, window.location.href);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "#";
  } catch { return "#"; }
}
function escapeHtml(value=""){ return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escapeAttr(value=""){ return escapeHtml(value); }

loadPublicContent();
refreshAuthButton();

$("menuButton").onclick = () => {
  const nav = document.querySelector("nav");
  nav.style.display = nav.style.display === "flex" ? "" : "flex";
  nav.style.position = "absolute";
  nav.style.top = "76px";
  nav.style.left = "0";
  nav.style.right = "0";
  nav.style.padding = "20px";
  nav.style.background = "#f5f5f2";
  nav.style.flexDirection = "column";
};


// If Supabase redirects back here after a password-recovery email, the client
// emits PASSWORD_RECOVERY and the reset form above is shown automatically.
if (configured) {
  supabase.auth.getSession().catch((error) => console.error("Jbad auth session error:", error));
}
