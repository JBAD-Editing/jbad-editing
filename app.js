import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./supabase-config.js";

const configured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_");

const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);

const authModal = $("authModal");
const dashboardModal = $("dashboardModal");
const resetPasswordModal = $("resetPasswordModal");

let authMode = "signup";

function showModal(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

function hideModal(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

function siteUrl() {
  return window.location.origin + window.location.pathname;
}

/* =========================================================
   ERROR HANDLING
   ========================================================= */

window.addEventListener("error", (event) => {
  console.error(
    "Jbad Editing error:",
    event.error || event.message
  );
});

window.addEventListener("unhandledrejection", (event) => {
  console.error(
    "Jbad Editing promise error:",
    event.reason
  );
});

/* =========================================================
   AUTH
   ========================================================= */

if ($("closeAuth")) {
  $("closeAuth").onclick = () => hideModal(authModal);
}

if ($("closeDashboard")) {
  $("closeDashboard").onclick = () =>
    hideModal(dashboardModal);
}

if ($("closeResetPassword")) {
  $("closeResetPassword").onclick = () =>
    hideModal(resetPasswordModal);
}

function setAuthMode(mode) {
  authMode = mode;

  $("profileFields").classList.toggle(
    "hidden",
    mode === "login"
  );

  $("authSubmit").textContent =
    mode === "login"
      ? "Log in"
      : "Create account";

  $("authTitle").textContent =
    mode === "login"
      ? "Editor login"
      : "Join Jbad Editing";

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

if ($("joinButton")) {
  $("joinButton").onclick = () => {
    if (!configured) {
      alert(
        "Supabase is not configured. Check supabase-config.js."
      );
      return;
    }

    setAuthMode("signup");
    showModal(authModal);
  };
}

if ($("authButton")) {
  $("authButton").onclick = async () => {
    if (!configured) {
      alert(
        "Supabase is not configured. Check supabase-config.js."
      );
      return;
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      openDashboard();
    } else {
      setAuthMode("login");
      showModal(authModal);
    }
  };
}

if ($("toggleAuthMode")) {
  $("toggleAuthMode").onclick = () => {
    setAuthMode(
      authMode === "login"
        ? "signup"
        : "login"
    );
  };
}

if ($("forgotPassword")) {
  $("forgotPassword").onclick = async () => {
    if (!supabase) return;

    const email = $("email").value.trim();

    if (!email) {
      $("authMessage").textContent =
        "Enter your email address first.";
      $("email").focus();
      return;
    }

    $("authMessage").textContent =
      "Sending recovery email...";

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: siteUrl()
        }
      );

    if (error) {
      $("authMessage").textContent =
        error.message;
      return;
    }

    $("authMessage").textContent =
      "Recovery email sent. Check your inbox and spam folder.";
  };
}

if ($("resetPasswordForm")) {
  $("resetPasswordForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!supabase) return;

      const password =
        $("newPassword").value;

      const confirmPassword =
        $("confirmPassword").value;

      if (password !== confirmPassword) {
        $("resetPasswordMessage").textContent =
          "The passwords do not match.";
        return;
      }

      $("resetPasswordMessage").textContent =
        "Updating password...";

      const { error } =
        await supabase.auth.updateUser({
          password
        });

      if (error) {
        $("resetPasswordMessage").textContent =
          error.message;
        return;
      }

      $("resetPasswordMessage").textContent =
        "Password updated successfully.";

      setTimeout(() => {
        hideModal(resetPasswordModal);
        setAuthMode("login");
        showModal(authModal);
      }, 900);
    }
  );
}

if ($("authForm")) {
  $("authForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!supabase) return;

      const email =
        $("email").value.trim();

      const password =
        $("password").value;

      $("authMessage").textContent =
        "Working...";

      if (authMode === "login") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          $("authMessage").textContent =
            error.message;
          return;
        }

        hideModal(authModal);

        await refreshAuthButton();
        await openDashboard();

        return;
      }

      const displayName =
        $("displayName").value.trim() ||
        "Jbad Editor";

      const speciality =
        $("speciality").value.trim() ||
        "Video & Photo Editor";

      const contactEmail =
        $("contactEmail")?.value.trim() ||
        email;

      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            speciality,
            contact_email: contactEmail
          }
        }
      });

      if (error) {
        $("authMessage").textContent =
          error.message;
        return;
      }

      if (data.session) {
        hideModal(authModal);

        await refreshAuthButton();
        await openDashboard();
      } else {
        $("authMessage").textContent =
          "Account created. Check your email to confirm your account, then log in.";
      }
    }
  );
}

