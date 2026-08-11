import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./supabase-config.js";

const configured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_")
);

const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);
const authModal = $("authModal");
const dashboardModal = $("dashboardModal");
const resetPasswordModal = $("resetPasswordModal");

let authMode = "signup";

/* =========================================================
   ERROR HANDLING
   ========================================================= */

window.addEventListener("error", (event) => {
  console.error(
    "Jbad Editing error:",
    event.error || event.message
  );
});

window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      "Jbad Editing promise error:",
      event.reason
    );
  }
);

/* =========================================================
   HELPERS
   ========================================================= */

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
  return (
    window.location.origin +
    window.location.pathname
  );
}

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
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    }
  );
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

/* =========================================================
   AUTH MODAL
   ========================================================= */

if ($("closeAuth")) {
  $("closeAuth").onclick = () => {
    hideModal(authModal);
  };
}

if ($("closeDashboard")) {
  $("closeDashboard").onclick = () => {
    hideModal(dashboardModal);
  };
}

if ($("closeResetPassword")) {
  $("closeResetPassword").onclick = () => {
    hideModal(resetPasswordModal);
  };
}

if ($("joinButton")) {
  $("joinButton").onclick = () => {
    if (!configured) {
      alert(
        "Jbad Editing is not connected to Supabase yet. Check supabase-config.js."
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
        "Jbad Editing is not connected to Supabase yet. Check supabase-config.js."
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

function setAuthMode(mode) {
  authMode = mode;

  if ($("profileFields")) {
    $("profileFields").classList.toggle(
      "hidden",
      mode === "login"
    );
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      mode === "login"
        ? "Log in"
        : "Create account";
  }

  if ($("authTitle")) {
    $("authTitle").textContent =
      mode === "login"
        ? "Editor login"
        : "Join Jbad Editing";
  }

  if ($("authHint")) {
    $("authHint").textContent =
      mode === "login"
        ? "Log in to manage your editor profile and showcase."
        : "Create an editor account to publish your profile and showcase your work.";
  }

  if ($("toggleAuthMode")) {
    $("toggleAuthMode").textContent =
      mode === "login"
        ? "Need an account? Sign up"
        : "Already have an account? Log in";
  }

  if ($("forgotPassword")) {
    $("forgotPassword").classList.toggle(
      "hidden",
      mode !== "login"
    );
  }

  if ($("authMessage")) {
    $("authMessage").textContent = "";
  }
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

/* =========================================================
   PASSWORD RESET
   ========================================================= */

if ($("forgotPassword")) {
  $("forgotPassword").onclick = async () => {
    if (!supabase) {
      return;
    }

    const email =
      $("email").value.trim();

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

      if (!supabase) {
        return;
      }

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

/* =========================================================
   SIGN UP / LOGIN
   ========================================================= */

if ($("authForm")) {
  $("authForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!supabase) {
        $("authMessage").textContent =
          "Supabase is not configured.";
        return;
      }

      const email =
        $("email").value.trim();

      const password =
        $("password").value;

      $("authMessage").textContent =
        "Working...";

      if (authMode === "login") {
        const { error } =
          await supabase.auth.signInWithPassword(
            {
              email,
              password
            }
          );

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

      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name:
                displayName,
              speciality,
              contact_email:
                contactEmail
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

/* =========================================================
   AUTH BUTTON
   ========================================================= */

async function refreshAuthButton() {
  if (
    !supabase ||
    !$("authButton")
  ) {
    return;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  $("authButton").textContent =
    session
      ? "Editor dashboard"
      : "Editor login";
}

if (supabase) {
  supabase.auth.onAuthStateChange(
    (event) => {
      refreshAuthButton();

      if (
        event ===
        "PASSWORD_RECOVERY"
      ) {
        showModal(resetPasswordModal);

        if ($("resetPasswordMessage")) {
          $("resetPasswordMessage").textContent =
            "";
        }
      }
    }
  );
}

/* =========================================================
   PUBLIC CONTENT
   ========================================================= */

async function loadPublicContent() {
  if (!configured) {
    if ($("editorsGrid")) {
      $("editorsGrid").innerHTML = `
        <div class="empty-state">
          Supabase is not connected yet.
        </div>
      `;
    }

    if ($("featuredGrid")) {
      $("featuredGrid").innerHTML = `
        <div class="empty-state">
          Your live editor showcase will appear here once Supabase is connected.
        </div>
      `;
    }

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
      "Profile loading error:",
      profileError
    );

    if ($("editorsGrid")) {
      $("editorsGrid").innerHTML = `
        <div class="empty-state">
          ${escapeHtml(
            profileError.message
          )}
        </div>
      `;
    }
  } else if ($("editorsGrid")) {
    $("editorsGrid").innerHTML =
      profiles &&
      profiles.length
        ? profiles
            .map(editorCard)
            .join("")
        : `
          <div class="empty-state">
            No editors yet. Be the first to join.
          </div>
        `;
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
      "Post loading error:",
      postError
    );

    if ($("featuredGrid")) {
      $("featuredGrid").innerHTML = `
        <div class="empty-state">
          ${escapeHtml(
            postError.message
          )}
        </div>
      `;
    }
  } else if ($("featuredGrid")) {
    $("featuredGrid").innerHTML =
      posts &&
      posts.length
        ? posts
            .map(workCard)
            .join("")
        : `
          <div class="empty-state">
            No showcase posts yet.
          </div>
        `;
  }
}

function editorCard(profile) {
  const initials =
    escapeHtml(
      (
        profile.display_name ||
        "J"
      )
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
          ${escapeHtml(
            profile.display_name ||
              "Jbad Editor"
          )}
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

  const media =
    post.media_type === "video"
      ? `
        <video
          src="${safeUrl(
            post.media_url
          )}"
          controls
          preload="metadata"
        ></video>
      `
      : `
        <img
          src="${safeUrl(
            post.media_url
          )}"
          alt="${escapeHtml(
            post.title
          )}"
          loading="lazy"
        >
      `;

  return `
    <article class="work-card">

      <div class="work-media">
        ${media}
      </div>

      <div class="work-info">

        <h3>
          ${escapeHtml(
            post.title
          )}
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
  if (!supabase) {
    return;
  }

  const {
    data: { session }
  } =
    await supabase.auth.getSession();

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
    .single();

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
    .eq(
      "editor_id",
      session.user.id
    )
    .order("created_at", {
      ascending: false
    });

  if (postsError) {
    console.error(
      "Posts error:",
      postsError
    );
  }

  const balance =
    Number(
      profile?.balance ??
      profile?.account_balance ??
      0
    );

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
      id="balancePanel"
      style="
        margin-top:30px;
        padding:25px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:12px;
      "
    >

      <p class="eyebrow">
        ACCOUNT BALANCE
      </p>

      <h3
        style="
          font-size:32px;
          margin:0 0 8px;
        "
      >
        £${balance.toFixed(2)}
      </h3>

      <p class="muted">
        Available Jbad Editing account funds.
      </p>

    </div>

    <div
      id="paymentPanel"
      style="
        margin-top:20px;
        padding:25px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:12px;
      "
    >

      <p class="eyebrow">
        ACCOUNT FUNDS
      </p>

      <h3>
        Add funds
      </h3>

      <p class="muted">
        Add money securely to your Jbad Editing account.
      </p>

      <label>
        Amount

        <input
          id="fundAmount"
          type="number"
          min="1"
          step="0.01"
          placeholder="50.00"
        >
      </label>

      <p
        class="small"
        style="margin-top:10px;"
      >
        A 3.5% Jbad Editing service fee will be added before you pay.
      </p>

      <button
        id="securePaymentButton"
        class="button primary"
        type="button"
      >
        Secure Payment
      </button>

      <div
        style="
          margin-top:15px;
          padding:14px 16px;
          border:1px solid #ddd;
          border-radius:8px;
          background:#f7f7f5;
          font-size:13px;
          line-height:1.5;
        "
      >

        <strong
          style="
            display:block;
            margin-bottom:5px;
            font-size:14px;
          "
        >
          Important: Account Funds
        </strong>

        <p style="margin:0;">
          By adding funds to your Jbad Editing account, you acknowledge
          that funds added to your account balance are non-refundable
          and non-withdrawable. Account funds may only be used for
          eligible Jbad Editing services and cannot be transferred to
          a bank account or withdrawn as cash.
        </p>

      </div>

      <p
        id="paymentMessage"
        class="form-message"
      ></p>

    </div>

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

      <h3
        style="margin:0 0 8px;"
      >
        Stripe payments
      </h3>

      <p
        id="stripeStatus"
        class="muted"
      >
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

  /* =======================================================
     SAVE PROFILE
     ======================================================= */

  $("profileForm").onsubmit =
    async (event) => {
      event.preventDefault();

      const { error } =
        await supabase
          .from("profiles")
          .update({
            display_name:
              $("dName").value.trim(),

            speciality:
              $("dSpeciality")
                .value.trim(),

            bio:
              $("dBio").value.trim(),

            website_url:
              $("dWebsite")
                .value.trim() ||
              null,

            avatar_url:
              $("dAvatar")
                .value.trim() ||
              null,

            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            session.user.id
          );

      if (error) {
        alert(error.message);
        return;
      }

      alert(
        "Profile saved."
      );

      await loadPublicContent();
    };

  /* =======================================================
     LOG OUT
     ======================================================= */

  $("logoutButton").onclick =
    async () => {
      await supabase.auth.signOut();

      hideModal(
        dashboardModal
      );

      await refreshAuthButton();
    };

  /* =======================================================
     STRIPE CONNECT
     ======================================================= */

  const stripeStatus =
    $("stripeStatus");

  const stripeButton =
    $("stripeButton");

  const stripeMessage =
    $("stripeMessage");

  async function checkStripeConnection() {
    stripeStatus.textContent =
      "Checking Stripe connection...";

    stripeMessage.textContent =
      "";

    stripeButton.disabled =
      true;

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

      if (
        data.connected === true ||
        (
          data.chargesEnabled ===
            true &&
          data.payoutsEnabled ===
            true
        )
      ) {
        stripeStatus.textContent =
          "Stripe is connected and ready.";

        stripeButton.textContent =
          "Stripe connected";

        stripeButton.disabled =
          true;

        return;
      }

      if (
        typeof data.url ===
          "string" &&
        data.url.length > 0
      ) {
        stripeStatus.textContent =
          "Your Stripe account needs additional setup.";

        stripeButton.textContent =
          "Finish Stripe setup";

        stripeButton.disabled =
          false;

        stripeButton.onclick =
          () => {
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

      stripeButton.disabled =
        false;

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

      stripeButton.disabled =
        false;

      stripeButton.onclick =
        checkStripeConnection;
    }
  }

  stripeButton.onclick =
    checkStripeConnection;

  checkStripeConnection();

  /* =======================================================
     PUBLISH SHOWCASE WORK
     ======================================================= */

  $("postForm").onsubmit =
    async (event) => {
      event.preventDefault();

      const file =
        $("postFile").files[0];

      const message =
        $("postMessage");

      if (!file) {
        message.textContent =
          "Choose a file first.";

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

      message.textContent =
        "Uploading...";

      const type =
        $("postType").value;

      if (
        type === "image" &&
        !file.type.startsWith(
          "image/"
        )
      ) {
        message.textContent =
          "Choose an image file.";

        return;
      }

      if (
        type === "video" &&
        !file.type.startsWith(
          "video/"
        )
      ) {
        message.textContent =
          "Choose a video file.";

        return;
      }

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
                .value.trim(),

            description:
              $("postDescription")
                .value.trim(),

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

      await openDashboard();
      await loadPublicContent();
    };

  /* =======================================================
     DELETE POSTS
     ======================================================= */

  document
    .querySelectorAll(
      ".delete-post"
    )
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
                  url.split(
                    marker
                  )[1]
                )
              : null;

          if (path) {
            await supabase.storage
              .from("portfolio")
              .remove([path]);
          }

          const {
            error
          } =
            await supabase
              .from("editor_posts")
              .delete()
              .eq(
                "id",
                button.dataset.id
              );

          if (error) {
            alert(
              error.message
            );

            return;
          }

          await openDashboard();
          await loadPublicContent();
        };
    });
}

/* =========================================================
   SECURE PAYMENT
   ========================================================= */

async function startSecurePayment() {
  console.log(
    "Secure Payment button clicked"
  );

  if (!supabase) {
    alert(
      "Supabase is not connected."
    );

    console.error(
      "Supabase client is not configured."
    );

    return;
  }

  const amountInput =
    document.getElementById(
      "fundAmount"
    );

  const message =
    document.getElementById(
      "paymentMessage"
    );

  const button =
    document.getElementById(
      "securePaymentButton"
    );

  if (!amountInput) {
    console.error(
      "Could not find #fundAmount"
    );

    alert(
      "The payment form could not be found."
    );

    return;
  }

  const pounds =
    Number(
      amountInput.value
    );

  console.log(
    "Payment amount entered:",
    pounds
  );

  if (
    !Number.isFinite(
      pounds
    ) ||
    pounds <= 0
  ) {
    if (message) {
      message.textContent =
        "Enter a valid amount.";
    }

    return;
  }

  if (pounds < 1) {
    if (message) {
      message.textContent =
        "Minimum payment is £1.00.";
    }

    return;
  }

  const amount =
    Math.round(
      pounds * 100
    );

  const jbadFee =
    Math.round(
      amount * 0.035
    );

  const total =
    amount + jbadFee;

  console.log(
    "Base amount:",
    amount
  );

  console.log(
    "Jbad fee:",
    jbadFee
  );

  console.log(
    "Total:",
    total
  );

  if (message) {
    message.textContent =
      `Account funds: £${(
        amount / 100
      ).toFixed(
        2
      )} + 3.5% fee (£${(
        jbadFee / 100
      ).toFixed(
        2
      )}) = £${(
        total / 100
      ).toFixed(
        2
      )}. Opening Stripe...`;
  }

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "Opening Stripe...";
  }

  console.log(
    "Calling stripe-payment Edge Function..."
  );

  try {
    const response =
      await supabase.functions.invoke(
        "stripe-payment",
        {
          body: {
            amount
          }
        }
      );

    console.log(
      "stripe-payment response:",
      response
    );

    const data =
      response.data;

    const error =
      response.error;

    if (error) {
      console.error(
        "stripe-payment error:",
        error
      );

      throw new Error(
        error.message ||
        "The stripe-payment function returned an error."
      );
    }

    if (!data) {
      throw new Error(
        "The stripe-payment function returned no data."
      );
    }

    console.log(
      "stripe-payment data:",
      data
    );

    if (data.error) {
      throw new Error(
        data.error
      );
    }

    if (
      typeof data.url !==
        "string" ||
      data.url.length ===
        0
    ) {
      throw new Error(
        "Stripe did not return a checkout URL."
      );
    }

    console.log(
      "Stripe checkout URL received."
    );

    if (message) {
      message.textContent =
        "Stripe checkout ready. Redirecting...";
    }

    window.location.assign(
      data.url
    );

  } catch (error) {
    console.error(
      "SECURE PAYMENT FAILED:",
      error
    );

    if (message) {
      message.textContent =
        error.message ||
        "Unable to start Stripe payment.";
    }

    if (button) {
      button.disabled =
        false;

      button.textContent =
        "Secure Payment";
    }

    alert(
      "Payment could not be started.\n\n" +
      (
        error.message ||
        "Unknown error"
      )
    );
  }
}

/* =========================================================
   GLOBAL PAYMENT BUTTON
   ========================================================= */

document.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        "#securePaymentButton"
      );

    if (!button) {
      return;
    }

    event.preventDefault();

    console.log(
      "GLOBAL SECURE PAYMENT CLICK DETECTED"
    );

    startSecurePayment();
  }
);

/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadPublicContent();
refreshAuthButton();

/* =========================================================
   MOBILE MENU
   ========================================================= */

if ($("menuButton")) {
  $("menuButton").onclick =
    () => {
      const nav =
        document.querySelector(
          "nav"
        );

      if (!nav) {
        return;
      }

      nav.style.display =
        nav.style.display ===
        "flex"
          ? ""
          : "flex";

      nav.style.position =
        "absolute";

      nav.style.top =
        "76px";

      nav.style.left =
        "0";

      nav.style.right =
        "0";

      nav.style.padding =
        "20px";

      nav.style.background =
        "#f5f5f2";

      nav.style.flexDirection =
        "column";
    };
}

/* =========================================================
   PASSWORD RECOVERY SESSION
   ========================================================= */

if (
  configured &&
  supabase
) {
  supabase.auth
    .getSession()
    .catch(
      (error) => {
        console.error(
          "Jbad auth session error:",
          error
        );
      }
    );
}
