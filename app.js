import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

const authModal = $("authModal");
const dashboardModal = $("dashboardModal");
const resetPasswordModal = $("resetPasswordModal");

let authMode = "signup";

function showModal(element) {
  if (element) element.classList.remove("hidden");
}

function hideModal(element) {
  if (element) element.classList.add("hidden");
}

function siteUrl() {
  return window.location.origin + window.location.pathname;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character];
  });
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function safeUrl(value) {
  try {
    const url = new URL(value, window.location.href);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }

    return "#";
  } catch {
    return "#";
  }
}

/* AUTH */

$("closeAuth").onclick = function () {
  hideModal(authModal);
};

$("closeDashboard").onclick = function () {
  hideModal(dashboardModal);
};

$("closeResetPassword").onclick = function () {
  hideModal(resetPasswordModal);
};

function setAuthMode(mode) {
  authMode = mode;

  $("profileFields").classList.toggle("hidden", mode === "login");

  $("authSubmit").textContent =
    mode === "login" ? "Log in" : "Create account";

  $("authTitle").textContent =
    mode === "login" ? "Editor login" : "Join Jbad Editing";

  $("authHint").textContent =
    mode === "login"
      ? "Log in to manage your editor profile and showcase."
      : "Create an editor account to publish your profile and showcase your work.";

  $("toggleAuthMode").textContent =
    mode === "login"
      ? "Need an account? Sign up"
      : "Already have an account? Log in";

  $("forgotPassword").classList.toggle(
    "hidden",
    mode !== "login"
  );

  $("authMessage").textContent = "";
}

$("joinButton").onclick = function () {
  setAuthMode("signup");
  showModal(authModal);
};

$("authButton").onclick = async function () {
  const result = await supabase.auth.getSession();

  if (result.data.session) {
    await openDashboard();
  } else {
    setAuthMode("login");
    showModal(authModal);
  }
};

$("toggleAuthMode").onclick = function () {
  setAuthMode(authMode === "login" ? "signup" : "login");
};

$("forgotPassword").onclick = async function () {
  const email = $("email").value.trim();

  if (!email) {
    $("authMessage").textContent =
      "Enter your email address first.";
    return;
  }

  $("authMessage").textContent = "Sending recovery email...";

  const result = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo: siteUrl()
    }
  );

  if (result.error) {
    $("authMessage").textContent = result.error.message;
    return;
  }

  $("authMessage").textContent =
    "Recovery email sent. Check your inbox.";
};

$("authForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;

  $("authMessage").textContent = "Working...";

  if (authMode === "login") {
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) {
      $("authMessage").textContent = result.error.message;
      return;
    }

    hideModal(authModal);
    await refreshAuthButton();
    await openDashboard();
    return;
  }

  const displayName =
    $("displayName").value.trim() || "Jbad Editor";

  const speciality =
    $("speciality").value.trim() || "Video & Photo Editor";

  const contactEmail =
    $("contactEmail").value.trim() || email;

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        speciality: speciality,
        contact_email: contactEmail
      }
    }
  });

  if (result.error) {
    $("authMessage").textContent = result.error.message;
    return;
  }

  if (result.data.session) {
    hideModal(authModal);
    await refreshAuthButton();
    await openDashboard();
  } else {
    $("authMessage").textContent =
      "Account created. Check your email to confirm your account.";
  }
});

/* PASSWORD RESET */

$("resetPasswordForm").addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const password = $("newPassword").value;
    const confirm = $("confirmPassword").value;

    if (password !== confirm) {
      $("resetPasswordMessage").textContent =
        "The passwords do not match.";
      return;
    }

    $("resetPasswordMessage").textContent =
      "Updating password...";

    const result = await supabase.auth.updateUser({
      password: password
    });

    if (result.error) {
      $("resetPasswordMessage").textContent =
        result.error.message;
      return;
    }

    $("resetPasswordMessage").textContent =
      "Password updated successfully.";

    setTimeout(function () {
      hideModal(resetPasswordModal);
      setAuthMode("login");
      showModal(authModal);
    }, 1000);
  }
);

