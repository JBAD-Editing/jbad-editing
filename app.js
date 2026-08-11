import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./supabase-config.js";

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

  $("authTitle").textContent =
    mode === "login"
      ? "Editor login"
      : "Join Jbad Editing";

  $("authHint").textContent =
    mode === "login"
      ? "Log in to manage your editor profile and showcase."
      : "Create an editor account to publish your profile and showcase your work.";

  $("authSubmit").textContent =
    mode === "login"
      ? "Log in"
      : "Create account";

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

$("joinButton").onclick = () => {
  setAuthMode("signup");
  showModal(authModal);
};

$("authButton").onclick = async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession();

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

$("forgotPassword").onclick = async () => {
  const email = $("email").value.trim();

  if (!email) {
    $("authMessage").textContent =
      "Enter your email address first.";
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
    "Recovery email sent. Check your inbox.";
};

$("resetPasswordForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const password =
      $("newPassword").value;

    const confirmation =
      $("confirmPassword").value;

    if (password !== confirmation) {
      $("resetPasswordMessage").textContent =
        "The passwords do not match.";
      return;
    }

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
      "Password updated.";

    setTimeout(() => {
      hideModal(resetPasswordModal);
      setAuthMode("login");
      showModal(authModal);
    }, 1000);
  }
);

$("authForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

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
      $("contactEmail").value.trim() ||
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
          speciality: speciality,
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
        "Account created. Check your email to confirm your account.";
    }
  }
);

async function refreshAuthButton() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  $("authButton").textContent =
    session
      ? "Editor dashboard"
      : "Editor login";
}

supabase.auth.onAuthStateChange(
  (event) => {
    refreshAuthButton();

    if (event === "PASSWORD_RECOVERY") {
      showModal(resetPasswordModal);
    }
  }
);

/* PUBLIC EDITORS */

async function loadPublicContent() {
  const {
    data: profiles,
    error: profilesError
  } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (profilesError) {
    console.error(
      "Profiles error:",
      profilesError
    );

    $("editorsGrid").innerHTML =
      `<div class="empty-state">${escapeHtml(
        profilesError.message
      )}</div>`;
  } else if (profiles && profiles.length > 0) {
    $("editorsGrid").innerHTML =
      profiles
        .map(editorCard)
        .join("");
  } else {
    $("editorsGrid").innerHTML =
      `<div class="empty-state">
        No editors yet. Be the first to join.
      </div>`;
  }

  const {
    data: posts,
    error: postsError
  } = await supabase
    .from("editor_posts")
    .select(
      "*, profiles(display_name, speciality)"
    )
    .order("created_at", {
      ascending: false
    });

  if (postsError) {
    console.error(
      "Posts error:",
      postsError
    );

    $("featuredGrid").innerHTML =
      `<div class="empty-state">${escapeHtml(
        postsError.message
      )}</div>`;
  } else if (posts && posts.length > 0) {
    $("featuredGrid").innerHTML =
      posts
        .map(workCard)
        .join("");
  } else {
    $("featuredGrid").innerHTML =
      `<div class="empty-state">
        No showcase posts yet.
      </div>`;
  }
}

function editorCard(profile) {
  const name =
    profile.display_name ||
    "Jbad Editor";

  const initials =
    name.charAt(0).toUpperCase();

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
            : escapeHtml(initials)
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
                href="${safeUrl(
                  profile.website_url
                )}"
                target="_blank"
                rel="noopener"
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

/* DASHBOARD */

async function openDashboard() {
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

      <h3>
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
        posts && posts.length
          ? posts.map(
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
            ).join("")
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

      const { error } =
        await supabase
          .from("profiles")
          .update({
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
          })
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

  $("logoutButton").onclick =
    async () => {
      await supabase.auth.signOut();
      hideModal(dashboardModal);
      await refreshAuthButton();
    };

  setupStripe();

  setupPosts(session, posts);
}

/* STRIPE CONNECT */

async function setupStripe() {
  const button =
    $("stripeButton");

  const status =
    $("stripeStatus");

  const message =
    $("stripeMessage");

  async function checkStripe() {
    button.disabled = true;
    button.textContent =
      "Checking Stripe...";
    status.textContent =
      "Checking Stripe connection...";
    message.textContent = "";

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
        "Stripe response:",
        data
      );

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (
        data &&
        data.error
      ) {
        throw new Error(
          data.error
        );
      }

      if (
        data &&
        data.connected === true
      ) {
        status.textContent =
          "Stripe is connected and ready.";

        button.textContent =
          "Stripe connected";

        button.disabled = true;

        return;
      }

      if (
        data &&
        data.url
      ) {
        status.textContent =
          data.message ||
          "Finish your Stripe setup.";

        button.textContent =
          "Finish Stripe setup";

        button.disabled = false;

        button.onclick = () => {
          window.location.href =
            data.url;
        };

        return;
      }

      status.textContent =
        data?.message ||
        "Stripe setup is still processing.";

      button.textContent =
        "Check Stripe again";

      button.disabled = false;
      button.onclick = checkStripe;

    } catch (error) {
      console.error(
        "Stripe error:",
        error
      );

      status.textContent =
        "Unable to confirm Stripe connection.";

      message.textContent =
        error.message ||
        "Something went wrong.";

      button.textContent =
        "Check Stripe again";

      button.disabled = false;
      button.onclick = checkStripe;
    }
  }

  button.onclick = checkStripe;

  await checkStripe();
}

/* POSTS */

function setupPosts(session) {
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

      message.textContent =
        "Uploading...";

      const type =
        $("postType").value;

      if (
        type === "image" &&
        !file.type.startsWith("image/")
      ) {
        message.textContent =
          "Please choose an image.";
        return;
      }

      if (
        type === "video" &&
        !file.type.startsWith("video/")
      ) {
        message.textContent =
          "Please choose a video.";
        return;
      }

      const filename =
        file.name
          .toLowerCase()
          .replace(
            /[^a-z0-9._-]/g,
            "-"
          );

      const path =
        session.user.id +
        "/" +
        crypto.randomUUID() +
        "-" +
        filename;

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
        "Published successfully.";

      $("postForm").reset();

      await loadPublicContent();
      await openDashboard();
    };

  document
    .querySelectorAll(".delete-post")
    .forEach((button) => {
      button.onclick =
        async () => {
          const confirmed =
            confirm(
              "Delete this post?"
            );

          if (!confirmed) {
            return;
          }

          const id =
            button.dataset.id;

          const url =
            button.dataset.url;

          const marker =
            "/storage/v1/object/public/portfolio/";

          if (
            url &&
            url.includes(marker)
          ) {
            const path =
              decodeURIComponent(
                url.split(marker)[1]
              );

            await supabase.storage
              .from("portfolio")
              .remove([path]);
          }

          const { error } =
            await supabase
              .from("editor_posts")
              .delete()
              .eq("id", id);

          if (error) {
            alert(error.message);
            return;
          }

          await loadPublicContent();
          await openDashboard();
        };
    });
}

/* HELPERS */

function safeUrl(value) {
  try {
    const url =
      new URL(
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

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return replacements[
        character
      ];
    }
  );
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/* MOBILE MENU */

$("menuButton").onclick = () => {
  const nav =
    document.querySelector("nav");

  if (!nav) {
    return;
  }

  if (
    nav.style.display === "flex"
  ) {
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

/* START */

loadPublicContent();
refreshAuthButton();
