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
  ? createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )
  : null;

const $ = (id) =>
  document.getElementById(id);

const authModal =
  $("authModal");

const dashboardModal =
  $("dashboardModal");

const resetPasswordModal =
  $("resetPasswordModal");

let authMode = "signup";

function siteUrl() {
  return (
    window.location.origin +
    window.location.pathname
  );
}

function showModal(element) {
  if (element) {
    element.classList.remove(
      "hidden"
    );
  }
}

function hideModal(element) {
  if (element) {
    element.classList.add(
      "hidden"
    );
  }
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}

function escapeAttr(value = "") {
  return escapeHtml(value);
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

/* AUTH */

$("closeAuth").onclick = () => {
  hideModal(authModal);
};

$("closeDashboard").onclick = () => {
  hideModal(dashboardModal);
};

$("closeResetPassword").onclick = () => {
  hideModal(resetPasswordModal);
};

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

  $("authMessage").textContent =
    "";
}

$("joinButton").onclick = () => {
  if (!configured) {
    alert(
      "Supabase is not configured."
    );
    return;
  }

  setAuthMode("signup");
  showModal(authModal);
};

$("authButton").onclick = async () => {
  if (!configured) {
    alert(
      "Supabase is not configured."
    );
    return;
  }

  const {
    data: {
      session
    }
  } =
    await supabase.auth.getSession();

  if (session) {
    await openDashboard();
  } else {
    setAuthMode("login");
    showModal(authModal);
  }
};

$("toggleAuthMode").onclick = () => {
  setAuthMode(
    authMode === "login"
      ? "signup"
      : "login"
  );
};

$("forgotPassword").onclick =
  async () => {
    const email =
      $("email").value.trim();

    if (!email) {
      $("authMessage").textContent =
        "Enter your email address first.";
      return;
    }

    $("authMessage").textContent =
      "Sending recovery email...";

    const {
      error
    } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            siteUrl()
        }
      );

    if (error) {
      $("authMessage").textContent =
        error.message;
      return;
    }

    $("authMessage").textContent =
      "Recovery email sent. Check your inbox.";
  };

$("authForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const email =
      $("email").value.trim();

    const password =
      $("password").value;

    $("authMessage").textContent =
      "Working...";

    if (
      authMode === "login"
    ) {
      const {
        error
      } =
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
      $("displayName")
        .value
        .trim() ||
      "Jbad Editor";

    const speciality =
      $("speciality")
        .value
        .trim() ||
      "Video & Photo Editor";

    const contactEmail =
      $("contactEmail")
        .value
        .trim() ||
      email;

    const {
      data,
      error
    } =
      await supabase.auth.signUp(
        {
          email,
          password,
          options: {
            data: {
              display_name:
                displayName,
              speciality:
                speciality,
              contact_email:
                contactEmail
            }
          }
        }
      );

    if (error) {
      $("authMessage").textContent =
        error.message;
      return;
    }

    if (data.session) {
      await saveProfile(
        data.session.user.id,
        {
          display_name:
            displayName,
          speciality:
            speciality,
          contact_email:
            contactEmail
        }
      );

      hideModal(authModal);

      await refreshAuthButton();

      await openDashboard();
    } else {
      $("authMessage").textContent =
        "Account created. Check your email to confirm your account, then log in.";
    }
  }
);

/* PASSWORD RESET */

$("resetPasswordForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const password =
      $("newPassword").value;

    const confirmation =
      $("confirmPassword").value;

    if (
      password !==
      confirmation
    ) {
      $("resetPasswordMessage").textContent =
        "The passwords do not match.";
      return;
    }

    const {
      error
    } =
      await supabase.auth.updateUser(
        {
          password
        }
      );

    if (error) {
      $("resetPasswordMessage").textContent =
        error.message;
      return;
    }

    $("resetPasswordMessage").textContent =
      "Password updated successfully.";

    setTimeout(() => {
      hideModal(
        resetPasswordModal
      );

      setAuthMode("login");

      showModal(authModal);
    }, 1000);
  }
);