/* AUTH STATE */

supabase.auth.onAuthStateChange(function (event) {
  refreshAuthButton();

  if (event === "PASSWORD_RECOVERY") {
    showModal(resetPasswordModal);
  }
});

async function refreshAuthButton() {
  const result = await supabase.auth.getSession();

  $("authButton").textContent = result.data.session
    ? "Editor dashboard"
    : "Editor login";
}

/* PUBLIC CONTENT */

async function loadPublicContent() {
  const profilesResult = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (profilesResult.error) {
    $("editorsGrid").innerHTML =
      '<div class="empty-state">' +
      escapeHtml(profilesResult.error.message) +
      "</div>";
  } else {
    const profiles = profilesResult.data || [];

    $("editorsGrid").innerHTML = profiles.length
      ? profiles.map(editorCard).join("")
      : '<div class="empty-state">No editors yet.</div>';
  }

  const postsResult = await supabase
    .from("editor_posts")
    .select("*, profiles(display_name, speciality)")
    .order("created_at", {
      ascending: false
    });

  if (postsResult.error) {
    $("featuredGrid").innerHTML =
      '<div class="empty-state">' +
      escapeHtml(postsResult.error.message) +
      "</div>";
  } else {
    const posts = postsResult.data || [];

    $("featuredGrid").innerHTML = posts.length
      ? posts.map(workCard).join("")
      : '<div class="empty-state">No showcase posts yet.</div>';
  }
}

function editorCard(profile) {
  const name = profile.display_name || "Jbad Editor";
  const speciality = profile.speciality || "Editor";

  return (
    '<article class="editor-card">' +
      '<div class="editor-avatar">' +
        (
          profile.avatar_url
            ? '<img src="' +
              safeUrl(profile.avatar_url) +
              '" alt="" style="width:100%;height:100%;object-fit:cover">'
            : escapeHtml(name.charAt(0).toUpperCase())
        ) +
      "</div>" +
      '<div class="editor-info">' +
        "<h3>" +
        escapeHtml(name) +
        "</h3>" +
        "<p>" +
        escapeHtml(speciality) +
        "</p>" +
        (
          profile.bio
            ? "<p class=\"small\">" +
              escapeHtml(profile.bio) +
              "</p>"
            : ""
        ) +
      "</div>" +
    "</article>"
  );
}

function workCard(post) {
  const editor =
    post.profiles &&
    post.profiles.display_name
      ? post.profiles.display_name
      : "Jbad Editor";

  let media;

  if (post.media_type === "video") {
    media =
      '<video src="' +
      safeUrl(post.media_url) +
      '" controls preload="metadata"></video>';
  } else {
    media =
      '<img src="' +
      safeUrl(post.media_url) +
      '" alt="' +
      escapeAttr(post.title) +
      '" loading="lazy">';
  }

  return (
    '<article class="work-card">' +
      '<div class="work-media">' +
        media +
      "</div>" +
      '<div class="work-info">' +
        "<h3>" +
        escapeHtml(post.title) +
        "</h3>" +
        "<p>" +
        escapeHtml(editor) +
        "</p>" +
        (
          post.description
            ? "<p class=\"small\">" +
              escapeHtml(post.description) +
              "</p>"
            : ""
        ) +
      "</div>" +
    "</article>"
  );
}

/* DASHBOARD */