async function refreshAuthButton() {
  if (!supabase) return;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if ($("authButton")) {
    $("authButton").textContent =
      session
        ? "Editor dashboard"
        : "Editor login";
  }
}

if (supabase) {
  supabase.auth.onAuthStateChange(
    (event) => {
      refreshAuthButton();

      if (event === "PASSWORD_RECOVERY") {
        showModal(resetPasswordModal);

        $("resetPasswordMessage").textContent =
          "";
      }
    }
  );
}

/* =========================================================
   PUBLIC CONTENT
   ========================================================= */

async function loadPublicContent() {
  if (!configured) {
    $("editorsGrid").innerHTML =
      '<div class="empty-state">Supabase is not connected yet. Check supabase-config.js.</div>';

    $("featuredGrid").innerHTML =
      '<div class="empty-state">Your live editor showcase will appear here once Supabase is connected.</div>';

    return;
  }

  const {
    data: profiles,
    error: profileError
  } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (profileError) {
    console.error(
      "Profiles error:",
      profileError
    );

    $("editorsGrid").innerHTML =
      `<div class="empty-state">${escapeHtml(
        profileError.message
      )}</div>`;
  } else {
    $("editorsGrid").innerHTML =
      profiles && profiles.length
        ? profiles
            .map(editorCard)
            .join("")
        : '<div class="empty-state">No editors yet. Be the first to join.</div>';
  }

  const {
    data: posts,
    error: postError
  } = await supabase
    .from("editor_posts")
    .select(
      "*, profiles(display_name, speciality)"
    )
    .order("created_at", {
      ascending: false
    });

  if (postError) {
    console.error(
      "Posts error:",
      postError
    );

    $("featuredGrid").innerHTML =
      `<div class="empty-state">${escapeHtml(
        postError.message
      )}</div>`;
  } else {
    $("featuredGrid").innerHTML =
      posts && posts.length
        ? posts
            .map(workCard)
            .join("")
        : '<div class="empty-state">No showcase posts yet.</div>';
  }
}

function editorCard(profile) {
  const name =
    profile.display_name ||
    "Jbad Editor";

  const initials =
    escapeHtml(
      name
        .slice(0, 1)
        .toUpperCase()
    );

  return `
    <article class="editor-card">

      <div class="editor-avatar">
        ${
          profile.avatar_url
            ? `
              <img
                src="${safeUrl(
                  profile.avatar_url
                )}"
                alt=""
                style="width:100%;height:100%;object-fit:cover"
              >
            `
            : initials
        }
      </div>

      <div class="editor-info">

        <h3>
          ${escapeHtml(name)}
        </h3>

        <p>
          ${escapeHtml(
            profile.speciality ||
              "Editor"
          )}
        </p>

        ${
          profile.bio
            ? `
              <p class="small">
                ${escapeHtml(
                  profile.bio
                )}
              </p>
            `
            : ""
        }

        ${
          profile.website_url
            ? `
              <a
                class="small"
                target="_blank"
                rel="noopener"
                href="${safeUrl(
                  profile.website_url
                )}"
              >
                Portfolio ↗
              </a>
            `
            : ""
        }

      </div>

    </article>
  `;
}

function workCard(post) {
  const editor =
    post.profiles?.display_name ||
    "Jbad Editor";

  let media = "";

  if (post.media_type === "video") {
    media = `
      <video
        src="${safeUrl(post.media_url)}"
        controls
        preload="metadata"
      ></video>
    `;
  } else {
    media = `
      <img
        src="${safeUrl(post.media_url)}"
        alt="${escapeHtml(
          post.title
        )}"
        loading="lazy"
      >
    `;
  }

  return `
    <article class="work-card">

      <div class="work-media">
        ${media}
      </div>

      <div class="work-info">

        <h3>
          ${escapeHtml(post.title)}
        </h3>

        <p>
          ${escapeHtml(editor)}
        </p>

        ${
          post.description
            ? `
              <p class="small">
                ${escapeHtml(
                  post.description
                )}
              </p>
            `
            : ""
        }

      </div>

    </article>
  `;
}