/* AUTH STATE */

supabase?.auth.onAuthStateChange(
  (event) => {
    refreshAuthButton();

    if (
      event ===
      "PASSWORD_RECOVERY"
    ) {
      showModal(
        resetPasswordModal
      );
    }
  }
);

async function refreshAuthButton() {
  if (!supabase) {
    return;
  }

  const {
    data: {
      session
    }
  } =
    await supabase.auth.getSession();

  $("authButton").textContent =
    session
      ? "Editor dashboard"
      : "Editor login";
}

/* PROFILE */

async function saveProfile(
  userId,
  profile
) {
  if (!supabase) {
    return;
  }

  const {
    error
  } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name:
            profile.display_name,
          speciality:
            profile.speciality,
          contact_email:
            profile.contact_email,
          updated_at:
            new Date().toISOString()
        },
        {
          onConflict:
            "id"
        }
      );

  if (error) {
    console.error(
      "Profile save error:",
      error
    );
  }
}

/* PUBLIC CONTENT */

async function loadPublicContent() {
  if (!configured) {
    $("editorsGrid").innerHTML =
      `<div class="empty-state">
        Supabase is not connected yet.
      </div>`;

    $("featuredGrid").innerHTML =
      `<div class="empty-state">
        Connect Supabase to show your portfolio.
      </div>`;

    return;
  }

  const {
    data: profiles,
    error: profileError
  } =
    await supabase
      .from("profiles")
      .select("*")
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  if (profileError) {
    $("editorsGrid").innerHTML =
      `<div class="empty-state">
        ${escapeHtml(
          profileError.message
        )}
      </div>`;
  } else {
    $("editorsGrid").innerHTML =
      profiles?.length
        ? profiles
            .map(editorCard)
            .join("")
        : `<div class="empty-state">
            No editors yet. Be the first to join.
          </div>`;
  }

  const {
    data: posts,
    error: postError
  } =
    await supabase
      .from("editor_posts")
      .select(
        "*, profiles(display_name, speciality)"
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  if (postError) {
    $("featuredGrid").innerHTML =
      `<div class="empty-state">
        ${escapeHtml(
          postError.message
        )}
      </div>`;
  } else {
    $("featuredGrid").innerHTML =
      posts?.length
        ? posts
            .map(workCard)
            .join("")
        : `<div class="empty-state">
            No showcase posts yet.
          </div>`;
  }
}

function editorCard(profile) {
  const name =
    profile.display_name ||
    "Jbad Editor";

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
            : escapeHtml(
                name
                  .slice(0, 1)
                  .toUpperCase()
              )
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
          profile.contact_email
            ? `
              <a
                class="button primary"
                href="mailto:${escapeAttr(
                  profile.contact_email
                )}"
              >
                Contact Editor
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
    post.media_type ===
    "video"
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
          alt="${escapeAttr(
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
          ${escapeHtml(
            editor
          )}
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

/* DASHBOARD */

async function openDashboard() {
  if (!supabase) {
    return;
  }

  const {
    data: {
      session
    }
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
  } =
    await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        session.user.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Profile error:",
      profileError
    );
  }

  const {
    data: posts
  } =
    await supabase
      .from("editor_posts")
      .select("*")
      .eq(
        "editor_id",
        session.user.id
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  $("dashboardContent").innerHTML =
    `
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

      <label>
        Contact email
        <input
          id="dContactEmail"
          type="email"
          value="${escapeAttr(
            profile?.contact_email ||
              ""
          )}"
          maxlength="254"
        >
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
        >
      </label>

      <label class="full-row">
        Bio
        <textarea
          id="dBio"
          maxlength="500"
        >${escapeHtml(
          profile?.bio ||
            ""
        )}</textarea>
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

    <hr
      style="
        border:0;
        border-top:1px solid #ddd;
        margin:35px 0;
      "
    >

    <h3>
      Payments
    </h3>

    <p class="muted">
      Stripe securely handles your payment and payout details.
    </p>

    <div
      style="
        display:flex;
        gap:12px;
        align-items:center;
        flex-wrap:wrap;
        margin:18px 0;
      "
    >

      <button
        class="button primary"
        type="button"
        id="connectStripeButton"
      >
        ${
          profile?.stripe_account_id
            ? "Open Stripe"
            : "Connect Stripe account"
        }
      </button>

      <span
        id="stripeStatus"
        class="small"
      >
        Checking Stripe...
      </span>

    </div>

    <p
      id="stripeMessage"
      class="form-message"
    ></p>

    <div
      id="balancePanel"
      style="
        margin-top:25px;
        padding:25px;
        border:1px solid #ddd;
        border-radius:12px;
        background:#fff;
      "
    >

      <p class="eyebrow">
        ACCOUNT BALANCE
      </p>

      <h2
        id="availableBalance"
        style="margin:5px 0 8px;"
      >
        Loading...
      </h2>

      <p
        id="pendingBalance"
        class="muted"
      >
        Pending: Loading...
      </p>

      <p
        class="small"
        style="margin-top:15px;"
      >
        Your balance is provided by Stripe. Pending funds may take time to become available for payout.
      </p>

      <button
        class="button secondary"
        type="button"
        id="refreshBalanceButton"
        style="margin-top:10px;"
      >
        Refresh balance
      </button>

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
        >
      </label>

      <label>
        Type

        <select
          id="postType"
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
        ></textarea>
      </label>

      <label class="full-row">
        Media file

        <input
          id="postFile"
          type="file"
          accept="image/*,video/*"
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
        posts?.length
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

  $("profileForm").onsubmit =
    async (event) => {
      event.preventDefault();

      const {
        error
      } =
        await supabase
          .from("profiles")
          .update({
            display_name:
              $("dName")
                .value
                .trim(),

            speciality:
              $("dSpeciality")
                .value
                .trim(),

            contact_email:
              $("dContactEmail")
                .value
                .trim() ||
              null,

            bio:
              $("dBio")
                .value
                .trim(),

            website_url:
              $("dWebsite")
                .value
                .trim() ||
              null,

            avatar_url:
              $("dAvatar")
                .value
                .trim() ||
              null,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            session.user.id
          );

      if (error) {
        alert(
          error.message
        );
        return;
      }

      alert(
        "Profile saved."
      );

      await loadPublicContent();
    };

  $("logoutButton").onclick =
    async () => {
      await supabase.auth.signOut();

      hideModal(
        dashboardModal
      );

      await refreshAuthButton();
    };

  $("connectStripeButton").onclick =
    connectStripe;

  $("refreshBalanceButton").onclick =
    refreshStripeBalance;

  await refreshStripeBalance();

  $("postForm").onsubmit =
    async (event) => {
      event.preventDefault();

      const file =
        $("postFile").files[0];

      const message =
        $("postMessage");

      if (!file) {
        message.textContent =
          "Choose a file.";
        return;
      }

      if (
        file.size >
        50 *
        1024 *
        1024
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
        session.user.id +
        "/" +
        crypto.randomUUID() +
        "-" +
        safeName;

      const {
        error:
          uploadError
      } =
        await supabase.storage
          .from("portfolio")
          .upload(
            path,
            file,
            {
              upsert:
                false,
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
        data:
          publicData
      } =
        supabase.storage
          .from(
            "portfolio"
          )
          .getPublicUrl(
            path
          );

      const {
        error:
          insertError
      } =
        await supabase
          .from(
            "editor_posts"
          )
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
          .from(
            "portfolio"
          )
          .remove([
            path
          ]);

        message.textContent =
          insertError.message;

        return;
      }

      message.textContent =
        "Published!";

      await openDashboard();

      await loadPublicContent();
    };

  document
    .querySelectorAll(
      ".delete-post"
    )
    .forEach(
      (button) => {
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
              button.dataset
                .url;

            const marker =
              "/storage/v1/object/public/portfolio/";

            if (
              url &&
              url.includes(
                marker
              )
            ) {
              const path =
                decodeURIComponent(
                  url.split(
                    marker
                  )[1]
                );

              await supabase.storage
                .from(
                  "portfolio"
                )
                .remove([
                  path
                ]);
            }

            const {
              error
            } =
              await supabase
                .from(
                  "editor_posts"
                )
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
      }
    );
}

/* STRIPE CONNECTION */

async function connectStripe() {
  if (!supabase) {
    return;
  }

  const {
    data: {
      session
    }
  } =
    await supabase.auth.getSession();

  if (!session) {
    setAuthMode("login");
    showModal(authModal);
    return;
  }

  const button =
    $("connectStripeButton");

  const message =
    $("stripeMessage");

  button.disabled = true;

  button.textContent =
    "Opening Stripe...";

  message.textContent =
    "";

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

    if (error) {
      throw new Error(
        error.message
      );
    }

    if (
      data?.connected
    ) {
      $("stripeStatus").textContent =
        "Stripe is connected and ready.";

      button.textContent =
        "Stripe connected";

      button.disabled =
        false;

      await refreshStripeBalance();

      return;
    }

    if (data?.url) {
      window.location.href =
        data.url;

      return;
    }

    throw new Error(
      "Stripe did not return an onboarding link."
    );
  } catch (error) {
    console.error(
      "Stripe connection error:",
      error
    );

    message.textContent =
      error.message ||
      "Something went wrong.";

    button.disabled =
      false;

    button.textContent =
      "Connect Stripe account";
  }
}