async function openDashboard() {
  const sessionResult =
    await supabase.auth.getSession();

  const session = sessionResult.data.session;

  if (!session) {
    setAuthMode("login");
    showModal(authModal);
    return;
  }

  const profileResult = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const profile = profileResult.data;

  const postsResult = await supabase
    .from("editor_posts")
    .select("*")
    .eq("editor_id", session.user.id)
    .order("created_at", {
      ascending: false
    });

  const posts = postsResult.data || [];

  $("dashboardContent").innerHTML =
    '<form id="profileForm" class="dashboard-grid">' +

      "<label>" +
        "Display name" +
        '<input id="dName" maxlength="80" required value="' +
        escapeAttr(profile?.display_name || "") +
        '">' +
      "</label>" +

      "<label>" +
        "Speciality" +
        '<input id="dSpeciality" maxlength="120" value="' +
        escapeAttr(profile?.speciality || "") +
        '">' +
      "</label>" +

      '<label class="full-row">' +
        "Bio" +
        '<textarea id="dBio" maxlength="500">' +
        escapeHtml(profile?.bio || "") +
        "</textarea>" +
      "</label>" +

      "<label>" +
        "Website / portfolio URL" +
        '<input id="dWebsite" type="url" value="' +
        escapeAttr(profile?.website_url || "") +
        '">' +
      "</label>" +

      "<label>" +
        "Avatar URL" +
        '<input id="dAvatar" type="url" value="' +
        escapeAttr(profile?.avatar_url || "") +
        '">' +
      "</label>" +

      '<button class="button primary" type="submit">' +
        "Save profile" +
      "</button>" +

      '<button class="button danger" type="button" id="logoutButton">' +
        "Log out" +
      "</button>" +

    "</form>" +

    '<div id="stripePanel" style="margin-top:30px;padding:25px;border:1px solid #ddd;background:#fff">' +
      '<p class="eyebrow">PAYMENTS</p>' +
      "<h3>Stripe payments</h3>" +
      '<p id="stripeStatus" class="muted">Checking Stripe connection...</p>' +
      '<button class="button primary" type="button" id="stripeButton">' +
        "Check Stripe" +
      "</button>" +
      '<p id="stripeMessage" class="form-message"></p>' +
    "</div>" +

    "<hr style=\"border:0;border-top:1px solid #ddd;margin:35px 0\">" +

    "<h3>Publish showcase work</h3>" +

    '<form id="postForm" class="dashboard-grid">' +

      "<label>" +
        "Title" +
        '<input id="postTitle" maxlength="100" required>' +
      "</label>" +

      "<label>" +
        "Type" +
        '<select id="postType">' +
          '<option value="image">Image</option>' +
          '<option value="video">Video</option>' +
        "</select>" +
      "</label>" +

      '<label class="full-row">' +
        "Description" +
        '<textarea id="postDescription" maxlength="500"></textarea>' +
      "</label>" +

      '<label class="full-row">' +
        "Media file" +
        '<input id="postFile" type="file" required accept="image/*,video/*">' +
      "</label>" +

      '<button class="button primary" type="submit">' +
        "Publish work" +
      "</button>" +

    "</form>" +

    '<p id="postMessage" class="form-message"></p>' +

    "<h3>Your posts</h3>" +

    '<div class="post-list">' +
      (
        posts.length
          ? posts.map(function (post) {
              return (
                '<div class="post-row">' +
                  "<div>" +
                    "<b>" +
                    escapeHtml(post.title) +
                    "</b>" +
                    '<div class="small">' +
                    escapeHtml(post.media_type) +
                    "</div>" +
                  "</div>" +
                  '<button class="button danger delete-post" data-id="' +
                  escapeAttr(post.id) +
                  '" data-url="' +
                  escapeAttr(post.media_url) +
                  '">' +
                  "Delete" +
                  "</button>" +
                "</div>"
              );
            }).join("")
          : '<p class="muted">You have not published anything yet.</p>'
      ) +
    "</div>";

  showModal(dashboardModal);

  $("profileForm").onsubmit = async function (event) {
    event.preventDefault();

    const result = await supabase
      .from("profiles")
      .update({
        display_name: $("dName").value.trim(),
        speciality: $("dSpeciality").value.trim(),
        bio: $("dBio").value.trim(),
        website_url: $("dWebsite").value.trim() || null,
        avatar_url: $("dAvatar").value.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.user.id);

    alert(
      result.error
        ? result.error.message
        : "Profile saved."
    );

    if (!result.error) {
      await loadPublicContent();
    }
  };

  $("logoutButton").onclick = async function () {
    await supabase.auth.signOut();
    hideModal(dashboardModal);
    await refreshAuthButton();
  };

  $("stripeButton").onclick =
    checkStripeConnection;

  await checkStripeConnection();

  $("postForm").onsubmit = async function (event) {
    event.preventDefault();

    const file = $("postFile").files[0];
    const message = $("postMessage");

    if (!file) {
      message.textContent = "Choose a file.";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      message.textContent =
        "That file is over the 50 MB limit.";
      return;
    }

    message.textContent = "Uploading...";

    const fileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-");

    const path =
      session.user.id +
      "/" +
      crypto.randomUUID() +
      "-" +
      fileName;

    const uploadResult =
      await supabase.storage
        .from("portfolio")
        .upload(path, file, {
          upsert: false,
          contentType: file.type
        });

    if (uploadResult.error) {
      message.textContent =
        uploadResult.error.message;
      return;
    }

    const publicUrlResult =
      supabase.storage
        .from("portfolio")
        .getPublicUrl(path);

    const insertResult =
      await supabase
        .from("editor_posts")
        .insert({
          editor_id: session.user.id,
          title: $("postTitle").value.trim(),
          description: $("postDescription").value.trim(),
          media_url: publicUrlResult.data.publicUrl,
          media_type: $("postType").value
        });

    if (insertResult.error) {
      await supabase.storage
        .from("portfolio")
        .remove([path]);

      message.textContent =
        insertResult.error.message;
      return;
    }

    message.textContent = "Published!";

    await openDashboard();
    await loadPublicContent();
  };

  document
    .querySelectorAll(".delete-post")
    .forEach(function (button) {
      button.onclick = async function () {
        if (!confirm("Delete this post?")) {
          return;
        }

        const url = button.dataset.url;

        const marker =
          "/storage/v1/object/public/portfolio/";

        if (url && url.includes(marker)) {
          const path =
            decodeURIComponent(
              url.split(marker)[1]
            );

          await supabase.storage
            .from("portfolio")
            .remove([path]);
        }

        await supabase
          .from("editor_posts")
          .delete()
          .eq("id", button.dataset.id);

        await openDashboard();
        await loadPublicContent();
      };
    });
}

/* STRIPE */

async function checkStripeConnection() {
  const status = $("stripeStatus");
  const button = $("stripeButton");
  const message = $("stripeMessage");

  if (!status || !button) {
    return;
  }

  status.textContent =
    "Checking Stripe connection...";

  message.textContent = "";

  button.disabled = true;
  button.textContent = "Checking Stripe...";

  const result =
    await supabase.functions.invoke(
      "stripe-connect",
      {
        body: {}
      }
    );

  if (result.error) {
    status.textContent =
      "Unable to connect to Stripe.";

    message.textContent =
      result.error.message;

    button.disabled = false;
    button.textContent = "Try again";
    return;
  }

  const data = result.data || {};

  if (
    data.connected === true ||
    (
      data.chargesEnabled === true &&
      data.payoutsEnabled === true
    )
  ) {
    status.textContent =
      "Stripe is connected and ready.";

    button.textContent =
      "Stripe connected";

    button.disabled = true;
    return;
  }

  if (data.url) {
    status.textContent =
      "Your Stripe account needs setup.";

    button.textContent =
      "Finish Stripe setup";

    button.disabled = false;

    button.onclick = function () {
      window.location.href = data.url;
    };

    return;
  }

  status.textContent =
    data.message ||
    "Stripe setup is still being processed.";

  button.disabled = false;
  button.textContent = "Check Stripe again";

  button.onclick =
    checkStripeConnection;
}

/* MOBILE MENU */

$("menuButton").onclick = function () {
  const nav = document.querySelector("nav");

  if (nav.style.display === "flex") {
    nav.style.display = "";
    return;
  }

  nav.style.display = "flex";
  nav.style.position = "absolute";
  nav.style.top = "76px";
  nav.style.left = "0";
  nav.style.right = "0";
  nav.style.padding = "20px";
  nav.style.flexDirection = "column";
};

/* START */

loadPublicContent();
refreshAuthButton();