/* =========================================================
   EDITOR DASHBOARD
   ========================================================= */

async function openDashboard() {
  if (!supabase) return;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    setAuthMode("login");
    showModal(authModal);
    return;
  }

  const {
    data: profile,
    error: profileError
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Profile error:",
      profileError
    );
  }

  const {
    data: posts,
    error: postsError
  } = await supabase
    .from("editor_posts")
    .select("*")
    .eq("editor_id", session.user.id)
    .order("created_at", {
      ascending: false
    });

  if (postsError) {
    console.error(
      "Posts error:",
      postsError
    );
  }

  $("dashboardContent").innerHTML = `
    <form
      id="profileForm"
      class="dashboard-grid"
    >

      <label>
        Display name

        <input
          id="dName"
          value="${escapeAttr(
            profile?.display_name ||
              session.user.user_metadata
                ?.display_name ||
              ""
          )}"
          maxlength="80"
          required
        >
      </label>

      <label>
        Speciality

        <input
          id="dSpeciality"
          value="${escapeAttr(
            profile?.speciality ||
              session.user.user_metadata
                ?.speciality ||
              ""
          )}"
          maxlength="120"
        >
      </label>

      <label class="full-row">
        Bio

        <textarea
          id="dBio"
          maxlength="500"
        >${escapeHtml(
          profile?.bio || ""
        )}</textarea>
      </label>

      <label>
        Website / portfolio URL

        <input
          id="dWebsite"
          type="url"
          value="${escapeAttr(
            profile?.website_url ||
              ""
          )}"
          placeholder="https://..."
        >
      </label>

      <label>
        Avatar URL

        <input
          id="dAvatar"
          type="url"
          value="${escapeAttr(
            profile?.avatar_url ||
              ""
          )}"
          placeholder="https://..."
        >
      </label>

      <button
        class="button primary"
        type="submit"
      >
        Save profile
      </button>

      <button
        class="button danger"
        type="button"
        id="logoutButton"
      >
        Log out
      </button>

    </form>

    <div
      id="stripePanel"
      style="
        margin-top:30px;
        padding:25px;
        border:1px solid #ddd;
        background:#fff;
      "
    >

      <p class="eyebrow">
        PAYMENTS
      </p>

      <h3 style="margin:0 0 8px;">
        Stripe payments
      </h3>

      <p id="stripeStatus" class="muted">
        Checking Stripe connection...
      </p>

      <button
        class="button primary"
        type="button"
        id="stripeButton"
      >
        Checking Stripe...
      </button>

      <p
        id="stripeMessage"
        class="form-message"
      ></p>

    </div>

    <hr
      style="
        border:0;
        border-top:1px solid #ddd;
        margin:35px 0;
      "
    >

    <h3>
      Publish showcase work
    </h3>

    <form
      id="postForm"
      class="dashboard-grid"
    >

      <label>
        Title

        <input
          id="postTitle"
          maxlength="100"
          required
          placeholder="e.g. Football montage"
        >
      </label>

      <label>
        Type

        <select
          id="postType"
          style="
            padding:12px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >
          <option value="image">
            Image
          </option>

          <option value="video">
            Video
          </option>
        </select>
      </label>

      <label class="full-row">
        Description

        <textarea
          id="postDescription"
          maxlength="500"
          placeholder="Tell people about the edit"
        ></textarea>
      </label>

      <label class="full-row">
        Media file

        <input
          id="postFile"
          type="file"
          accept="
            image/jpeg,
            image/png,
            image/webp,
            image/gif,
            video/mp4,
            video/webm,
            video/quicktime
          "
          required
        >
      </label>

      <button
        class="button primary"
        type="submit"
      >
        Publish work
      </button>

    </form>

    <p
      id="postMessage"
      class="form-message"
    ></p>

    <h3>
      Your posts
    </h3>

    <div class="post-list">

      ${
        posts && posts.length
          ? posts
              .map(
                (post) => `
                  <div class="post-row">

                    <div>
                      <b>
                        ${escapeHtml(
                          post.title
                        )}
                      </b>

                      <div class="small">
                        ${escapeHtml(
                          post.media_type
                        )}
                      </div>
                    </div>

                    <button
                      class="button danger delete-post"
                      data-id="${escapeAttr(
                        post.id
                      )}"
                      data-url="${escapeAttr(
                        post.media_url
                      )}"
                    >
                      Delete
                    </button>

                  </div>
                `
              )
              .join("")
          : `
              <p class="muted">
                You haven't published anything yet.
              </p>
            `
      }

    </div>
  `;

  showModal(dashboardModal);

  /* =========================================================
     SAVE PROFILE
     ========================================================= */

  $("profileForm").onsubmit =
    async (event) => {
      event.preventDefault();

      const updates = {
        display_name:
          $("dName").value.trim(),

        speciality:
          $("dSpeciality").value.trim(),

        bio:
          $("dBio").value.trim(),

        website_url:
          $("dWebsite").value.trim() ||
          null,

        avatar_url:
          $("dAvatar").value.trim() ||
          null,

        updated_at:
          new Date().toISOString()
      };

      const { error } =
        await supabase
          .from("profiles")
          .update(updates)
          .eq(
            "id",
            session.user.id
          );

      if (error) {
        alert(error.message);
        return;
      }

      alert("Profile saved.");

      await loadPublicContent();
    };

  /* =========================================================
     LOG OUT
     ========================================================= */

  $("logoutButton").onclick =
    async () => {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        alert(error.message);
        return;
      }

      hideModal(dashboardModal);
      await refreshAuthButton();
    };

  /* =========================================================
     STRIPE CONNECT
     ========================================================= */

  const stripeStatus =
    $("stripeStatus");

  const stripeButton =
    $("stripeButton");

  const stripeMessage =
    $("stripeMessage");

  async function checkStripeConnection() {
    stripeStatus.textContent =
      "Checking Stripe connection...";

    stripeMessage.textContent = "";

    stripeButton.disabled = true;

    stripeButton.textContent =
      "Checking Stripe...";

    try {
      const {
        data,
        error
      } =
        await supabase.functions.invoke(
          "stripe-connect",
          {
            body: {}
          }
        );

      console.log(
        "Stripe Connect response:",
        data
      );

      if (error) {
        console.error(
          "Stripe Connect error:",
          error
        );

        throw new Error(
          error.message ||
            "Unable to contact Stripe."
        );
      }

      if (!data) {
        throw new Error(
          "Stripe returned an empty response."
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (
        data.connected === true ||
        (
          data.chargesEnabled === true &&
          data.payoutsEnabled === true
        )
      ) {
        stripeStatus.textContent =
          "Stripe is connected and ready.";

        stripeMessage.textContent = "";

        stripeButton.textContent =
          "Stripe connected";

        stripeButton.disabled = true;

        return;
      }

      if (
        typeof data.url === "string" &&
        data.url.length > 0
      ) {
        stripeStatus.textContent =
          data.message ||
          "Your Stripe account needs additional setup.";

        stripeButton.textContent =
          "Finish Stripe setup";

        stripeButton.disabled = false;

        stripeButton.onclick = () => {
          window.location.href =
            data.url;
        };

        return;
      }

      stripeStatus.textContent =
        data.message ||
        "Stripe setup is still being processed.";

      stripeButton.textContent =
        "Check Stripe again";

      stripeButton.disabled = false;

      stripeButton.onclick =
        checkStripeConnection;
    } catch (error) {
      console.error(
        "Stripe connection error:",
        error
      );

      stripeStatus.textContent =
        "Unable to confirm your Stripe connection.";

      stripeMessage.textContent =
        error.message ||
        "Something went wrong.";

      stripeButton.textContent =
        "Check Stripe again";

      stripeButton.disabled = false;

      stripeButton.onclick =
        checkStripeConnection;
    }
  }

  stripeButton.onclick =
    checkStripeConnection;

  checkStripeConnection();

  /* =========================================================
     PUBLISH SHOWCASE WORK
     ========================================================= */

  $("postForm").onsubmit =
    async (event) => {
      event.preventDefault();

      const file =
        $("postFile").files[0];

      const message =
        $("postMessage");

      if (!file) {
        message.textContent =
          "Please choose a file.";
        return;
      }

      if (
        file.size >
        50 * 1024 * 1024
      ) {
        message.textContent =
          "That file is over the 50 MB limit.";
        return;
      }

      const type =
        $("postType").value;

      if (
        type === "image" &&
        !file.type.startsWith("image/")
      ) {
        message.textContent =
          "Choose an image file.";
        return;
      }

      if (
        type === "video" &&
        !file.type.startsWith("video/")
      ) {
        message.textContent =
          "Choose a video file.";
        return;
      }

      message.textContent =
        "Uploading...";

      const safeName =
        file.name
          .toLowerCase()
          .replace(
            /[^a-z0-9._-]+/g,
            "-"
          );

      const path =
        `${session.user.id}/${crypto.randomUUID()}-${safeName}`;

      const {
        error: uploadError
      } =
        await supabase.storage
          .from("portfolio")
          .upload(
            path,
            file,
            {
              upsert: false,
              contentType:
                file.type
            }
          );

      if (uploadError) {
        message.textContent =
          uploadError.message;
        return;
      }

      const {
        data: publicData
      } =
        supabase.storage
          .from("portfolio")
          .getPublicUrl(path);

      const {
        error: insertError
      } =
        await supabase
          .from("editor_posts")
          .insert({
            editor_id:
              session.user.id,

            title:
              $("postTitle")
                .value
                .trim(),

            description:
              $("postDescription")
                .value
                .trim(),

            media_url:
              publicData.publicUrl,

            media_type:
              type
          });

      if (insertError) {
        await supabase.storage
          .from("portfolio")
          .remove([path]);

        message.textContent =
          insertError.message;

        return;
      }

      message.textContent =
        "Published!";

      await loadPublicContent();
      await openDashboard();
    };

  /* =========================================================
     DELETE POSTS
     ========================================================= */

  document
    .querySelectorAll(".delete-post")
    .forEach((button) => {
      button.onclick =
        async () => {
          if (
            !confirm(
              "Delete this post?"
            )
          ) {
            return;
          }

          const url =
            button.dataset.url;

          const marker =
            "/storage/v1/object/public/portfolio/";

          const path =
            url &&
            url.includes(marker)
              ? decodeURIComponent(
                  url.split(marker)[1]
                )
              : null;

          if (path) {
            await supabase.storage
              .from("portfolio")
              .remove([path]);
          }

          const { error } =
            await supabase
              .from("editor_posts")
              .delete()
              .eq(
                "id",
                button.dataset.id
              );

          if (error) {
            alert(error.message);
            return;
          }

          await loadPublicContent();
          await openDashboard();
        };
    });
}

/* =========================================================
   HELPERS
   ========================================================= */

function safeUrl(value) {
  try {
    const url = new URL(
      value,
      window.location.href
    );

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return url.href;
    }

    return "#";
  } catch {
    return "#";
  }
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return replacements[character];
    }
  );
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

/* =========================================================
   MOBILE MENU
   ========================================================= */

if ($("menuButton")) {
  $("menuButton").onclick = () => {
    const nav =
      document.querySelector("nav");

    if (!nav) return;

    const isOpen =
      nav.style.display === "flex";

    if (isOpen) {
      nav.style.display = "";
      return;
    }

    nav.style.display = "flex";
    nav.style.position = "absolute";
    nav.style.top = "76px";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.padding = "20px";
    nav.style.background = "#f5f5f2";
    nav.style.flexDirection = "column";
  };
}

/* =========================================================
   INITIAL LOAD
   ========================================================= */

async function initialize() {
  if (!configured) {
    console.error(
      "Supabase is not configured."
    );
  }

  await loadPublicContent();
  await refreshAuthButton();
}

initialize();
