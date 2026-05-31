import secrets
import string
import streamlit as st
from openai import OpenAI

tab_chat, tab_gen = st.tabs(["💬 Chatbot", "🔐 Password Generator"])

# ── High-Security 10-Character Generator ──────────────────────────────────────

UPPERCASE = string.ascii_uppercase
LOWERCASE = string.ascii_lowercase
DIGITS = string.digits
SPECIAL = "!@#$%^&*()-_=+[]{}|;:,.<>?"

def generate_secure_password() -> str:
    """Return a 10-char password with at least one char from each class."""
    mandatory = [
        secrets.choice(UPPERCASE),
        secrets.choice(LOWERCASE),
        secrets.choice(DIGITS),
        secrets.choice(SPECIAL),
    ]
    pool = UPPERCASE + LOWERCASE + DIGITS + SPECIAL
    remainder = [secrets.choice(pool) for _ in range(6)]
    chars = mandatory + remainder
    # Shuffle with secrets to avoid predictable placement of mandatory chars
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


with tab_gen:
    st.title("🔐 High-Security Password Generator")
    st.write(
        "Generates a cryptographically secure 10-character password using "
        "Python's `secrets` module. Every password contains at least one "
        "uppercase letter, lowercase letter, digit, and special character."
    )

    if "password" not in st.session_state:
        st.session_state.password = generate_secure_password()

    col_pwd, col_btn = st.columns([3, 1])
    with col_pwd:
        st.text_input(
            "Generated password",
            value=st.session_state.password,
            key="pwd_display",
            help="Copy this password and store it securely.",
        )
    with col_btn:
        st.write("")  # vertical alignment
        if st.button("Generate", use_container_width=True):
            st.session_state.password = generate_secure_password()
            st.rerun()

    pwd = st.session_state.password
    has_upper = any(c in UPPERCASE for c in pwd)
    has_lower = any(c in LOWERCASE for c in pwd)
    has_digit = any(c in DIGITS for c in pwd)
    has_special = any(c in SPECIAL for c in pwd)

    st.subheader("Strength checklist")
    st.write(f"{'✅' if len(pwd) == 10 else '❌'} 10 characters")
    st.write(f"{'✅' if has_upper else '❌'} Uppercase letter")
    st.write(f"{'✅' if has_lower else '❌'} Lowercase letter")
    st.write(f"{'✅' if has_digit else '❌'} Digit")
    st.write(f"{'✅' if has_special else '❌'} Special character")

    st.info(
        "Passwords are generated entirely in your browser session — "
        "nothing is sent to any server.",
        icon="ℹ️",
    )


# ── Chatbot ────────────────────────────────────────────────────────────────────

with tab_chat:
    st.title("💬 Chatbot")
    st.write(
        "This is a simple chatbot that uses OpenAI's GPT-3.5 model to generate responses. "
        "To use this app, you need to provide an OpenAI API key, which you can get [here](https://platform.openai.com/account/api-keys). "
        "You can also learn how to build this app step by step by [following our tutorial](https://docs.streamlit.io/develop/tutorials/llms/build-conversational-apps)."
    )

    openai_api_key = st.text_input("OpenAI API Key", type="password")
    if not openai_api_key:
        st.info("Please add your OpenAI API key to continue.", icon="🗝️")
    else:
        client = OpenAI(api_key=openai_api_key)

        if "messages" not in st.session_state:
            st.session_state.messages = []

        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        if prompt := st.chat_input("What is up?"):
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            stream = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": m["role"], "content": m["content"]}
                    for m in st.session_state.messages
                ],
                stream=True,
            )

            with st.chat_message("assistant"):
                response = st.write_stream(stream)
            st.session_state.messages.append({"role": "assistant", "content": response})