/* STRIPE BALANCE */

async function refreshStripeBalance() {
  const available =
    $("availableBalance");

  const pending =
    $("pendingBalance");

  const status =
    $("stripeStatus");

  if (
    !available ||
    !pending
  ) {
    return;
  }

  available.textContent =
    "Loading...";

  pending.textContent =
    "Pending: Loading...";

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

    if (error) {
      throw new Error(
        error.message
      );
    }

    if (!data) {
      throw new Error(
        "No balance information was returned."
      );
    }

    if (
      data.connected
    ) {
      status.textContent =
        "Stripe is connected and ready.";
    } else {
      status.textContent =
        "Stripe setup is not complete yet.";
    }

    const balance =
      data.balance;

    if (!balance) {
      available.textContent =
        "£0.00";

      pending.textContent =
        "Pending: £0.00";

      return;
    }

    const availableText =
      formatBalance(
        balance.available
      );

    const pendingText =
      formatBalance(
        balance.pending
      );

    available.textContent =
      availableText;

    pending.textContent =
      "Pending: " +
      pendingText;
  } catch (error) {
    console.error(
      "Balance error:",
      error
    );

    available.textContent =
      "Unable to load";

    pending.textContent =
      "Pending: unavailable";
  }
}

function formatBalance(
  entries
) {
  if (
    !entries ||
    !entries.length
  ) {
    return "£0.00";
  }

  return entries
    .map(
      (entry) => {
        const amount =
          Number(
            entry.amount || 0
          ) / 100;

        const currency =
          String(
            entry.currency ||
              "gbp"
          ).toUpperCase();

        try {
          return new Intl.NumberFormat(
            "en-GB",
            {
              style:
                "currency",
              currency:
                currency
            }
          ).format(
            amount
          );
        } catch {
          return (
            currency +
            " " +
            amount.toFixed(2)
          );
        }
      }
    )
    .join(" + ");
}

/* MOBILE MENU */

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

/* START */

loadPublicContent();

refreshAuthButton();
